import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import dns from "dns";
import { enviarEmailConfirmacao } from "../services/mailer.js";
import Usuario from "../models/Usuario.js"; // mysql2 puro

const SECRET = "segredo123"; // depois pode usar variável de ambiente

// Verifica se o domínio do email existe
function verificarDominioEmail(email) {
  return new Promise((resolve) => {
    const dominio = email.split("@")[1];
    dns.resolveMx(dominio, (err, addresses) => {
      if (err || addresses.length === 0) resolve(false);
      else resolve(true);
    });
  });
}

// ==========================
// CADASTRO
// ==========================
export async function cadastro(req, res) {
  const { nome, email, senha } = req.body;

  // 1️⃣ Validação básica do email
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regex.test(email)) {
    return res.status(400).json({ error: "Email inválido! Use um email correto." });
  }

  // 2️⃣ Verificação do domínio
  const dominioValido = await verificarDominioEmail(email);
  if (!dominioValido) {
    return res.status(400).json({ error: "Domínio de email inexistente ou inválido." });
  }

  // 3️⃣ Verifica se o email já existe
  Usuario.buscarPorEmail(email, async (err, results) => {
    if (err) return res.status(500).json({ error: "Erro no servidor" });
    if (results.length > 0) return res.status(400).json({ error: "Email já cadastrado!" });

    // 4️⃣ Criptografa senha e gera token de confirmação
    const hashSenha = await bcrypt.hash(senha, 10);
    const tokenConfirmacao = crypto.randomBytes(32).toString("hex");

    // 5️⃣ Salva no banco
    Usuario.criar(nome, email, hashSenha, tokenConfirmacao, (err2) => {
      if (err2) return res.status(500).json({ error: "Erro ao cadastrar" });

      // 6️⃣ Envia email em background
      enviarEmailConfirmacao(email, tokenConfirmacao)
        .then(() => console.log(`Email de confirmação enviado para ${email}`))
        .catch((mailErr) => console.error("Erro ao enviar email:", mailErr));

      // 7️⃣ Resposta rápida para o usuário
      res.status(201).json({
        success:
          "Cadastro realizado! Verifique seu email para ativar a conta. " +
          "Se não receber, confira se digitou um email válido."
      });
    });
  });
}

// ==========================
// CONFIRMAÇÃO DE EMAIL
// ==========================
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

// ==========================
// LOGIN
// ==========================
export async function login(req, res) {
  const { email, senha } = req.body;

  Usuario.buscarPorEmail(email, async (err, results) => {
    if (err) return res.status(500).json({ error: "Erro no login" });
    if (results.length === 0) return res.status(400).json({ error: "Email não encontrado" });

    const usuario = results[0];

    if (usuario.ativo === 0) {
      return res.status(400).json({ error: "Conta não confirmada! Verifique seu email." });
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) return res.status(400).json({ error: "Senha incorreta" });

    const token = jwt.sign({ id: usuario.id }, SECRET, { expiresIn: "1h" });
    res.json({ token });
  });
}