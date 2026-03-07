// src/controllers/authController.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { enviarEmailConfirmacao } from "../services/mailer.js";
import Usuario from "../models/Usuario.js"; // seu model mysql2 puro

const SECRET = "segredo123";

// Lista de domínios confiáveis
const dominiosValidos = ["gmail.com", "outlook.com", "hotmail.com", "yahoo.com"];

// Função para validar email e domínio
function validarEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regex.test(email)) return false;

  const dominio = email.split("@")[1].toLowerCase();
  return dominiosValidos.includes(dominio);
}

// Cadastro
export async function cadastro(req, res) {
  const { nome, email, senha } = req.body;

  // 1️⃣ Valida email e domínio
  if (!validarEmail(email)) {
    return res.status(400).json({
      error:
        "Email inválido! Use um email válido do Gmail, Outlook, Hotmail ou Yahoo."
    });
  }

  // 2️⃣ Verifica se já existe
  Usuario.buscarPorEmail(email, async (err, results) => {
    if (err) return res.status(500).json({ error: "Erro no servidor" });
    if (results.length > 0) return res.status(400).json({ error: "Email já cadastrado!" });

    // 3️⃣ Criptografa a senha
    const hashSenha = await bcrypt.hash(senha, 10);

    // 4️⃣ Cria token de confirmação
    const tokenConfirmacao = crypto.randomBytes(32).toString("hex");

    // 5️⃣ Salva no banco
    Usuario.criar(nome, email, hashSenha, tokenConfirmacao, (err2) => {
      if (err2) return res.status(500).json({ error: "Erro ao cadastrar" });

      // 6️⃣ Responde imediatamente ao usuário
      res.status(201).json({
        success:
          "Cadastro realizado! Verifique seu email para ativar a conta. " +
          "Se não receber, use um email válido do Gmail, Outlook, Hotmail ou Yahoo."
      });

      // 7️⃣ Envia email em segundo plano (não trava o cadastro)
      enviarEmailConfirmacao(email, tokenConfirmacao)
        .then(() => console.log(`Email de confirmação enviado para ${email}`))
        .catch((mailErr) => console.error("Erro ao enviar email:", mailErr));
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
    if (usuario.ativo === 0) return res.status(400).json({ error: "Conta não confirmada!" });

    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) return res.status(400).json({ error: "Senha incorreta" });

    const token = jwt.sign({ id: usuario.id }, SECRET, { expiresIn: "1h" });
    res.json({ token });
  });
}