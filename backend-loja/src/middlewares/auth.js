import jwt from 'jsonwebtoken';
import db from '../config/database.js';

function requireJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || String(secret).trim() === '') {
    throw new Error('JWT_SECRET não definido no servidor');
  }
  return secret;
}

export function validarPayloadToken(payload) {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  if (!Number.isInteger(payload.id) || payload.id <= 0) {
    return false;
  }

  if (!['admin', 'cliente'].includes(payload.tipo)) {
    return false;
  }

  return true;
}

export function montarUsuarioAutenticado(payload, usuarioDb) {
  if (!validarPayloadToken(payload)) {
    return null;
  }

  if (!usuarioDb || Number(usuarioDb.id) !== Number(payload.id)) {
    return null;
  }

  if (usuarioDb.ativo !== 1) {
    return null;
  }

  if (usuarioDb.tipo !== payload.tipo) {
    return null;
  }

  return {
    id: Number(usuarioDb.id),
    nome: usuarioDb.nome,
    email: usuarioDb.email,
    tipo: usuarioDb.tipo,
    ativo: Number(usuarioDb.ativo),
  };
}

export async function verificarToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  const partes = authHeader.split(' ');

  if (partes.length !== 2) {
    return res.status(401).json({ error: 'Token mal formatado' });
  }

  const [bearer, token] = partes;

  if (bearer !== 'Bearer') {
    return res.status(401).json({ error: 'Token inválido' });
  }

  try {
    const decoded = jwt.verify(token, requireJwtSecret());

    if (!validarPayloadToken(decoded)) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    const [rows] = await db.query('SELECT id, nome, email, tipo, ativo FROM usuarios WHERE id = ?', [decoded.id]);

    if (!rows.length) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    const usuarioAutenticado = montarUsuarioAutenticado(decoded, rows[0]);

    if (!usuarioAutenticado) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    req.user = usuarioAutenticado;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}
