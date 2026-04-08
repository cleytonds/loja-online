import db from "../config/database.js";

const Usuario = {

  // 🔍 Buscar por email
  buscarPorEmail: (email, callback) => {
    const sql = `
    SELECT * 
    FROM usuarios 
    WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))
    LIMIT 1
    `;
    db.query(sql, [email], callback);
  },

  // 🆕 Criar usuário
  criar: (nome, email, senha, codigo, token, tipo = "cliente", callback) => {
    const sql = `
      INSERT INTO usuarios
      (nome, email, senha, tipo, ativo, codigo_confirmacao, token_confirmacao)
      VALUES (?, ?, ?, ?, 0, ?, ?)
    `;
    db.query(sql, [nome, email, senha, tipo, codigo, token], callback);
  },

  // 🔎 Buscar por TOKEN (botão do email)
  buscarPorToken: (token, callback) => {
    const sql = `
      SELECT * FROM usuarios
      WHERE token_confirmacao = ?
    `;
    db.query(sql, [token], callback);
  },

  // 🔎 Buscar por EMAIL + CÓDIGO
  buscarPorEmailECodigo: (email, codigo, callback) => {
    const sql = `
      SELECT * FROM usuarios
      WHERE email = ? AND codigo_confirmacao = ?
    `;
    db.query(sql, [email, codigo], callback);
  },

  // 🔎 (opcional) token + código (você já tinha)
  buscarPorTokenECodigo: (token, codigo, callback) => {
    const sql = `
      SELECT * FROM usuarios
      WHERE token_confirmacao = ? AND codigo_confirmacao = ?
    `;
    db.query(sql, [token, codigo], callback);
  },

  // ✅ Ativar usuário
  ativarUsuario: (id, callback) => {
    const sql = `
      UPDATE usuarios
      SET ativo = 1,
          codigo_confirmacao = NULL,
          token_confirmacao = NULL
      WHERE id = ?
    `;
    db.query(sql, [id], callback);
  },

  // 🔁 Atualizar código (reenviar)
  atualizarCodigo: (id, codigo, callback) => {
    const sql = `
      UPDATE usuarios
      SET codigo_confirmacao = ?
      WHERE id = ?
    `;
    db.query(sql, [codigo, id], callback);
  },

  // 🔁 Atualizar código + token (MAIS SEGURO 🔥)
  atualizarCodigoEToken: (id, codigo, token, callback) => {
    const sql = `
      UPDATE usuarios
      SET codigo_confirmacao = ?,
          token_confirmacao = ?
      WHERE id = ?
    `;
    db.query(sql, [codigo, token, id], callback);
  }

};

export default Usuario;