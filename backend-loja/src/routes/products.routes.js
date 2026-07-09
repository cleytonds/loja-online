import express from 'express';
import db from '../config/database.js';
import { verificarToken } from '../middlewares/auth.js';
import { isAdmin } from '../middlewares/isAdmin.js';
import uploadProduto from '../middlewares/uploadProduto.js';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// ===============================
// 🔓 CATEGORIAS
// ===============================
router.get('/categorias', async (req, res) => {
  try {
    const [results] = await db.query('SELECT * FROM categorias');
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar categorias' });
  }
});

// ===============================
// 🔓 LISTAR PRODUTOS (COMPLETO)
// ===============================
router.get('/', async (req, res) => {
  try {
    const [produtos] = await db.query(`
      SELECT 
        p.*,
        c.nome AS categoria_nome,
        pi.url AS imagem_principal
      FROM produtos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      LEFT JOIN produto_imagens pi 
        ON pi.produto_id = p.id AND pi.is_principal = 1
      WHERE p.ativo = 1
    `);

    const [variacoes] = await db.query(`
      SELECT id, produto_id, tamanho, cor, preco, estoque
      FROM produto_variacoes
    `);

    const mapa = variacoes.reduce((acc, v) => {
      if (!acc[v.produto_id]) acc[v.produto_id] = [];
      acc[v.produto_id].push(v);
      return acc;
    }, {});

    produtos.forEach((p) => {
      p.variacoes = mapa[p.id] || [];
    });

    res.json(produtos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar produtos' });
  }
});

// ===============================
// 🔓 DETALHE DO PRODUTO
// ===============================

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
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
      [id],
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
      WHERE produto_id=?

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
// 🔓 ESTOQUE VARIAÇÕES
// ===============================

router.get('/estoque', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        p.nome AS produto,
        pv.tamanho,
        pv.cor,
        pv.estoque
      FROM produto_variacoes pv
      INNER JOIN produtos p 
      ON p.id = pv.produto_id
      ORDER BY p.nome
    `);

    res.json(rows);
  } catch (err) {
    console.log(err);

    res.status(500).json({
      error: 'Erro estoque',
    });
  }
});

// ===============================
// 🔒 CRIAR PRODUTO (COMPLETO)
// ===============================
router.post('/', verificarToken, isAdmin, uploadProduto.array('imagens'), async (req, res) => {
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
    console.error('ERRO BACKEND:', err);
    res.status(500).json({ error: err.message });
  }
});

// ===============================

// 🔒 ATUALIZAR PRODUTO COMPLETO

// ===============================

router.put('/:id', verificarToken, isAdmin, uploadProduto.array('imagens'), async (req, res) => {
  try {
    const { id } = req.params;

    const {
      nome,

      descricao,

      categoria,

      variacoes,
    } = req.body;

    // ===============================

    // ATUALIZA DADOS PRINCIPAIS

    // ===============================

    await db.query(
      `

      UPDATE produtos

      SET nome = ?,

          descricao = ?,

          categoria_id = ?

      WHERE id = ?

      `,

      [nome, descricao, categoria, id],
    );

    // ===============================

    // ATUALIZA VARIAÇÕES

    // ===============================

    // ===============================
    // ATUALIZA VARIAÇÕES SEM QUEBRAR PEDIDOS
    // ===============================

    if (variacoes) {
      const lista = JSON.parse(variacoes);

      // busca variações atuais

      const [atuais] = await db.query(
        `
    SELECT id
    FROM produto_variacoes
    WHERE produto_id=?
    `,
        [id],
      );

      for (const v of lista) {
        // se já existe atualiza

        if (v.id) {
          await db.query(
            `
        UPDATE produto_variacoes

        SET
          tamanho=?,
          cor=?,
          preco=?,
          estoque=?

        WHERE id=?

        `,
            [v.tamanho, v.cor, v.preco, v.estoque, v.id],
          );
        } else {
          // nova variação

          await db.query(
            `
        INSERT INTO produto_variacoes
        (
          produto_id,
          tamanho,
          cor,
          preco,
          estoque
        )

        VALUES (?,?,?,?,?)

        `,
            [id, v.tamanho, v.cor, v.preco, v.estoque],
          );
        }
      }
    }

    // ===============================
    // ATUALIZAÇÃO DAS IMAGENS
    // REMOVE ANTIGAS E SALVA NOVAS
    // ===============================

    if (req.files?.length) {
      // busca imagens antigas

      const [imagensAntigas] = await db.query(
        `
    SELECT url
    FROM produto_imagens
    WHERE produto_id=?
    `,
        [id],
      );

      // apaga arquivos físicos

      imagensAntigas.forEach((img) => {
        const caminho = path.join(process.cwd(), img.url.replace(/^\//, ''));

        if (fs.existsSync(caminho)) {
          fs.unlinkSync(caminho);
        }
      });

      // remove do banco

      await db.query(
        `
    DELETE FROM produto_imagens
    WHERE produto_id=?
    `,
        [id],
      );

      // salva novas imagens

      for (let i = 0; i < req.files.length; i++) {
        await db.query(
          `
      INSERT INTO produto_imagens
      (
        produto_id,
        url,
        is_principal
      )
      VALUES (?,?,?)
      `,
          [id, `/uploads/produtos/${req.files[i].filename}`, i === 0 ? 1 : 0],
        );
      }
    }

    res.json({
      mensagem: 'Produto atualizado com sucesso',
    });
  } catch (err) {
    console.log(err);

    res.status(500).json({
      error: 'Erro ao atualizar produto',
    });
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
