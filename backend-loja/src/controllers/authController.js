import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import Usuario from "../models/Usuario.js";
import { enviarEmailConfirmacao } from "../services/mailer.js";

const SECRET = process.env.JWT_SECRET;

// =========================
// 📌 CADASTRO (PROFISSIONAL)
// =========================
export async function cadastro(req, res) {
  const { nome, email, senha } = req.body;

  /**
   * 🔒 Validação básica de email
   */
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regex.test(email)) {
    return res.status(400).json({ error: "Email inválido" });
  }

  /**
   * 🔒 Normalização (evita duplicidade tipo: TESTE@email.com)
   */
  const emailNormalizado = email.trim().toLowerCase();

  Usuario.buscarPorEmail(emailNormalizado, async (err, results) => {
    if (err) {
      console.error("ERRO MYSQL:", err);
      return res.status(500).json({ error: "Erro servidor" });
    }

    if (results.length > 0) {
      return res.status(400).json({ error: "Email já cadastrado" });
    }

    try {
      /**
       * 🔐 Hash da senha (custo 10 = seguro + performático)
       */
      const hashSenha = await bcrypt.hash(senha, 10);

      /**
       * 🔑 Código + token de verificação
       */
      const codigo = Math.floor(100000 + Math.random() * 900000).toString();
      const token = uuidv4();

      Usuario.criar(
        nome,
        emailNormalizado,
        hashSenha,
        codigo,
        token,
        "cliente",
        async (err2) => { // ✅ AGORA É ASYNC
          if (err2) {
            console.error("ERRO AO CRIAR USUARIO:", err2);
            return res.status(500).json({ error: "Erro ao cadastrar" });
          }

          try {
            await enviarEmailConfirmacao(emailNormalizado, token, codigo);
          } catch (e) {
            console.error("ERRO AO ENVIAR EMAIL:", e);
          }

          return res.status(201).json({
            mensagem: "Cadastro realizado! Verifique seu email."
          });
        }
      );
    } catch (erro) {
      console.error("ERRO HASH:", erro);
      return res.status(500).json({
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
// 🔐 LOGIN 
// =========================
export async function login(req, res) {
  const { email, senha } = req.body;

  /**
   * 🔒 Validação obrigatória
   */
  if (!email || !senha) {
    return res.status(400).json({
      error: "Email e senha são obrigatórios"
    });
  }

  const emailNormalizado = email.trim().toLowerCase();

  Usuario.buscarPorEmail(emailNormalizado, async (err, results) => {

    if (err) {
      console.error("ERRO MYSQL LOGIN:", err);
      return res.status(500).json({ error: "Erro no banco de dados" });
    }

    if (!results || results.length === 0) {
      return res.status(400).json({ error: "Usuário não encontrado" });
    }

    const usuario = results[0];

    /**
     * 🔒 Conta precisa estar ativa
     */
    if (usuario.ativo === 0) {
      return res.status(400).json({ error: "Conta não confirmada" });
    }

    try {
      const senhaValida = await bcrypt.compare(
        senha.toString(),
        usuario.senha
      );

      if (!senhaValida) {
        return res.status(401).json({
          error: "Email ou senha inválidos"
        });
      }

      /**
       * 🔐 Geração do token JWT
       * - inclui id e tipo (admin/cliente)
       * - expiração curta por segurança
       */
      const token = jwt.sign(
        {
          id: usuario.id,
          tipo: usuario.tipo
        },
        SECRET,
        {
          expiresIn: "2h"
        }
      );

      /**
       * 📦 Resposta limpa (não retorna senha nunca)
       */
      return res.json({
        token,
        usuario: {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          tipo: usuario.tipo
        }
      });

    } catch (e) {
      console.error("ERRO LOGIN:", e);
      return res.status(500).json({
        error: "Erro interno no login"
      });
    }
  });
}