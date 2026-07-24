// =========================
//  IMPORTAÇÕES
// =========================
import express from 'express';
import db from '../config/database.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { enviarEmail } from '../utils/email.js';
import { verificarToken } from '../middlewares/auth.js';
import { normalizarCelularBrasileiro } from '../utils/celular.js';

const router = express.Router();

// =========================
//  CADASTRO DE USUÁRIO
// =========================
router.post('/cadastro', async (req, res) => {
  const { nome, email, senha } = req.body;
  const celular = normalizarCelularBrasileiro(req.body?.celular);

  if (!nome || typeof nome !== 'string' || nome.trim().length < 2) {
    return res.status(400).json({ error: 'Nome inválido' });
  }

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email inválido' });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim().toLowerCase())) {
    return res.status(400).json({ error: 'Email inválido' });
  }

  if (!senha || typeof senha !== 'string' || senha.trim().length < 8) {
    return res.status(400).json({ error: 'Senha inválida' });
  }

  if (!celular) {
    return res.status(400).json({ erro: 'Informe um celular válido com DDD.' });
  }

  try {
    //  normaliza email
    const emailNormalizado = email.trim().toLowerCase();

    //  verifica se já existe
    const [usuarios] = await db.query(
      'SELECT * FROM usuarios WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))',
      [emailNormalizado],
    );

    if (usuarios.length > 0) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }

    //  hash da senha
    const hashSenha = await bcrypt.hash(senha, 10);

    //  código + token
    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    const tokenConfirmacao = crypto.randomBytes(32).toString('hex');

    //  salva no banco
    await db.query(
      `INSERT INTO usuarios 
      (nome, email, senha, celular, ativo, token_confirmacao, codigo_confirmacao, tipo)
      VALUES (?, ?, ?, ?, 0, ?, ?, 'cliente')`,
      [nome, emailNormalizado, hashSenha, celular, tokenConfirmacao, codigo],
    );

    //  link de confirmação
    const link = `${process.env.FRONT_URL}/#/confirmar/${tokenConfirmacao}`;

    //  envio de email
    try {
      await enviarEmail(
        emailNormalizado,
        'Confirmação de cadastro - DLmodas',
        `
        <div style="text-align:center">
          <h2>Confirme seu cadastro</h2>
          <a href="${link}">Confirmar conta</a>
          <h3>Código: ${codigo}</h3>
        </div>
        `,
      );
    } catch (erroEmail) {
      console.error(' ERRO AO ENVIAR EMAIL:', erroEmail);
    }

    return res.status(201).json({
      mensagem: 'Cadastro realizado! Verifique seu email.',
    });
  } catch (err) {
    console.error(' ERRO NO CADASTRO:', err);
    return res.status(500).json({ error: 'Erro no cadastro' });
  }
});

// =========================
//  LOGIN
// =========================
router.post('/login', async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const senha = typeof req.body?.senha === 'string' ? req.body.senha : '';

  if (!email || !senha) {
    return res.status(400).json({ error: 'Email e senha sao obrigatorios' });
  }

  try {
    const [usuarios] = await db.query(
      'SELECT * FROM usuarios WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))',
      [email],
    );

    if (!usuarios.length) {
      return res.status(401).json({ error: 'Email ou senha inválidos' });
    }

    const usuario = usuarios[0];

    //  verifica se ativou conta
    if (usuario.ativo !== 1) {
      return res.status(401).json({ error: 'Conta não ativada' });
    }

    //  valida senha
    const senhaValida = await bcrypt.compare(senha, usuario.senha);

    if (!senhaValida) {
      return res.status(401).json({ error: 'Email ou senha inválidos' });
    }

    // gera token
    const token = jwt.sign({ id: usuario.id, tipo: usuario.tipo }, process.env.JWT_SECRET, {
      expiresIn: '1d',
    });

    return res.json({
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        tipo: usuario.tipo,
        ativo: usuario.ativo,
      },
    });
  } catch (err) {
    console.error(' ERRO NO LOGIN:', err);
    return res.status(500).json({ error: 'Erro no login' });
  }
});

// =========================
// 👤 PEGAR USUÁRIO LOGADO
// =========================
router.get('/me', verificarToken, async (req, res) => {
  try {
    const [usuarios] = await db.query(
      'SELECT id, nome, email, tipo, ativo FROM usuarios WHERE id = ?',
      [req.user.id],
    );

    if (!usuarios.length) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    return res.json({
      id: usuarios[0].id,
      nome: usuarios[0].nome,
      email: usuarios[0].email,
      tipo: usuarios[0].tipo,
      ativo: usuarios[0].ativo,
    });
  } catch (err) {
    console.error(' ERRO /ME:', err);
    return res.status(500).json({ error: 'Erro ao buscar usuário' });
  }
});

// =========================
//  CONFIRMAR CONTA
// =========================
router.post('/verificar-codigo', async (req, res) => {
  const { token, codigo, email } = req.body;
  const codigoNormalizado = String(codigo || '').replace(/\D/g, '');

  if (!/^\d{6}$/.test(codigoNormalizado) || (!token && !email)) {
    return res.status(400).json({ error: 'Código ou token inválido' });
  }

  try {
    const [usuarios] = token
      ? await db.query(
        'SELECT * FROM usuarios WHERE token_confirmacao = ? AND codigo_confirmacao = ?',
        [token, codigoNormalizado],
      )
      : await db.query(
        'SELECT * FROM usuarios WHERE LOWER(TRIM(email)) = LOWER(TRIM(?)) AND codigo_confirmacao = ?',
        [email, codigoNormalizado],
      );

    if (!usuarios.length) {
      return res.status(400).json({ error: 'Código ou token inválido' });
    }

    const usuario = usuarios[0];

    await db.query(
      'UPDATE usuarios SET ativo = 1, token_confirmacao = NULL, codigo_confirmacao = NULL WHERE id = ?',
      [usuario.id],
    );

    return res.json({ mensagem: 'Conta confirmada com sucesso!' });
  } catch (err) {
    console.error(' ERRO CONFIRMAÇÃO:', err);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

// =========================
//  REENVIAR CÓDIGO
// =========================
router.post('/reenviar-codigo', async (req, res) => {
  const { email } = req.body;

  try {
    const emailNormalizado = email.trim().toLowerCase();

    const [usuarios] = await db.query('SELECT * FROM usuarios WHERE email = ?', [emailNormalizado]);

    if (!usuarios.length) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const usuario = usuarios[0];

    if (usuario.ativo === 1) {
      return res.status(400).json({ error: 'Conta já ativada' });
    }

    const novoCodigo = Math.floor(100000 + Math.random() * 900000).toString();
    const novoToken = crypto.randomBytes(32).toString('hex');

    await db.query(
      'UPDATE usuarios SET codigo_confirmacao = ?, token_confirmacao = ? WHERE id = ?',
      [novoCodigo, novoToken, usuario.id],
    );

    const link = `${process.env.FRONT_URL}/#/confirmar/${novoToken}`;

    await enviarEmail(
      usuario.email,
      'Reenvio de código - DLmodas',
      `
      <div style="text-align:center">
        <a href="${link}">Confirmar conta</a>
        <h2>${novoCodigo}</h2>
      </div>
      `,
    );

    return res.json({ mensagem: 'Código reenviado com sucesso!' });
  } catch (err) {
    console.error(' ERRO REENVIO:', err);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

// =========================
//  RECUPERACAO DE SENHA
// =========================
router.post('/solicitar-recuperacao', async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const mensagemSegura = 'Se o e-mail estiver cadastrado, você receberá as instruções de recuperação.';

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.json({ mensagem: mensagemSegura });
  }

  try {
    const [usuarios] = await db.query(
      'SELECT id, email FROM usuarios WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))',
      [email],
    );

    if (!usuarios.length) {
      return res.json({ mensagem: mensagemSegura });
    }

    const usuario = usuarios[0];
    const token = crypto.randomBytes(32).toString('hex');
    const link = `${process.env.FRONT_URL.replace(/\/$/, '')}/#/redefinir-senha/${token}`;

    await db.query(
      `
      UPDATE usuarios
      SET token_redefinicao = ?, token_redefinicao_expira_em = DATE_ADD(NOW(), INTERVAL 1 HOUR)
      WHERE id = ?
      `,
      [token, usuario.id],
    );

    try {
      await enviarEmail(
        usuario.email,
        'Recuperação de senha - DLmodas',
        `
        <div style="font-family: Arial, sans-serif; padding: 20px">
          <h2>Recuperação de senha</h2>
          <p>Recebemos uma solicitação para redefinir a senha da sua conta.</p>
          <p><a href="${link}">Redefinir minha senha</a></p>
          <p>Este link expira em 1 hora. Se você não fez esta solicitação, ignore este e-mail.</p>
        </div>
        `,
      );
    } catch (err) {
      await db.query(
        'UPDATE usuarios SET token_redefinicao = NULL, token_redefinicao_expira_em = NULL WHERE id = ? AND token_redefinicao = ?',
        [usuario.id, token],
      );
      console.error('ERRO RECUPERACAO SENHA:', err?.message);
      return res.status(500).json({ erro: 'Não foi possível enviar o e-mail de recuperação.' });
    }

    return res.json({ mensagem: mensagemSegura });
  } catch (err) {
    console.error('ERRO SOLICITAR RECUPERACAO:', err);
    return res.status(500).json({ erro: 'Não foi possível enviar o e-mail de recuperação.' });
  }
});

router.post('/redefinir-senha/:token', async (req, res) => {
  const token = String(req.params.token || '').trim();
  const novaSenha = typeof req.body?.novaSenha === 'string' ? req.body.novaSenha : '';

  if (!token || novaSenha.trim().length < 8) {
    return res.status(400).json({ erro: 'Token inválido ou expirado.' });
  }

  try {
    const [usuarios] = await db.query(
      `
      SELECT id
      FROM usuarios
      WHERE token_redefinicao = ?
        AND token_redefinicao_expira_em > NOW()
      `,
      [token],
    );

    if (!usuarios.length) {
      return res.status(400).json({ erro: 'Token inválido ou expirado.' });
    }

    const novaSenhaHash = await bcrypt.hash(novaSenha, 10);
    const [updateResult] = await db.query(
      `
      UPDATE usuarios
      SET senha = ?, token_redefinicao = NULL, token_redefinicao_expira_em = NULL
      WHERE id = ?
        AND token_redefinicao = ?
        AND token_redefinicao_expira_em > NOW()
      `,
      [novaSenhaHash, usuarios[0].id, token],
    );

    if (!updateResult.affectedRows) {
      return res.status(400).json({ erro: 'Token inválido ou expirado.' });
    }

    return res.json({ mensagem: 'Senha redefinida com sucesso!' });
  } catch (err) {
    console.error('ERRO REDEFINIR SENHA:', err);
    return res.status(500).json({ erro: 'Não foi possível redefinir a senha.' });
  }
});

export default router;
