import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import Usuario from "../models/Usuario.js";
import { enviarEmailConfirmacao } from "../services/mailer.js";

const SECRET = "segredo123";

// ================= CADASTRO =================
export async function cadastro(req, res) {
  const { nome, email, senha } = req.body;

  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regex.test(email)) return res.status(400).json({ error: "Email inválido" });

  Usuario.buscarPorEmail(email, async (err, results) => {
    if (err) return res.status(500).json({ error: "Erro servidor" });
    if (results.length > 0) return res.status(400).json({ error: "Email já cadastrado" });

    try {
      const hashSenha = await bcrypt.hash(senha, 10);

      const codigo = Math.floor(100000 + Math.random() * 900000).toString(); // código 6 dígitos
      const token = crypto.randomBytes(16).toString("hex");                  // token para link

      Usuario.criar(nome, email, hashSenha, codigo, token, (err2) => {
        if (err2) return res.status(500).json({ error: "Erro ao cadastrar" });

        // envia email com link + código
        enviarEmailConfirmacao(email, token, codigo);

        res.status(201).json({ mensagem: "Cadastro realizado! Verifique seu email." });
      });

    } catch (erro) {
      res.status(500).json({ error: "Erro ao processar cadastro" });
    }
  });
}

// ================= VERIFICAR CÓDIGO =================
export function verificarCodigo(req, res) {
  const { token, codigo } = req.body;

  Usuario.buscarPorToken(token, (err, results) => {
    if (err) return res.status(500).json({ error: "Erro no servidor" });
    if (results.length === 0) return res.status(400).json({ error: "Token inválido" });

    const usuario = results[0];
    if (usuario.codigo_confirmacao !== codigo) return res.status(400).json({ error: "Código incorreto" });

    Usuario.ativarUsuario(usuario.id, (err2) => {
      if (err2) return res.status(500).json({ error: "Erro ao ativar conta" });

      res.json({ mensagem: "Conta ativada com sucesso!" });
    });
  });
}

// ================= LOGIN =================
export async function login(req, res) {
  const { email, senha } = req.body;

  Usuario.buscarPorEmail(email, async (err, results) => {
    if (err) return res.status(500).json({ error: "Erro no login" });
    if (results.length === 0) return res.status(400).json({ error: "Usuário não encontrado" });

    const usuario = results[0];

    if (usuario.ativo === 0) return res.status(400).json({ error: "Conta não confirmada" });

    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) return res.status(400).json({ error: "Senha incorreta" });

    const token = jwt.sign({ id: usuario.id }, SECRET, { expiresIn: "1h" });
    res.json({ token });
  });
}