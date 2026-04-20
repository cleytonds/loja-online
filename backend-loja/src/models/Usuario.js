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
  criar(nome, email, senha, codigo, token, tipo, callback) {
    const sql = `
      INSERT INTO usuarios 
      (nome, email, senha, codigo, token, tipo, ativo)
      VALUES (?, ?, ?, ?, ?, ?, 0)
    `;
    db.query(sql, [nome, email, senha, codigo, token, tipo], callback);
  },

  // 🔎 Buscar por TOKEN
  buscarPorToken: (token, callback) => {
    const sql = `
      SELECT * FROM usuarios
      WHERE token = ?
      LIMIT 1
    `;
    db.query(sql, [token], callback);
  },

  // 🔎 Buscar por EMAIL + CÓDIGO
  buscarPorToken: (token, callback) => {
    const sql = `
      SELECT * FROM usuarios
      WHERE token = ?
      LIMIT 1
    `;
    db.query(sql, [token], callback);
  },

  // 🔎 Token + código
  buscarPorTokenECodigo: (token, codigo, callback) => {
    const sql = `
      SELECT * FROM usuarios
      WHERE token = ? AND codigo = ?
      LIMIT 1
    `;
    db.query(sql, [token, codigo], callback);
  },

  // ✅ Ativar usuário
  ativarUsuario: (id, callback) => {
    const sql = `
      UPDATE usuarios
      SET ativo = 1,
          codigo = NULL,
          token = NULL
      WHERE id = ?
    `;
    db.query(sql, [id], callback);
  },

  // 🔁 Atualizar código
  atualizarCodigo: (id, codigo, callback) => {
    const sql = `
      UPDATE usuarios
      SET codigo = ?
      WHERE id = ?
    `;
    db.query(sql, [codigo, id], callback);
  },

  // 🔁 Atualizar código + token
  atualizarCodigoEToken: (id, codigo, token, callback) => {
    const sql = `
      UPDATE usuarios
      SET codigo = ?,
          token = ?
      WHERE id = ?
    `;
    db.query(sql, [codigo, token, id], callback);
  },

  // ✏️ Atualizar perfil
  atualizarPerfil: (id, nome, foto, callback) => {
    const sql = `
      UPDATE usuarios
      SET nome = ?, foto = ?
      WHERE id = ?
    `;
    db.query(sql, [nome, foto, id], callback);
  }

};

export default Usuario;