import db from "../config/database.js";

/**
 * 🔥 Criar produto estilo marketplace
 * - Cria produto base
 * - Cria variações (cor/tamanho)
 * - Cria imagens múltiplas
 */
export async function criarProduto(req, res) {
  const { nome, descricao, preco_base, categoria, variacoes } = req.body;

  try {
    // 1. Produto base
    const [result] = await db.execute(
      `INSERT INTO produtos (nome, descricao, preco_base, categoria)
       VALUES (?, ?, ?, ?)`,
      [nome, descricao, preco_base, categoria]
    );

    const produtoId = result.insertId;

    // 2. Variações
    if (variacoes) {
      const lista = JSON.parse(variacoes);

      for (let v of lista) {
        await db.execute(
          `INSERT INTO produto_variacoes
          (produto_id, cor, tamanho, preco, estoque)
          VALUES (?, ?, ?, ?, ?)`,
          [produtoId, v.cor, v.tamanho, v.preco, v.estoque]
        );
      }
    }

    // 3. Imagens (upload)
    if (req.files) {
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];

        await db.execute(
          `INSERT INTO produto_imagens
          (produto_id, url, ordem, is_principal)
          VALUES (?, ?, ?, ?)`,
          [
            produtoId,
            `/uploads/${file.filename}`,
            i,
            i === 0
          ]
        );
      }
    }

    res.json({ mensagem: "Produto criado com sucesso 🚀" });

  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}