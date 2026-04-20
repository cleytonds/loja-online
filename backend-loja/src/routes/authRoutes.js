// =========================
// 📦 IMPORTAÇÕES
// =========================
import express from "express";
import db from "../config/database.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { enviarEmail } from "../utils/email.js";
import { verificarToken } from "../middlewares/auth.js";

const router = express.Router();

// =========================
// 📌 CADASTRO DE USUÁRIO
// =========================
router.post("/cadastro", async (req, res) => {
  const { nome, email, senha } = req.body;

  try {
    // 🔒 normaliza email
    const emailNormalizado = email.trim().toLowerCase();

    // 🔍 verifica se já existe
    const [usuarios] = await db.query(
      "SELECT * FROM usuarios WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))",
      [emailNormalizado]
    );

    if (usuarios.length > 0) {
      return res.status(400).json({ error: "Email já cadastrado" });
    }

    // 🔐 hash da senha
    const hashSenha = await bcrypt.hash(senha, 10);

    // 🔑 código + token
    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    const tokenConfirmacao = crypto.randomBytes(32).toString("hex");

    // 💾 salva no banco
    await db.query(
      `INSERT INTO usuarios 
      (nome, email, senha, ativo, token_confirmacao, codigo_confirmacao, tipo) 
      VALUES (?, ?, ?, 0, ?, ?, 'cliente')`,
      [nome, emailNormalizado, hashSenha, tokenConfirmacao, codigo]
    );

    // 🔗 link de confirmação
    const link = `${process.env.FRONT_URL}/#/confirmar/${tokenConfirmacao}`;

    // 📧 envio de email
    try {
      await enviarEmail(
        emailNormalizado,
        "Confirmação de cadastro - DLmodas",
        `
        <div style="text-align:center">
          <h2>Confirme seu cadastro</h2>
          <a href="${link}">Confirmar conta</a>
          <h3>Código: ${codigo}</h3>
        </div>
        `
      );
    } catch (erroEmail) {
      console.error("❌ ERRO AO ENVIAR EMAIL:", erroEmail);
    }

    return res.status(201).json({
      mensagem: "Cadastro realizado! Verifique seu email."
    });

  } catch (err) {
    console.error("❌ ERRO NO CADASTRO:", err);
    return res.status(500).json({ error: "Erro no cadastro" });
  }
});

// =========================
// 🔐 LOGIN
// =========================
router.post("/login", async (req, res) => {
  const { email, senha } = req.body;

  try {
    const emailNormalizado = email.trim().toLowerCase();

    const [usuarios] = await db.query(
      "SELECT * FROM usuarios WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))",
      [emailNormalizado]
    );

    if (!usuarios.length) {
      return res.status(401).json({ error: "Email ou senha inválidos" });
    }

    const usuario = usuarios[0];

    // 🔒 verifica se ativou conta
    if (usuario.ativo !== 1) {
      return res.status(401).json({ error: "Conta não ativada" });
    }

    // 🔐 valida senha
    const senhaValida = await bcrypt.compare(senha, usuario.senha);

    if (!senhaValida) {
      return res.status(401).json({ error: "Email ou senha inválidos" });
    }

    // 🎟️ gera token
    const token = jwt.sign(
      { id: usuario.id, tipo: usuario.tipo },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.json({
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
    console.error("❌ ERRO NO LOGIN:", err);
    return res.status(500).json({ error: "Erro no login" });
  }
});

// =========================
// 👤 PEGAR USUÁRIO LOGADO
// =========================
router.get("/me", verificarToken, async (req, res) => {
  try {
    const [usuarios] = await db.query(
      "SELECT id, nome, email, tipo, ativo FROM usuarios WHERE id = ?",
      [req.user.id]
    );

    if (!usuarios.length) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    return res.json(usuarios[0]);

  } catch (err) {
    console.error("❌ ERRO /ME:", err);
    return res.status(500).json({ error: "Erro ao buscar usuário" });
  }
});

// =========================
// ✅ CONFIRMAR CONTA
// =========================
router.post("/verificar-codigo", async (req, res) => {
  const { token, codigo } = req.body;

  try {
    const [usuarios] = await db.query(
      "SELECT * FROM usuarios WHERE token_confirmacao = ? AND codigo_confirmacao = ?",
      [token, codigo]
    );

    if (!usuarios.length) {
      return res.status(400).json({ error: "Código ou token inválido" });
    }

    const usuario = usuarios[0];

    await db.query(
      "UPDATE usuarios SET ativo = 1, token_confirmacao = NULL, codigo_confirmacao = NULL WHERE id = ?",
      [usuario.id]
    );

    return res.json({ mensagem: "Conta confirmada com sucesso!" });

  } catch (err) {
    console.error("❌ ERRO CONFIRMAÇÃO:", err);
    return res.status(500).json({ error: "Erro interno" });
  }
});

// =========================
// 🔁 REENVIAR CÓDIGO
// =========================
router.post("/reenviar-codigo", async (req, res) => {
  const { email } = req.body;

  try {
    const emailNormalizado = email.trim().toLowerCase();

    const [usuarios] = await db.query(
      "SELECT * FROM usuarios WHERE email = ?",
      [emailNormalizado]
    );

    if (!usuarios.length) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const usuario = usuarios[0];

    if (usuario.ativo === 1) {
      return res.status(400).json({ error: "Conta já ativada" });
    }

    const novoCodigo = Math.floor(100000 + Math.random() * 900000).toString();
    const novoToken = crypto.randomBytes(32).toString("hex");

    await db.query(
      "UPDATE usuarios SET codigo_confirmacao = ?, token_confirmacao = ? WHERE id = ?",
      [novoCodigo, novoToken, usuario.id]
    );

    const link = `${process.env.FRONT_URL}/#/confirmar/${novoToken}`;

    await enviarEmail(
      usuario.email,
      "Reenvio de código - DLmodas",
      `
      <div style="text-align:center">
        <a href="${link}">Confirmar conta</a>
        <h2>${novoCodigo}</h2>
      </div>
      `
    );

    return res.json({ mensagem: "Código reenviado com sucesso!" });

  } catch (err) {
    console.error("❌ ERRO REENVIO:", err);
    return res.status(500).json({ error: "Erro interno" });
  }
});

export default router;