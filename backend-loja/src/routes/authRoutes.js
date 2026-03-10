// src/routes/authRoutes.js
import express from "express";
import db from "../config/database.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { enviarEmail } from "../utils/email.js";

const router = express.Router();

// --------------------- CADASTRO ---------------------
router.post("/cadastro", async (req, res) => {
  const { nome, email, senha } = req.body;

  try {
    // verifica se já existe usuário
    const [usuarios] = await db.promise().query(
      "SELECT * FROM usuarios WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))",
      [email]
    );

    if (usuarios.length)
      return res.status(400).json({ error: "Email já cadastrado" });

    // criptografa senha
    const hashSenha = await bcrypt.hash(senha, 10);

    // gera código de confirmação (6 dígitos)
    const codigo = Math.floor(100000 + Math.random() * 900000).toString();

    // gera token de confirmação para o link
    const tokenConfirmacao = crypto.randomBytes(32).toString("hex");

    // insere no banco com ativo = 0
    await db.promise().query(
      "INSERT INTO usuarios (nome, email, senha, ativo, token_confirmacao, codigo_confirmacao) VALUES (?, ?, ?, 0, ?, ?)",
      [nome, email, hashSenha, tokenConfirmacao, codigo]
    );

    // link de confirmação ajustado para HashRouter
    const link = `${process.env.FRONT_URL}/#/confirmar/${tokenConfirmacao}`;

    // envia email com link + código
    await enviarEmail(
      email,
      "Confirmação de cadastro - DLmodas",
      `
      <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
        <h2>Confirme seu cadastro</h2>
        <p>Olá ${nome}!</p>
        <p>Para ativar sua conta, clique no botão abaixo:</p>
        <a href="${link}" style="padding:10px 20px; background:#fbbf24; color:black; text-decoration:none; border-radius:4px;">Confirmar cadastro</a>
        <p>Ou utilize este código na tela de confirmação:</p>
        <h2 style="color:#fbbf24;">${codigo}</h2>
        <p>Se você não criou esta conta, ignore este email.</p>
      </div>
      `
    );

    res.json({ mensagem: "Cadastro realizado! Verifique seu email para ativar a conta." });
  } catch (err) {
    console.error("Erro no cadastro:", err);
    res.status(500).json({ error: "Erro interno ao cadastrar" });
  }
});

// --------------------- LOGIN ---------------------
router.post("/login", async (req, res) => {
  const { email, senha } = req.body;

  try {
    const [usuarios] = await db.promise().query(
      "SELECT * FROM usuarios WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))",
      [email]
    );

    if (!usuarios.length) return res.status(401).json({ error: "Email ou senha inválidos" });

    const usuario = usuarios[0];

    if (usuario.ativo !== 1) return res.status(401).json({ error: "Conta não ativada" });

    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) return res.status(401).json({ error: "Email ou senha inválidos" });

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email },
      process.env.JWT_SECRET || "SUA_CHAVE_SECRETA",
      { expiresIn: "1d" }
    );

    res.json({ token });
  } catch (err) {
    console.error("Erro no login:", err);
    res.status(500).json({ error: "Erro interno no login" });
  }
});

router.post("/verificar-codigo", async (req, res) => {

  const { token, codigo } = req.body;

  try {

    const [usuarios] = await db.promise().query(
      "SELECT * FROM usuarios WHERE token_confirmacao = ? AND codigo_confirmacao = ?",
      [token, codigo]
    );

    if (!usuarios.length) {
      return res.status(400).json({ error: "Código ou token inválido" });
    }

    const usuario = usuarios[0];

    await db.promise().query(
      "UPDATE usuarios SET ativo = 1, token_confirmacao = NULL, codigo_confirmacao = NULL WHERE id = ?",
      [usuario.id]
    );

    const jwtToken = jwt.sign(
      { id: usuario.id, email: usuario.email },
      process.env.JWT_SECRET || "SUA_CHAVE",
      { expiresIn: "1d" }
    );

    res.json({
      mensagem: "Conta confirmada",
      token: jwtToken
    });

  } catch (err) {

    console.error(err);
    res.status(500).json({ error: "Erro interno" });

  }

});
// --------------------- SOLICITAR REDEFINIÇÃO ---------------------
router.post("/solicitar-recuperacao", async (req, res) => {
  const { email } = req.body;

  try {
    const [usuarios] = await db.promise().query(
      "SELECT * FROM usuarios WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))",
      [email]
    );

    if (!usuarios.length) return res.status(404).json({ error: "Email não cadastrado" });

    const usuario = usuarios[0];
    const token = crypto.randomBytes(32).toString("hex");

    await db.promise().query(
      "UPDATE usuarios SET token_confirmacao = ? WHERE id = ?",
      [token, usuario.id]
    );

    const link = `${process.env.FRONT_URL}/redefinir-senha/${token}`;

    await enviarEmail(
      email,
      "Redefinição de senha DLmodas",
      `
      <p>Clique no link abaixo para redefinir sua senha:</p>
      <a href="${link}">${link}</a>
      <p>Se não solicitou, ignore este email.</p>
      `
    );

    res.json({ mensagem: "Email de redefinição enviado!" });
  } catch (err) {
    console.error("Erro na recuperação de senha:", err);
    res.status(500).json({ error: "Erro ao enviar email" });
  }
});

// --------------------- REDEFINIR SENHA ---------------------
router.post("/redefinir-senha/:token", async (req, res) => {
  const { token } = req.params;
  const { novaSenha } = req.body;

  try {
    const [usuarios] = await db.promise().query(
      "SELECT * FROM usuarios WHERE token_confirmacao = ?",
      [token]
    );

    if (!usuarios.length) return res.status(400).json({ error: "Token inválido" });

    const hash = await bcrypt.hash(novaSenha, 10);

    await db.promise().query(
      "UPDATE usuarios SET senha = ?, token_confirmacao = NULL WHERE id = ?",
      [hash, usuarios[0].id]
    );

    res.json({ mensagem: "Senha redefinida com sucesso!" });
  } catch (err) {
    console.error("Erro ao redefinir senha:", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

export default router;