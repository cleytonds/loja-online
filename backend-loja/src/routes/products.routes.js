import express from 'express';
import db from '../config/database.js';
import { verificarToken } from '../middlewares/auth.js';
import { isAdmin } from '../middlewares/isAdmin.js';
import uploadProduto, { removerImagensProduto, validarImagensProduto } from '../middlewares/uploadProduto.js';
import fs from 'fs';
import path from 'path';
import {
  buildVariacaoPlan,
  normalizeVariacoesPayload,
  validarPrecoPromocional,
} from '../utils/produtoCatalog.js';

const router = express.Router();

function normalizarAtivo(valor, fallback = 1) {
  if (valor === undefined) return fallback;
  return valor === false || Number(valor) === 0 ? 0 : 1;
}

// ===============================
//  CATEGORIAS
// ===============================
router.get('/categorias', async (req, res) => {
  try {
    const [results] = await db.query('SELECT * FROM categorias');
    res.set('Cache-Control', 'public, max-age=60');
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar categorias' });
  }
});

// ===============================
//  ESTOQUE VARIAÇÕES (ADMIN)
// ===============================
router.get('/estoque', verificarToken, isAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.nome AS produto, pv.tamanho, pv.cor, pv.estoque
      FROM produto_variacoes pv
      INNER JOIN produtos p ON p.id = pv.produto_id
      WHERE pv.ativo = 1
      ORDER BY p.nome
    `);

    res.json(rows);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: 'Erro estoque' });
  }
});

// ===============================
//  LISTAR PRODUTOS (COMPLETO)
// ===============================
router.get('/', async (req, res) => {
  try {
    const { page, limit, nome, categoria } = req.query;
    const usarPaginacao = [page, limit, nome, categoria].some(
      (valor) => valor !== undefined && String(valor).trim() !== '',
    );
    const where = ['p.ativo = 1'];
    const params = [];

    if (nome) {
      where.push('p.nome LIKE ?');
      params.push(`%${String(nome).trim()}%`);
    }

    if (categoria) {
      if (/^\d+$/.test(String(categoria))) {
        where.push('p.categoria_id = ?');
        params.push(Number(categoria));
      } else {
        where.push('c.nome = ?');
        params.push(String(categoria).trim());
      }
    }

    const whereSql = where.join(' AND ');
    const pageNumber = Math.max(1, Number.parseInt(page, 10) || 1);
    const limitNumber = Math.min(50, Math.max(1, Number.parseInt(limit, 10) || 20));
    const paginationSql = usarPaginacao ? ' LIMIT ? OFFSET ?' : '';
    const paginationParams = usarPaginacao ? [limitNumber, (pageNumber - 1) * limitNumber] : [];

    const [produtos] = await db.query(`
      SELECT 
        p.*,
        c.nome AS categoria_nome,
        pi.url AS imagem_principal
      FROM produtos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      LEFT JOIN produto_imagens pi 
        ON pi.produto_id = p.id AND pi.is_principal = 1
      WHERE ${whereSql}
      ORDER BY p.id DESC${paginationSql}
    `, [...params, ...paginationParams]);

    const produtoIds = produtos.map((produto) => produto.id);
    const [variacoes] = produtoIds.length
      ? await db.query(`
      SELECT id, produto_id, tamanho, cor, preco, preco_promocional,
        CASE
          WHEN preco_promocional > 0 AND preco_promocional < preco THEN preco_promocional
          ELSE preco
        END AS preco_efetivo,
        estoque
      FROM produto_variacoes
      WHERE ativo = 1 AND produto_id IN (${produtoIds.map(() => '?').join(',')})
    `, produtoIds)
      : [[]];

    const mapa = variacoes.reduce((acc, v) => {
      if (!acc[v.produto_id]) acc[v.produto_id] = [];
      acc[v.produto_id].push(v);
      return acc;
    }, {});

    produtos.forEach((p) => {
      p.variacoes = mapa[p.id] || [];
    });

    res.set('Cache-Control', 'public, max-age=60');

    if (!usarPaginacao) return res.json(produtos);

    const [countRows] = await db.query(
      `SELECT COUNT(*) AS total FROM produtos p LEFT JOIN categorias c ON p.categoria_id = c.id WHERE ${whereSql}`,
      params,
    );
    const total = Number(countRows[0].total);

    return res.json({
      data: produtos,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        totalPages: Math.ceil(total / limitNumber),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar produtos' });
  }
});

// ===============================
//  DETALHE ADMINISTRATIVO (INCLUI VARIAÇÕES INATIVAS)
// ===============================
router.get('/admin/:id', verificarToken, isAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ erro: 'ID inválido' });
  }

  try {
    const [produtos] = await db.query(
      `SELECT p.*, c.nome AS categoria_nome
       FROM produtos p
       LEFT JOIN categorias c ON c.id = p.categoria_id
       WHERE p.id = ?`,
      [id],
    );

    if (!produtos.length) return res.status(404).json({ erro: 'Produto não encontrado' });

    const [imagens] = await db.query('SELECT * FROM produto_imagens WHERE produto_id = ?', [id]);
    const [variacoes] = await db.query(
      `SELECT id, produto_id, tamanho, cor, preco, preco_promocional,
        CASE
          WHEN preco_promocional > 0 AND preco_promocional < preco THEN preco_promocional
          ELSE preco
        END AS preco_efetivo,
        estoque, ativo, sku
       FROM produto_variacoes
       WHERE produto_id = ?
       ORDER BY ativo DESC, id ASC`,
      [id],
    );

    return res.json({ ...produtos[0], imagens, variacoes });
  } catch (err) {
    return res.status(500).json({ erro: 'Erro ao buscar produto administrativo' });
  }
});

// ===============================
//  DETALHE DO PRODUTO
// ===============================

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const idNum = Number(id);
    if (!Number.isInteger(idNum) || idNum <= 0) {
      return res.status(400).json({ erro: 'ID inválido' });
    }
    const [produto] = await db.query(
      `

      SELECT 
      p.*,
      c.nome AS categoria_nome
      FROM produtos p
      LEFT JOIN categorias c
      ON c.id=p.categoria_id
      WHERE p.id=? AND p.ativo = 1

    `,
      [idNum],
    );

    if (!produto.length) {
      return res.status(404).json({
        erro: 'Produto não encontrado',
      });
    }

    const [imagens] = await db.query(
      `

      SELECT *
      FROM produto_imagens
      WHERE produto_id=?

    `,
      [id],
    );

    const [variacoes] = await db.query(
      `

      SELECT id, produto_id, tamanho, cor, preco, preco_promocional,
        CASE
          WHEN preco_promocional > 0 AND preco_promocional < preco THEN preco_promocional
          ELSE preco
        END AS preco_efetivo,
        estoque, ativo, sku
      FROM produto_variacoes
      WHERE produto_id=? AND ativo = 1

    `,
      [id],
    );

    res.json({
      ...produto[0],
      imagens,
      variacoes,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      erro: 'Erro detalhe produto',
    });
  }
});

// ===============================
//  CRIAR PRODUTO (COMPLETO)
// ===============================
router.post('/', verificarToken, isAdmin, uploadProduto.array('imagens'), validarImagensProduto, async (req, res) => {
  let connection;
  try {
    const { nome, preco, descricao, categoria } = req.body;

    const variacoes = normalizeVariacoesPayload(req.body.variacoes ? JSON.parse(req.body.variacoes) : []);
    if (!Array.isArray(variacoes) || variacoes.length === 0) {
      return res.status(400).json({
        error: 'Produto precisa de pelo menos uma variação',
      });
    }
    variacoes.forEach(validarPrecoPromocional);
    if (!variacoes.some((variacao) => normalizarAtivo(variacao.ativo) === 1)) {
      return res.status(400).json({ error: 'Produto precisa de pelo menos uma variação ativa' });
    }
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [result] = await connection.query(
      `
      INSERT INTO produtos (nome, preco_base, descricao, categoria_id)
      VALUES (?, ?, ?, ?)
    `,
      [nome, preco, descricao, categoria],
    );

    const produtoId = result.insertId;

    // imagens
    if (req.files?.length) {
      for (let i = 0; i < req.files.length; i++) {
        await connection.query(
          `
          INSERT INTO produto_imagens
          (produto_id, url, is_principal)
          VALUES (?, ?, ?)
        `,
          [produtoId, `/uploads/produtos/${req.files[i].filename}`, i === 0 ? 1 : 0],
        );
      }
    }

    // variações
    for (let v of variacoes) {
      await connection.query(
        `
        INSERT INTO produto_variacoes
        (produto_id, tamanho, cor, preco, preco_promocional, estoque)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
        [produtoId, v.tamanho, v.cor, v.preco, v.preco_promocional, v.estoque],
      );
    }

    await connection.commit();
    res.json({ message: 'Produto criado com sucesso' });
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (_) {
        // A limpeza de arquivos continua sendo a prioridade após uma falha.
      }
    }
    removerImagensProduto(req.files);
    if (err?.statusCode === 400) {
      return res.status(400).json({ error: err.message });
    }
    console.error('ERRO BACKEND:', err);
    res.status(500).json({ error: 'Erro ao criar produto' });
  } finally {
    if (connection) connection.release();
  }
});

// ===============================
//  ATUALIZAR PRODUTO COMPLETO (DADOS, VARIAÇÕES E IMAGENS)
// ===============================

router.put('/:id', verificarToken, isAdmin, uploadProduto.array('imagens'), validarImagensProduto, async (req, res) => {
  const idNum = Number(req.params.id);
  if (!Number.isInteger(idNum) || idNum <= 0) {
    return res.status(400).json({ erro: 'ID inválido' });
  }

  let connection;
  let novasImagens = [];

  try {
    const { id } = req.params;
    const {
      nome,
      descricao,
      categoria,
      variacoes,
    } = req.body;

    const lista = normalizeVariacoesPayload(variacoes ? JSON.parse(variacoes) : []);
    lista.forEach(validarPrecoPromocional);

    connection = await db.getConnection();

    await connection.beginTransaction();

    await connection.query(
      `
      UPDATE produtos
      SET nome = ?, descricao = ?, categoria_id = ?
      WHERE id = ?
      `,
      [nome, descricao, categoria, id],
    );

    const [atuais] = await connection.query(
      `SELECT id, tamanho, cor, preco, preco_promocional, estoque, ativo
       FROM produto_variacoes
       WHERE produto_id=?`,
      [id],
    );

    const plan = buildVariacaoPlan(atuais, lista);

    const atuaisPorId = new Map(atuais.map((variacao) => [Number(variacao.id), variacao]));
    const idsParaInativar = new Set(plan.deletions.map(Number));
    for (const variacao of plan.updates) {
      if (normalizarAtivo(variacao.ativo) === 0) idsParaInativar.add(Number(variacao.id));
    }

    const ativasRestantes = atuais.filter((variacao) => (
      Number(variacao.ativo) === 1 && !idsParaInativar.has(Number(variacao.id))
    )).length + plan.inserts.filter((variacao) => normalizarAtivo(variacao.ativo) === 1).length;

    if (ativasRestantes < 1) {
      await connection.rollback();
      return res.status(409).json({
        erro: 'Este produto precisa possuir pelo menos uma variação ativa. Ative outra variação antes de inativar esta.',
      });
    }

    for (const variacao of plan.updates) {
      const atual = atuaisPorId.get(Number(variacao.id));
      const ativo = normalizarAtivo(variacao.ativo, atual?.ativo);
      const estaSendoInativada = Number(atual?.ativo) === 1 && ativo === 0;
      const estoque = estaSendoInativada ? Number(atual.estoque) : variacao.estoque;
      await connection.query(
        `
        UPDATE produto_variacoes
        SET tamanho=?, cor=?, preco=?, preco_promocional=?, estoque=?, ativo=?
        WHERE id=? AND produto_id=?
        `,
        [
          variacao.tamanho,
          variacao.cor,
          variacao.preco,
          variacao.preco_promocional,
          estoque,
          ativo,
          variacao.id,
          id,
        ],
      );
    }

    for (const variacao of plan.inserts) {
      await connection.query(
        `
        INSERT INTO produto_variacoes (produto_id, tamanho, cor, preco, preco_promocional, estoque, ativo)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [
          id,
          variacao.tamanho,
          variacao.cor,
          variacao.preco,
          variacao.preco_promocional,
          variacao.estoque,
          normalizarAtivo(variacao.ativo),
        ],
      );
    }

    if (plan.deletions.length) {
      await connection.query(
        `UPDATE produto_variacoes
         SET ativo = 0
         WHERE produto_id=? AND id IN (${plan.deletions.map(() => '?').join(',')})`,
        [id, ...plan.deletions],
      );
    }

    novasImagens = Array.isArray(req.files) ? req.files : [];

    if (novasImagens.length) {
      const [imagensAntigas] = await connection.query(
        `SELECT id, url FROM produto_imagens WHERE produto_id=?`,
        [id],
      );

      for (const imagem of imagensAntigas) {
        const caminho = path.join(process.cwd(), imagem.url.replace(/^\//, ''));
        if (fs.existsSync(caminho)) {
          fs.unlinkSync(caminho);
        }
      }

      await connection.query(`DELETE FROM produto_imagens WHERE produto_id=?`, [id]);

      for (let i = 0; i < novasImagens.length; i += 1) {
        await connection.query(
          `INSERT INTO produto_imagens (produto_id, url, is_principal) VALUES (?, ?, ?)`,
          [id, `/uploads/produtos/${novasImagens[i].filename}`, i === 0 ? 1 : 0],
        );
      }
    }

    await connection.commit();

    res.json({
      mensagem: 'Produto atualizado com sucesso',
    });
  } catch (err) {
    if (connection) {
      await connection.rollback();
    }
    removerImagensProduto(novasImagens);
    if (err?.statusCode === 400) {
      return res.status(400).json({ error: err.message });
    }
    console.log(err);

    res.status(500).json({
      error: 'Erro ao atualizar produto',
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// ===============================
//  ATIVAR / INATIVAR VARIAÇÃO
// ===============================
router.patch('/:produtoId/variacoes/:variacaoId/status', verificarToken, isAdmin, async (req, res) => {
  const produtoId = Number(req.params.produtoId);
  const variacaoId = Number(req.params.variacaoId);
  const ativo = req.body?.ativo;

  if (!Number.isInteger(produtoId) || produtoId <= 0 || !Number.isInteger(variacaoId) || variacaoId <= 0) {
    return res.status(400).json({ erro: 'Produto ou variação inválidos' });
  }
  if (typeof ativo !== 'boolean') {
    return res.status(400).json({ erro: 'O campo ativo deve ser booleano' });
  }

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [variacoes] = await connection.query(
      `SELECT id, ativo, estoque
       FROM produto_variacoes
       WHERE produto_id = ?
       FOR UPDATE`,
      [produtoId],
    );
    const variacao = variacoes.find((item) => Number(item.id) === variacaoId);

    if (!variacao) {
      await connection.rollback();
      return res.status(404).json({ erro: 'Variação não encontrada' });
    }

    const estaAtiva = Number(variacao.ativo) === 1;
    const totalAtivas = variacoes.filter((item) => Number(item.ativo) === 1).length;
    if (!ativo && estaAtiva && totalAtivas <= 1) {
      await connection.rollback();
      return res.status(409).json({
        erro: 'Este produto precisa possuir pelo menos uma variação ativa. Ative outra variação antes de inativar esta.',
      });
    }

    await connection.query(
      'UPDATE produto_variacoes SET ativo = ? WHERE id = ? AND produto_id = ?',
      [ativo ? 1 : 0, variacaoId, produtoId],
    );
    await connection.commit();

    return res.json({
      id: variacaoId,
      produto_id: produtoId,
      ativo,
      estoque: Number(variacao.estoque),
    });
  } catch (err) {
    if (connection) await connection.rollback();
    return res.status(500).json({ erro: 'Erro ao atualizar status da variação' });
  } finally {
    if (connection) connection.release();
  }
});

// ===============================
//  DELETAR PRODUTO
// ===============================
router.delete('/:id', verificarToken, isAdmin, async (req, res) => {
  try {
    await db.query('UPDATE produtos SET ativo = 0 WHERE id = ?', [req.params.id]);

    res.json({ mensagem: 'Produto desativado' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover produto' });
  }
});

export default router;
