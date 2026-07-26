import express from 'express';
import db from '../config/database.js';
import { verificarToken } from '../middlewares/auth.js';
import { isAdmin } from '../middlewares/isAdmin.js';
import uploadProduto, { removerImagensProduto, validarImagensProduto } from '../middlewares/uploadProduto.js';
import fs from 'fs';
import path from 'path';
import { buildVariacaoPlan, normalizeVariacoesPayload } from '../utils/produtoCatalog.js';

const router = express.Router();

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
      SELECT id, produto_id, tamanho, cor, preco, estoque
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
      WHERE p.id=?

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

      SELECT *
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
  try {
    const { nome, preco, descricao, categoria } = req.body;

    const variacoes = req.body.variacoes ? JSON.parse(req.body.variacoes) : [];
    if (!Array.isArray(variacoes) || variacoes.length === 0) {
      return res.status(400).json({
        error: 'Produto precisa de pelo menos uma variação',
      });
    }
    const [result] = await db.query(
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
        await db.query(
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
      await db.query(
        `
        INSERT INTO produto_variacoes
        (produto_id, tamanho, cor, preco, estoque)
        VALUES (?, ?, ?, ?, ?)
      `,
        [produtoId, v.tamanho, v.cor, v.preco, v.estoque],
      );
    }

    res.json({ message: 'Produto criado com sucesso' });
  } catch (err) {
    removerImagensProduto(req.files);
    console.error('ERRO BACKEND:', err);
    res.status(500).json({ error: 'Erro ao criar produto' });
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

  const connection = await db.getConnection();
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
      `SELECT id, tamanho, cor, preco, estoque FROM produto_variacoes WHERE produto_id=? AND ativo = 1`,
      [id],
    );

    const plan = buildVariacaoPlan(atuais, lista);

    for (const variacao of plan.updates) {
      await connection.query(
        `
        UPDATE produto_variacoes
        SET tamanho=?, cor=?, preco=?, estoque=?
        WHERE id=? AND produto_id=?
        `,
        [variacao.tamanho, variacao.cor, variacao.preco, variacao.estoque, variacao.id, id],
      );
    }

    for (const variacao of plan.inserts) {
      await connection.query(
        `
        INSERT INTO produto_variacoes (produto_id, tamanho, cor, preco, estoque)
        VALUES (?, ?, ?, ?, ?)
        `,
        [id, variacao.tamanho, variacao.cor, variacao.preco, variacao.estoque],
      );
    }

    if (plan.deletions.length) {
      const placeholders = plan.deletions.map(() => '?').join(',');
      const [referenciadas] = await connection.query(
        `SELECT DISTINCT variacao_id FROM pedido_itens WHERE variacao_id IN (${placeholders})`,
        plan.deletions,
      );
      const idsReferenciados = referenciadas.map((item) => item.variacao_id);
      const idsRemoviveis = plan.deletions.filter((id) => !idsReferenciados.includes(id));

      if (idsReferenciados.length) {
        await connection.query(
          `UPDATE produto_variacoes SET ativo = 0, estoque = 0 WHERE produto_id=? AND id IN (${idsReferenciados.map(() => '?').join(',')})`,
          [id, ...idsReferenciados],
        );
      }

      if (idsRemoviveis.length) {
      await connection.query(
          `DELETE FROM produto_variacoes WHERE produto_id=? AND id IN (${idsRemoviveis.map(() => '?').join(',')})`,
          [id, ...idsRemoviveis],
      );
      }
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
