// src/models/Usuario.js
import db from "../config/database.js";

const Usuario = {

  buscarPorEmail: (email, callback) => {
    const sql = "SELECT * FROM usuarios WHERE email = ?";
    db.query(sql, [email], callback);
  },

  criar: (nome, email, senha, codigo, token, callback) => {
    const sql = `
      INSERT INTO usuarios
      (nome, email, senha, tipo, ativo, codigo_confirmacao, token_confirmacao)
      VALUES (?, ?, ?, 'cliente', 0, ?, ?)
    `;
    db.query(sql, [nome, email, senha, codigo, token], callback);
  },

  buscarPorTokenECodigo: (token, codigo, callback) => {
    const sql = `
      SELECT * FROM usuarios
      WHERE token_confirmacao = ? AND codigo_confirmacao = ?
    `;
    db.query(sql, [token, codigo], callback);
  },

  ativarUsuario: (id, callback) => {
    const sql = `
      UPDATE usuarios
      SET ativo = 1, codigo_confirmacao = NULL, token_confirmacao = NULL
      WHERE id = ?
    `;
    db.query(sql, [id], callback);
  }

};

export default Usuario;