import db from "../config/database.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { enviarEmailConfirmacao } from "../services/mailer.js";

const SECRET = "segredo123"; // depois você pode usar variável de ambiente

// Cadastro com email de confirmação
export const cadastro = (req, res) => {
  const { nome, email, senha } = req.body;

  // Regex para validar email
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regex.test(email)) {
    return res.status(400).json({ error: "Email inválido!" });
  }

  // 1️⃣ Verifica se email já existe
  const sqlCheck = "SELECT id FROM usuarios WHERE email = ?";
  db.query(sqlCheck, [email], async (err, results) => {
    if (err) return res.status(500).json({ error: "Erro no servidor" });
    if (results.length > 0)
      return res.status(400).json({ error: "Este email já está cadastrado" });

    // 2️⃣ Criptografa a senha
    const hash = bcrypt.hashSync(senha, 8);

    // 3️⃣ Cria token único para confirmação
    const token = crypto.randomBytes(32).toString("hex");

    // 4️⃣ Insere usuário com ativo = 0 e tokenConfirmacao
    const sqlInsert =
      "INSERT INTO usuarios (nome, email, senha, ativo, tokenConfirmacao) VALUES (?, ?, ?, ?, ?)";
    db.query(sqlInsert, [nome, email, hash, 0, token], async (err2) => {
      if (err2) return res.status(500).json({ error: "Erro ao cadastrar" });

      // 5️⃣ Envia email de confirmação
      try {
        await enviarEmailConfirmacao(email, token);
        res.json({
          message:
            "Cadastro realizado! Verifique seu email para ativar a conta."
        });
      } catch (mailErr) {
        console.error(mailErr);
        res
          .status(500)
          .json({ error: "Erro ao enviar email de confirmação" });
      }
    });
  });
};

// Confirmação de email
export const confirmarEmail = (req, res) => {
  const { token } = req.params;

  const sqlCheck = "SELECT id FROM usuarios WHERE tokenConfirmacao = ?";
  db.query(sqlCheck, [token], (err, results) => {
    if (err) return res.status(500).send("Erro no servidor");
    if (results.length === 0) return res.status(400).send("Token inválido");

    const sqlUpdate =
      "UPDATE usuarios SET ativo = 1, tokenConfirmacao = NULL WHERE tokenConfirmacao = ?";
    db.query(sqlUpdate, [token], (err2) => {
      if (err2) return res.status(500).send("Erro ao confirmar email");
      res.send("Email confirmado! Agora você pode fazer login.");
    });
  });
};

// Login com verificação de ativo
export const login = (req, res) => {
  const { email, senha } = req.body;

  const sql = "SELECT * FROM usuarios WHERE email = ?";
  db.query(sql, [email], (err, results) => {
    if (err) return res.status(500).json({ error: "Erro no login" });
    if (results.length === 0)
      return res.status(400).json({ error: "Email não encontrado" });

    const user = results[0];

    // Verifica se a conta foi confirmada
    if (user.ativo === 0)
      return res
        .status(400)
        .json({ error: "Conta não confirmada. Verifique seu email!" });

    const senhaValida = bcrypt.compareSync(senha, user.senha);
    if (!senhaValida) return res.status(400).json({ error: "Senha incorreta" });

    const token = jwt.sign({ id: user.id }, SECRET, { expiresIn: "1h" });
    res.json({ token });
  });
};