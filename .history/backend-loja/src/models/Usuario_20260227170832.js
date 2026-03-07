// src/models/Usuario.js
import db from "../config/database.js";

const Usuario = {
  // Buscar usuário por email
  buscarPorEmail: (email, callback) => {
    const sql = "SELECT * FROM usuarios WHERE email = ?";
    db.query(sql, [email], callback);
  },

  // Criar usuário
  criar: (nome, email, senha, tokenConfirmacao, callback) => {
    const sql =
      "INSERT INTO usuarios (nome, email, senha, ativo, tokenConfirmacao) VALUES (?, ?, ?, 0, ?)";
    db.query(sql, [nome, email, senha, tokenConfirmacao], callback);
  },

  // Buscar usuário por token
  buscarPorToken: (token, callback) => {
    const sql = "SELECT * FROM usuarios WHERE tokenConfirmacao = ?";
    db.query(sql, [token], callback);
  },

  // Ativar usuário
  ativar: (token, callback) => {
    const sql =
      "UPDATE usuarios SET ativo = 1, tokenConfirmacao = NULL WHERE tokenConfirmacao = ?";
    db.query(sql, [token], callback);
  },
};

export default Usuario;