// src/controllers/authController.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { enviarEmailConfirmacao } from "../services/mailer.js";
import Usuario from "../models/Usuario.js";

const SECRET = "segredo123";

// Cadastro
export async function cadastro(req, res) {
  const { nome, email, senha } = req.body;

  // Regex simples
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regex.test(email)) return res.status(400).json({ error: "Email inválido!" });

  // Verifica se já existe
  Usuario.buscarPorEmail(email, async (err, results) => {
    if (err) return res.status(500).json({ error: "Erro no servidor" });
    if (results.length > 0) return res.status(400).json({ error: "Email já cadastrado!" });

    // Criptografa a senha
    const hashSenha = await bcrypt.hash(senha, 10);

    // Cria token de confirmação
    const tokenConfirmacao = crypto.randomBytes(32).toString("hex");

    // Salva no banco
    Usuario.criar(nome, email, hashSenha, tokenConfirmacao, async (err2) => {
      if (err2) return res.status(500).json({ error: "Erro ao cadastrar" });

      // Envia email
      try {
        await enviarEmailConfirmacao(email, tokenConfirmacao);
        res.status(201).json({ success: "Cadastro realizado! Verifique seu email." });
      } catch (mailErr) {
        console.error(mailErr);
        res.status(500).json({
          error:
            "Ops! Não conseguimos enviar o email de confirmação. " +
            "Por favor, use um email válido e tente novamente."
        });
      }
    });
  });
}

// Confirmação de email
export async function confirmarEmail(req, res) {
  const { token } = req.params;

  Usuario.buscarPorToken(token, (err, results) => {
    if (err) return res.status(500).send("Erro no servidor");
    if (results.length === 0) return res.status(400).send("Token inválido");

    Usuario.ativar(token, (err2) => {
      if (err2) return res.status(500).send("Erro ao confirmar email");
      res.send("Email confirmado! Agora você pode fazer login.");
    });
  });
}

// Login
export async function login(req, res) {
  const { email, senha } = req.body;

  Usuario.buscarPorEmail(email, async (err, results) => {
    if (err) return res.status(500).json({ error: "Erro no login" });
    if (results.length === 0) return res.status(400).json({ error: "Email não encontrado" });

    const usuario = results[0];
    if (usuario.ativo === 0)
      return res.status(400).json({ error: "Conta não confirmada!" });

    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) return res.status(400).json({ error: "Senha incorreta" });

    const token = jwt.sign({ id: usuario.id }, SECRET, { expiresIn: "1h" });
    res.json({ token });
  });
}