import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Usuario from "../models/Usuario.js";
import { enviarEmailConfirmacao } from "../services/mailer.js";

const SECRET = "segredo123";


// CADASTRO
export async function cadastro(req, res) {

  const { nome, email, senha } = req.body;

  // validar email
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!regex.test(email)) {
    return res.status(400).json({
      error: "Email inválido"
    });
  }

  // verificar se já existe
  Usuario.buscarPorEmail(email, async (err, results) => {

    if (err) return res.status(500).json({ error: "Erro servidor" });

    if (results.length > 0) {
      return res.status(400).json({
        error: "Email já cadastrado"
      });
    }

    try {

      // criptografar senha
      const hashSenha = await bcrypt.hash(senha, 10);

      // gerar código 6 dígitos
      const codigo = Math.floor(100000 + Math.random() * 900000).toString();

      // salvar no banco
      Usuario.criar(nome, email, hashSenha, codigo, (err2) => {

        if (err2) {
          return res.status(500).json({
            error: "Erro ao cadastrar"
          });
        }

        // enviar email
        enviarEmailConfirmacao(email, codigo);

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



export function verificarCodigo(req, res) {

  const { email, codigo } = req.body;

  Usuario.buscarPorCodigo(email, codigo, (err, results) => {

    if (err) {
      return res.status(500).json({
        error: "Erro no servidor"
      });
    }

    if (results.length === 0) {
      return res.status(400).json({
        error: "Código inválido"
      });
    }

    Usuario.ativarUsuario(email, (err2) => {

      if (err2) {
        return res.status(500).json({
          error: "Erro ao ativar conta"
        });
      }

      res.json({
        mensagem: "Conta ativada com sucesso!"
      });

    });

  });

}



// LOGIN
export async function login(req, res) {

  const { email, senha } = req.body;

  Usuario.buscarPorEmail(email, async (err, results) => {

    if (err) return res.status(500).json({ error: "Erro no login" });

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