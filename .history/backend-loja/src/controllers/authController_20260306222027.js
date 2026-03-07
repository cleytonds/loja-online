// src/controllers/authController.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import Usuario from "../models/Usuario.js";
import { enviarEmailConfirmacao } from "../services/mailer.js";

const SECRET = "segredo123";


// CADASTRO
export async function cadastro(req, res) {

  const { nome, email, senha } = req.body;

  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!regex.test(email)) {
    return res.status(400).json({ error: "Email inválido" });
  }

  Usuario.buscarPorEmail(email, async (err, results) => {

    if (err) return res.status(500).json({ error: "Erro servidor" });

    if (results.length > 0) {
      return res.status(400).json({ error: "Email já cadastrado" });
    }

    try {

      const hashSenha = await bcrypt.hash(senha, 10);

      const codigo = Math.floor(100000 + Math.random() * 900000).toString();

      const token = uuidv4();

      Usuario.criar(nome, email, hashSenha, codigo, token, (err2) => {

        if (err2) {
          return res.status(500).json({ error: "Erro ao cadastrar" });
        }

        enviarEmailConfirmacao(email, token, codigo);

        res.status(201).json({
          mensagem: "Cadastro realizado! Verifique seu email."
        });

      });

    } catch (erro) {

      res.status(500).json({
        error: "Erro ao processar cadastro"
      });

    }

  });

}



// VERIFICAR CÓDIGO
export function verificarCodigo(req, res) {

  const { token, codigo } = req.body;

  if (!token || !codigo) {
    return res.status(400).json({
      error: "Token e código são obrigatórios"
    });
  }

  Usuario.buscarPorTokenECodigo(token, codigo, (err, results) => {

    if (err) {
      return res.status(500).json({
        error: "Erro no servidor"
      });
    }

    if (results.length === 0) {
      return res.status(400).json({
        error: "Código inválido ou token incorreto"
      });
    }

    const usuario = results[0];

    // ATIVAR USUÁRIO
    Usuario.ativarUsuario(usuario.id, (err2) => {

      if (err2) {
        return res.status(500).json({
          error: "Erro ao ativar conta"
        });
      }

      res.json({
        mensagem: "Cadastro confirmado com sucesso!"
      });

    });

  });

}



// LOGIN
export async function login(req, res) {

  const { email, senha } = req.body;

  Usuario.buscarPorEmail(email, async (err, results) => {

    if (err) {
      return res.status(500).json({
        error: "Erro no login"
      });
    }

    if (results.length === 0) {
      return res.status(400).json({
        error: "Usuário não encontrado"
      });
    }

    const usuario = results[0];

    if (usuario.ativo === 0) {
      return res.status(400).json({
        error: "Conta não confirmada"
      });
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha);

    if (!senhaValida) {
      return res.status(400).json({
        error: "Senha incorreta"
      });
    }

    const token = jwt.sign(
      { id: usuario.id },
      SECRET,
      { expiresIn: "1h" }
    );

    res.json({ token });

  });

}