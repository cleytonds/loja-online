// src/routes/authRoutes.js
import express from "express";
import db from "../config/database.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { enviarEmail } from "../utils/email.js";
import { verificarToken } from "../middlewares/auth.js";

const router = express.Router();

// ========================= CADASTRO =========================
router.post("/cadastro", async (req, res) => {
  const { nome, email, senha } = req.body;

  try {
    const [usuarios] = await db.promise().query(
      "SELECT * FROM usuarios WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))",
      [email]
    );

    if (usuarios.length)
      return res.status(400).json({ error: "Email já cadastrado" });

    const hashSenha = await bcrypt.hash(senha, 10);

    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    const tokenConfirmacao = crypto.randomBytes(32).toString("hex");

    await db.promise().query(
      "INSERT INTO usuarios (nome, email, senha, ativo, token_confirmacao, codigo_confirmacao, tipo) VALUES (?, ?, ?, 0, ?, ?, 'cliente')",
      [nome, email, hashSenha, tokenConfirmacao, codigo]
    );

    const link = `${process.env.FRONT_URL}/#/confirmar/${tokenConfirmacao}`;

    await enviarEmail(
      email,
      "Confirmação de cadastro - DLmodas",
      `
      <div style="text-align:center">
        <h2>Confirme seu cadastro</h2>
        <a href="${link}">Confirmar</a>
        <h3>${codigo}</h3>
      </div>
      `
    );

    res.json({ mensagem: "Cadastro realizado! Verifique seu email." });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro no cadastro" });
  }
});

// ========================= LOGIN =========================
router.post("/login", async (req, res) => {
  const { email, senha } = req.body;

  try {
    const [usuarios] = await db.promise().query(
      "SELECT * FROM usuarios WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))",
      [email]
    );

    if (!usuarios.length)
      return res.status(401).json({ error: "Email ou senha inválidos" });

    const usuario = usuarios[0];

    if (usuario.ativo !== 1)
      return res.status(401).json({ error: "Conta não ativada" });

    const senhaValida = await bcrypt.compare(senha, usuario.senha);

    if (!senhaValida)
      return res.status(401).json({ error: "Email ou senha inválidos" });

    const token = jwt.sign(
      { id: usuario.id, tipo: usuario.tipo },
      process.env.JWT_SECRET || "SUA_CHAVE",
      { expiresIn: "1d" }
    );

    // 🔥 AGORA COMPATÍVEL COM SEU LOGIN.JSX
    res.json({
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        tipo: usuario.tipo,
        ativo: usuario.ativo
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro no login" });
  }
});

// ========================= /ME (MANTER LOGIN) =========================
router.get("/me", verificarToken, async (req, res) => {
  try {
    const [usuarios] = await db.promise().query(
      "SELECT id, nome, email, tipo, ativo FROM usuarios WHERE id = ?",
      [req.user.id]
    );

    if (!usuarios.length)
      return res.status(404).json({ error: "Usuário não encontrado" });

    res.json(usuarios[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar usuário" });
  }
});

// ========================= VERIFICAR CÓDIGO =========================
router.post("/verificar-codigo", async (req, res) => {
  const { token, codigo } = req.body;

  try {
    const [usuarios] = await db.promise().query(
      "SELECT * FROM usuarios WHERE token_confirmacao = ? AND codigo_confirmacao = ?",
      [token, codigo]
    );

    if (!usuarios.length)
      return res.status(400).json({ error: "Código ou token inválido" });

    const usuario = usuarios[0];

    await db.promise().query(
      "UPDATE usuarios SET ativo = 1, token_confirmacao = NULL, codigo_confirmacao = NULL WHERE id = ?",
      [usuario.id]
    );

    // 🔥 opcional: já loga após confirmar
    const jwtToken = jwt.sign(
      { id: usuario.id, tipo: usuario.tipo },
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

// ========================= REENVIAR CÓDIGO =========================
router.post("/reenviar-codigo", async (req, res) => {
  const { email } = req.body;

  try {
    const [usuarios] = await db.promise().query(
      "SELECT * FROM usuarios WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))",
      [email]
    );

    if (!usuarios.length)
      return res.status(404).json({ error: "Usuário não encontrado" });

    const usuario = usuarios[0];

    if (usuario.ativo === 1)
      return res.status(400).json({ error: "Conta já ativada" });

    const novoCodigo = Math.floor(100000 + Math.random() * 900000).toString();
    const novoToken = crypto.randomBytes(32).toString("hex");

    await db.promise().query(
      "UPDATE usuarios SET codigo_confirmacao = ?, token_confirmacao = ? WHERE id = ?",
      [novoCodigo, novoToken, usuario.id]
    );

    const link = `${process.env.FRONT_URL}/#/confirmar/${novoToken}`;

    await enviarEmail(
      usuario.email,
      "Reenvio de código - DLmodas",
      `
      <div style="text-align:center">
        <a href="${link}">Confirmar</a>
        <h2>${novoCodigo}</h2>
      </div>
      `
    );

    res.json({ mensagem: "Código reenviado com sucesso!" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno" });
  }
});

// ========================= SOLICITAR RECUPERAÇÃO =========================
router.post("/solicitar-recuperacao", async (req, res) => {
  const { email } = req.body;

  try {
    const [usuarios] = await db.promise().query(
      "SELECT * FROM usuarios WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))",
      [email]
    );

    if (!usuarios.length)
      return res.status(404).json({ error: "Email não cadastrado" });

    const usuario = usuarios[0];

    const token = crypto.randomBytes(32).toString("hex");

    await db.promise().query(
      "UPDATE usuarios SET token_confirmacao = ? WHERE id = ?",
      [token, usuario.id]
    );

    const link = `${process.env.FRONT_URL}/#/redefinir-senha/${token}`;

    await enviarEmail(
      email,
      "Redefinição de senha",
      `<a href="${link}">Redefinir senha</a>`
    );

    res.json({ mensagem: "Email enviado!" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao enviar e-mail" });
  }
});

// ========================= REDEFINIR SENHA =========================
router.post("/redefinir-senha/:token", async (req, res) => {
  const { token } = req.params;
  const { novaSenha } = req.body;

  try {
    const [usuarios] = await db.promise().query(
      "SELECT * FROM usuarios WHERE token_confirmacao = ?",
      [token]
    );

    if (!usuarios.length)
      return res.status(400).json({ error: "Token inválido" });

    const hash = await bcrypt.hash(novaSenha, 10);

    await db.promise().query(
      "UPDATE usuarios SET senha = ?, token_confirmacao = NULL WHERE id = ?",
      [hash, usuarios[0].id]
    );

    res.json({ mensagem: "Senha redefinida com sucesso!" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno" });
  }
});

export default router;