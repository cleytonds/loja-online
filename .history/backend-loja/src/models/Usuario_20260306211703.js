import db from "../config/database.js";

export default {
  criar: (nome, email, senha, codigo, token, callback) => {
    const sql = `
      INSERT INTO usuarios 
      (nome, email, senha, codigo_confirmacao, token_confirmacao, ativo) 
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    db.query(sql, [nome, email, senha, codigo, token, 0], callback);
  },

  buscarPorEmail: (email, callback) => {
    const sql = "SELECT * FROM usuarios WHERE email = ?";
    db.query(sql, [email], callback);
  },

  buscarPorToken: (token, callback) => {
    const sql = "SELECT * FROM usuarios WHERE token_confirmacao = ?";
    db.query(sql, [token], callback);
  },

  ativarUsuario: (id, callback) => {
    const sql = "UPDATE usuarios SET ativo = 1 WHERE id = ?";
    db.query(sql, [id], callback);
  }
};