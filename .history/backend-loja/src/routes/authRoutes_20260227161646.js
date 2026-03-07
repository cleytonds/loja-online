import Usuario from "../models/Usuario.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { enviarEmailConfirmacao } from "../services/mailer.js";

const SECRET = "segredo123";

// Cadastro
export async function cadastro(req, res) {
  const { nome, email, senha } = req.body;

  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regex.test(email)) return res.status(400).json({ error: "Email inválido!" });

  try {
    const existe = await Usuario.findOne({ where: { email } });
    if (existe) return res.status(400).json({ error: "Email já cadastrado!" });

    const hashSenha = await bcrypt.hash(senha, 10);
    const tokenConfirmacao = crypto.randomBytes(32).toString("hex");

    await Usuario.create({ nome, email, senha: hashSenha, ativo: false, tokenConfirmacao });

    await enviarEmailConfirmacao(email, tokenConfirmacao);

    res.status(201).json({ success: "Cadastro realizado! Verifique seu email para ativar a conta." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro no servidor" });
  }
}

// Confirmação de email
export async function confirmarEmail(req, res) {
  const { token } = req.params;

  try {
    const usuario = await Usuario.findOne({ where: { tokenConfirmacao: token } });
    if (!usuario) return res.status(400).send("Token inválido");

    usuario.ativo = true;
    usuario.tokenConfirmacao = null;
    await usuario.save();

    res.send("Email confirmado! Agora você pode fazer login.");
  } catch (err) {
    console.error(err);
    res.status(500).send("Erro ao confirmar email");
  }
}

// Login
export async function login(req, res) {
  const { email, senha } = req.body;

  try {
    const usuario = await Usuario.findOne({ where: { email } });
    if (!usuario) return res.status(400).json({ error: "Email não encontrado" });
    if (!usuario.ativo) return res.status(400).json({ error: "Conta não confirmada. Verifique seu email!" });

    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) return res.status(400).json({ error: "Senha incorreta" });

    const token = jwt.sign({ id: usuario.id }, SECRET, { expiresIn: "1h" });
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro no login" });
  }
}