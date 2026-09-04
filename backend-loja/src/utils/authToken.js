import jwt from 'jsonwebtoken';

function requireJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || String(secret).trim() === '') {
    throw new Error('JWT_SECRET nao definido no servidor');
  }
  return secret;
}

export function gerarAccessToken(usuario) {
  return jwt.sign(
    { id: Number(usuario.id), tipo: usuario.tipo },
    requireJwtSecret(),
    { expiresIn: process.env.JWT_ACCESS_TTL || '1d' },
  );
}
