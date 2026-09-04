import crypto from 'crypto';
import db from '../config/database.js';

function refreshTtlDays(env = process.env) {
  const days = Number.parseInt(env.REFRESH_TOKEN_TTL_DAYS || '30', 10);
  return Number.isInteger(days) && days > 0 ? days : 30;
}

export function refreshSessionsEnabled(env = process.env) {
  return String(env.AUTH_REFRESH_ENABLED || '').trim().toLowerCase() === 'true';
}

export function refreshReplayGraceSeconds(env = process.env) {
  const seconds = Number.parseInt(env.AUTH_REFRESH_REPLAY_GRACE_SECONDS || '10', 10);
  return Number.isInteger(seconds) && seconds >= 0 ? seconds : 10;
}

export function gerarRefreshToken() { return crypto.randomBytes(48).toString('base64url'); }
export function gerarFamilyId() { return crypto.randomBytes(32).toString('hex'); }
export function hashRefreshToken(token) { return crypto.createHash('sha256').update(token).digest('hex'); }

function expirationDate(env = process.env) {
  const expiresAt = new Date();
  expiresAt.setUTCDate(expiresAt.getUTCDate() + refreshTtlDays(env));
  return expiresAt;
}

export async function criarSessaoRefresh({ usuarioId, familyId = gerarFamilyId(), connection = db, env = process.env }) {
  const token = gerarRefreshToken();
  const tokenHash = hashRefreshToken(token);
  const expiresAt = expirationDate(env);
  const [result] = await connection.query(
    `INSERT INTO auth_sessions (usuario_id, token_hash, family_id, expires_at, last_used_at)
     VALUES (?, ?, ?, ?, NOW())`,
    [usuarioId, tokenHash, familyId, expiresAt],
  );
  return { token, tokenHash, sessionId: result.insertId, familyId, expiresAt };
}

export async function buscarSessaoPorHash(tokenHash, { connection = db, forUpdate = false } = {}) {
  const [rows] = await connection.query(
    `SELECT s.id, s.usuario_id, s.token_hash, s.family_id, s.expires_at, s.revoked_at,
            s.replaced_by_session_id, s.created_at, s.last_used_at,
            u.id AS user_id, u.nome, u.email, u.tipo, u.ativo
     FROM auth_sessions s INNER JOIN usuarios u ON u.id = s.usuario_id
     WHERE s.token_hash = ?${forUpdate ? ' FOR UPDATE' : ''}`,
    [tokenHash],
  );
  return rows[0] || null;
}

export function sessaoExpirada(sessao, now = new Date()) {
  return !sessao?.expires_at || new Date(sessao.expires_at).getTime() <= now.getTime();
}

export function sessaoRotacionadaNaJanelaDeTolerancia(sessao, now = new Date(), env = process.env) {
  if (!sessao?.revoked_at || !sessao?.replaced_by_session_id) return false;
  const rotatedAt = new Date(sessao.revoked_at).getTime();
  if (Number.isNaN(rotatedAt)) return false;
  return now.getTime() - rotatedAt <= refreshReplayGraceSeconds(env) * 1000;
}

export async function revogarSessao(sessionId, { connection = db } = {}) {
  await connection.query('UPDATE auth_sessions SET revoked_at = COALESCE(revoked_at, NOW()), last_used_at = NOW() WHERE id = ?', [sessionId]);
}

export async function revogarFamilia(familyId, { connection = db } = {}) {
  await connection.query('UPDATE auth_sessions SET revoked_at = COALESCE(revoked_at, NOW()), last_used_at = NOW() WHERE family_id = ? AND revoked_at IS NULL', [familyId]);
}

export async function revogarSessoesDoUsuario(usuarioId, { connection = db } = {}) {
  await connection.query('UPDATE auth_sessions SET revoked_at = COALESCE(revoked_at, NOW()), last_used_at = NOW() WHERE usuario_id = ? AND revoked_at IS NULL', [usuarioId]);
}

export async function rotacionarSessaoRefresh(sessao, { connection = db, env = process.env } = {}) {
  const novaSessao = await criarSessaoRefresh({ usuarioId: sessao.usuario_id, familyId: sessao.family_id, connection, env });
  const [result] = await connection.query(
    'UPDATE auth_sessions SET revoked_at = NOW(), replaced_by_session_id = ?, last_used_at = NOW() WHERE id = ? AND revoked_at IS NULL',
    [novaSessao.sessionId, sessao.id],
  );
  if (result.affectedRows !== 1) throw new Error('AUTH_SESSION_ROTATION_CONFLICT');
  return novaSessao;
}
