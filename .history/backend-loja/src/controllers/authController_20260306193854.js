import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { enviarEmailConfirmacao } from "../services/mailer.js";
import Usuario from "../models/Usuario.js";

const SECRET = "segredo123";

export async function cadastro(req, res) {
  const { nome, email, senha, telefone } = req.body;

  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regex.test(email)) {
    return res.status(400).json({ error: "Email inválido!" });
  }

  Usuario.buscarPorEmail(email, async (err, results) => {

    if (results.length > 0) {
      return res.status(400).json({ error: "Email já cadastrado" });
    }

    const hashSenha = await bcrypt.hash(senha, 10);

    const tokenConfirmacao = crypto.randomBytes(32).toString("hex");

    const codigoSMS = Math.floor(100000 + Math.random() * 900000);

    Usuario.criar(
      nome,
      email,
      hashSenha,
      tokenConfirmacao,
      telefone,
      codigoSMS,
      (err2) => {

        if (err2) {
          return res.status(500).json({ error: "Erro ao cadastrar" });
        }

        res.json({
          success: true,
          message: "Cadastro realizado. Escolha como validar sua conta."
        });

      }
    );
  });
}

// enviar email novamente
export async function enviarEmail(req, res) {

  const { email } = req.body;

  Usuario.buscarPorEmail(email, async (err, results) => {

    const usuario = results[0];

    const token = usuario.tokenConfirmacao;

    await enviarEmailConfirmacao(email, token);

    res.json({ success: "Email enviado" });

  });

}

// confirmar email
export async function confirmarEmail(req, res) {

  const { token } = req.params;

  Usuario.buscarPorToken(token, (err, results) => {

    if (results.length === 0) {
      return res.send("Token inválido");
    }

    Usuario.ativar(token, () => {

      res.send("Email confirmado com sucesso");

    });

  });

}

// enviar sms
export async function enviarSMS(req, res) {

  const { email } = req.body;

  Usuario.buscarPorEmail(email, (err, results) => {

    const usuario = results[0];

    const codigo = usuario.codigo_sms;

    console.log("Código SMS:", codigo);

    res.json({
      success: "SMS enviado (simulação)",
      codigo
    });

  });

}

// confirmar sms
export async function confirmarSMS(req, res) {

  const { email, codigo } = req.body;

  Usuario.buscarPorEmail(email, (err, results) => {

    const usuario = results[0];

    if (usuario.codigo_sms != codigo) {
      return res.status(400).json({ error: "Código inválido" });
    }

    Usuario.ativarPorEmail(email, () => {

      res.json({ success: "Conta confirmada!" });

    });

  });

}

// login
export async function login(req, res) {

  const { email, senha } = req.body;

  Usuario.buscarPorEmail(email, async (err, results) => {

    if (results.length === 0) {
      return res.status(400).json({ error: "Email não encontrado" });
    }

    const usuario = results[0];

    if (usuario.ativo === 0) {
      return res.status(400).json({ error: "Conta não confirmada" });
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha);

    if (!senhaValida) {
      return res.status(400).json({ error: "Senha incorreta" });
    }

    const token = jwt.sign({ id: usuario.id }, SECRET, { expiresIn: "1h" });

    res.json({ token });

  });

}