import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import Usuario from "../models/Usuario.js";
import { enviarEmailConfirmacao } from "../services/mailer.js";

const SECRET = process.env.JWT_SECRET;

// =========================
// 📌 CADASTRO
// =========================
export async function cadastro(req, res) {
  const { nome, email, senha } = req.body;

  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!regex.test(email)) {
    return res.status(400).json({ error: "Email inválido" });
  }

  Usuario.buscarPorEmail(email.trim().toLowerCase(), async (err, results) => {
    if (err) return res.status(500).json({ error: "Erro servidor" });

    if (results.length > 0) {
      return res.status(400).json({ error: "Email já cadastrado" });
    }

    try {
      const hashSenha = await bcrypt.hash(senha, 10);

      const codigo = Math.floor(100000 + Math.random() * 900000).toString();
      const token = uuidv4();

      Usuario.criar(
        nome,
        email.trim().toLowerCase(),
        hashSenha,
        codigo,
        token,
        "cliente",
        (err2) => {
          if (err2) {
            return res.status(500).json({ error: "Erro ao cadastrar" });
          }

          enviarEmailConfirmacao(email, token, codigo);

          res.status(201).json({
            mensagem: "Cadastro realizado! Verifique seu email."
          });
        }
      );
    } catch (erro) {
      res.status(500).json({
        error: "Erro ao processar cadastro"
      });
    }
  });
}

// =========================
// 📌 VERIFICAR CÓDIGO
// =========================
export function verificarCodigo(req, res) {
  const { token, codigo, email } = req.body;

  if (token && !codigo) {
    Usuario.buscarPorToken(token, (err, results) => {
      if (err) return res.status(500).json({ error: "Erro servidor" });

      if (results.length === 0) {
        return res.status(400).json({ error: "Token inválido" });
      }

      const usuario = results[0];

      Usuario.ativarUsuario(usuario.id, (err2) => {
        if (err2) {
          return res.status(500).json({ error: "Erro ao ativar" });
        }

        return res.json({ mensagem: "Conta confirmada com sucesso!" });
      });
    });

    return;
  }

  if (!email || !codigo) {
    return res.status(400).json({
      error: "Email e código são obrigatórios"
    });
  }

  Usuario.buscarPorEmailECodigo(email, codigo, (err, results) => {
    if (err) return res.status(500).json({ error: "Erro servidor" });

    if (results.length === 0) {
      return res.status(400).json({ error: "Código inválido" });
    }

    const usuario = results[0];

    Usuario.ativarUsuario(usuario.id, (err2) => {
      if (err2) {
        return res.status(500).json({ error: "Erro ao ativar conta" });
      }

      res.json({ mensagem: "Conta confirmada com sucesso!" });
    });
  });
}

// =========================
// 🔁 REENVIAR CÓDIGO
// =========================
export function reenviarCodigo(req, res) {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email é obrigatório" });
  }

  Usuario.buscarPorEmail(email.trim().toLowerCase(), (err, results) => {
    if (err) return res.status(500).json({ error: "Erro servidor" });

    if (results.length === 0) {
      return res.status(400).json({ error: "Usuário não encontrado" });
    }

    const usuario = results[0];

    const novoCodigo = Math.floor(100000 + Math.random() * 900000).toString();
    const novoToken = uuidv4();

    Usuario.atualizarCodigoEToken(
      usuario.id,
      novoCodigo,
      novoToken,
      (err2) => {
        if (err2) {
          return res.status(500).json({ error: "Erro ao atualizar código" });
        }

        enviarEmailConfirmacao(usuario.email, novoToken, novoCodigo);

        res.json({ mensagem: "Código reenviado com sucesso!" });
      }
    );
  });
}

// =========================
// 🔐 LOGIN (FINAL CORRIGIDO)
// =========================
export async function login(req, res) {
  const { email, senha } = req.body;

  Usuario.buscarPorEmail(email.trim().toLowerCase(), async (err, results) => {
    if (err) {
      return res.status(500).json({ error: "Erro no login" });
    }

    if (results.length === 0) {
      return res.status(400).json({ error: "Usuário não encontrado" });
    }

    const usuario = results[0];

    if (usuario.ativo === 0) {
      return res.status(400).json({ error: "Conta não confirmada" });
    }

    try {
      const senhaValida = await bcrypt.compare(senha.trim(), usuario.senha);

      if (!senhaValida) {
        return res.status(401).json({ error: "Email ou senha inválidos" });
      }

      const token = jwt.sign(
        {
          id: usuario.id,
          tipo: usuario.tipo
        },
        SECRET,
        { expiresIn: "1h" }
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

    } catch (error) {
      return res.status(500).json({ error: "Erro ao validar senha" });
    }
  });
}