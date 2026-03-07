// src/models/Usuario.js
import db from "../config/database.js";

const Usuario = {

  // Buscar usuário pelo email
  buscarPorEmail: (email, callback) => {
    const sql = "SELECT * FROM usuarios WHERE email = ?";
    db.query(sql, [email], callback);
  },

  // Criar usuário com código de confirmação
  criar: (nome, email, senha, codigo, callback) => {

    const sql = `
    INSERT INTO usuarios 
    (nome, email, senha, tipo, ativo, codigo_confirmacao) 
    VALUES (?, ?, ?, 'cliente', 0, ?)
    `;

    db.query(sql, [nome, email, senha, codigo], callback);
  },

  // Buscar usuário pelo código
  buscarPorCodigo: (email, codigo, callback) => {

    const sql = `
    SELECT * FROM usuarios 
    WHERE email = ? AND codigo_confirmacao = ?
    `;

    db.query(sql, [email, codigo], callback);
  },

  // Ativar usuário
  ativarUsuario: (email, callback) => {

    const sql = `
    UPDATE usuarios 
    SET ativo = 1, codigo_confirmacao = NULL 
    WHERE email = ?
    `;

    db.query(sql, [email], callback);
  }

};

export default Usuario;