import db from "../config/database.js";

export default class Usuario {
  static criar(nome, email, senha, callback) {
    const sql = "INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)";
    db.query(sql, [nome, email, senha], callback);
  }

  static buscarPorEmail(email, callback) {
    const sql = "SELECT * FROM usuarios WHERE email = ?";
    db.query(sql, [email], callback);
  }

  static ativarUsuario(token, callback) {
    const sql = "UPDATE usuarios SET ativo = 1, tokenConfirmacao = NULL WHERE tokenConfirmacao = ?";
    db.query(sql, [token], callback);
  }
}