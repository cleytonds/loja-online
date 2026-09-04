import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';

import { gerarAccessToken } from '../src/utils/authToken.js';
import { lerRefreshCookie, refreshCookieOptions } from '../src/utils/authCookie.js';
import {
  criarSessaoRefresh,
  gerarRefreshToken,
  hashRefreshToken,
  refreshSessionsEnabled,
  rotacionarSessaoRefresh,
  sessaoExpirada,
  sessaoRotacionadaNaJanelaDeTolerancia,
} from '../src/services/authSessionService.js';

test('access token preserva os claims id e tipo e respeita o TTL configurado', () => {
  const previousSecret = process.env.JWT_SECRET;
  const previousTtl = process.env.JWT_ACCESS_TTL;
  process.env.JWT_SECRET = 'jwt-test-secret';
  process.env.JWT_ACCESS_TTL = '1h';
  try {
    const token = gerarAccessToken({ id: 7, tipo: 'cliente' });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    assert.deepEqual({ id: payload.id, tipo: payload.tipo }, { id: 7, tipo: 'cliente' });
    assert.ok(payload.exp - payload.iat >= 3599);
  } finally {
    process.env.JWT_SECRET = previousSecret;
    process.env.JWT_ACCESS_TTL = previousTtl;
  }
});

test('feature flag de refresh permanece desativada por padrao', () => {
  assert.equal(refreshSessionsEnabled({}), false);
  assert.equal(refreshSessionsEnabled({ AUTH_REFRESH_ENABLED: 'true' }), true);
});

test('cookie de refresh e HttpOnly, so usa Secure em producao e parser e tolerante', () => {
  assert.deepEqual(
    refreshCookieOptions({ NODE_ENV: 'development', REFRESH_TOKEN_TTL_DAYS: '30' }),
    { httpOnly: true, secure: false, sameSite: 'lax', path: '/', maxAge: 2592000000 },
  );
  assert.equal(refreshCookieOptions({ NODE_ENV: 'production' }).secure, true);
  assert.equal(lerRefreshCookie('other=x; dl_refresh=valor%20seguro'), 'valor seguro');
  assert.equal(lerRefreshCookie('dl_refresh=%E0%A4%A'), null);
  assert.equal(lerRefreshCookie(undefined), null);
});

test('sessao armazena somente hash SHA-256 e rotacao preserva a familia', async () => {
  const queries = [];
  let nextId = 10;
  const connection = {
    async query(sql, values) {
      queries.push({ sql, values });
      if (sql.startsWith('INSERT INTO auth_sessions')) return [{ insertId: nextId++ }];
      if (sql.startsWith('UPDATE auth_sessions')) return [{ affectedRows: 1 }];
      throw new Error(`Query inesperada: ${sql}`);
    },
  };
  const env = { REFRESH_TOKEN_TTL_DAYS: '30' };
  const session = await criarSessaoRefresh({ usuarioId: 7, familyId: 'a'.repeat(64), connection, env });
  assert.equal(session.tokenHash, hashRefreshToken(session.token));
  assert.equal(session.tokenHash.length, 64);
  assert.notEqual(queries[0].values[1], session.token);

  const rotated = await rotacionarSessaoRefresh(
    { id: session.sessionId, usuario_id: 7, family_id: session.familyId },
    { connection, env },
  );
  assert.equal(rotated.familyId, session.familyId);
  assert.notEqual(rotated.token, session.token);
  assert.equal(queries.at(-1).values[0], rotated.sessionId);
  assert.equal(queries.at(-1).values[1], session.sessionId);
});

test('refresh token e aleatorio e sessoes expiradas sao identificadas', () => {
  assert.notEqual(gerarRefreshToken(), gerarRefreshToken());
  assert.equal(sessaoExpirada({ expires_at: new Date(Date.now() - 1) }), true);
  assert.equal(sessaoExpirada({ expires_at: new Date(Date.now() + 60000) }), false);
});

test('sessao rotacionada so entra em tolerancia dentro da janela configurada', () => {
  const now = new Date('2026-01-01T00:00:10.000Z');
  const sessao = { revoked_at: new Date('2026-01-01T00:00:01.000Z'), replaced_by_session_id: 2 };
  assert.equal(sessaoRotacionadaNaJanelaDeTolerancia(sessao, now, { AUTH_REFRESH_REPLAY_GRACE_SECONDS: '10' }), true);
  assert.equal(sessaoRotacionadaNaJanelaDeTolerancia(sessao, now, { AUTH_REFRESH_REPLAY_GRACE_SECONDS: '5' }), false);
  assert.equal(sessaoRotacionadaNaJanelaDeTolerancia({ revoked_at: sessao.revoked_at }, now), false);
});
