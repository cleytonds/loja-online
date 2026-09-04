import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';

import db from '../src/config/database.js';
import authRoutes from '../src/routes/authRoutes.js';

async function request(app, path, options = {}) {
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, options);
    return { response, body: await response.json() };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/auth', authRoutes);
  return app;
}

function usuario() {
  return { id: 7, nome: 'Cliente', email: 'cliente@test.local', tipo: 'cliente', ativo: 1 };
}

test('refresh rotaciona, emite cookie HttpOnly e replay revoga a familia', async () => {
  const previousEnabled = process.env.AUTH_REFRESH_ENABLED;
  const previousSecret = process.env.JWT_SECRET;
  const previousGrace = process.env.AUTH_REFRESH_REPLAY_GRACE_SECONDS;
  const originalGetConnection = db.getConnection;
  process.env.AUTH_REFRESH_ENABLED = 'true';
  process.env.JWT_SECRET = 'jwt-test-secret';
  process.env.AUTH_REFRESH_REPLAY_GRACE_SECONDS = '10';
  let rotated = false;
  let rotatedAt = null;
  const calls = [];
  db.getConnection = async () => ({
    beginTransaction: async () => calls.push('begin'),
    commit: async () => calls.push('commit'),
    rollback: async () => calls.push('rollback'),
    release: () => calls.push('release'),
    query: async (sql) => {
      calls.push(sql);
      if (sql.startsWith('SELECT s.id')) {
        return [[{
          id: 1,
          usuario_id: 7,
          family_id: 'a'.repeat(64),
          expires_at: new Date(Date.now() + 60000),
          revoked_at: rotatedAt,
          replaced_by_session_id: rotated ? 2 : null,
          ...usuario(),
        }]];
      }
      if (sql.startsWith('INSERT INTO auth_sessions')) return [{ insertId: 2 }];
      if (sql.includes('replaced_by_session_id')) {
        rotated = true;
        rotatedAt = new Date();
        return [{ affectedRows: 1 }];
      }
      if (sql.includes('WHERE family_id')) return [{ affectedRows: 1 }];
      throw new Error(`Query inesperada: ${sql}`);
    },
  });

  try {
    const app = createApp();
    const first = await request(app, '/auth/refresh', { method: 'POST', headers: { Cookie: 'dl_refresh=token-antigo' } });
    assert.equal(first.response.status, 200);
    assert.equal(typeof first.body.token, 'string');
    assert.equal(first.body.usuario.id, 7);
    assert.match(first.response.headers.get('set-cookie'), /HttpOnly/i);
    assert.doesNotMatch(JSON.stringify(first.body), /token-antigo/);

    const conflict = await request(app, '/auth/refresh', { method: 'POST', headers: { Cookie: 'dl_refresh=token-antigo' } });
    assert.equal(conflict.response.status, 409);
    assert.deepEqual(conflict.body, { error: 'Sessao em atualizacao', code: 'AUTH_REFRESH_CONFLICT' });
    assert.equal(conflict.response.headers.get('set-cookie'), null);
    assert.equal(calls.filter((sql) => typeof sql === 'string' && sql.includes('WHERE family_id')).length, 0);

    rotatedAt = new Date(Date.now() - 11000);
    const replay = await request(app, '/auth/refresh', { method: 'POST', headers: { Cookie: 'dl_refresh=token-antigo' } });
    assert.equal(replay.response.status, 401);
    assert.deepEqual(replay.body, { error: 'Sessao invalida ou expirada' });
    assert.ok(calls.some((sql) => typeof sql === 'string' && sql.includes('WHERE family_id')));
  } finally {
    db.getConnection = originalGetConnection;
    process.env.AUTH_REFRESH_ENABLED = previousEnabled;
    process.env.JWT_SECRET = previousSecret;
    process.env.AUTH_REFRESH_REPLAY_GRACE_SECONDS = previousGrace;
  }
});

test('duas requisicoes concorrentes preservam a nova sessao durante a janela de tolerancia', async () => {
  const previousEnabled = process.env.AUTH_REFRESH_ENABLED;
  const previousSecret = process.env.JWT_SECRET;
  const previousGrace = process.env.AUTH_REFRESH_REPLAY_GRACE_SECONDS;
  const originalGetConnection = db.getConnection;
  process.env.AUTH_REFRESH_ENABLED = 'true';
  process.env.JWT_SECRET = 'jwt-test-secret';
  process.env.AUTH_REFRESH_REPLAY_GRACE_SECONDS = '10';
  let connectionId = 0;
  let rotated = false;
  let revogarFamiliaCalls = 0;
  let firstSelectReached;
  let secondSelectStarted;
  let releaseLock;
  const firstSelected = new Promise((resolve) => { firstSelectReached = resolve; });
  const secondSelected = new Promise((resolve) => { secondSelectStarted = resolve; });
  const lockReleased = new Promise((resolve) => { releaseLock = resolve; });
  db.getConnection = async () => {
    const id = ++connectionId;
    return {
      beginTransaction: async () => {},
      commit: async () => {
        if (id === 1) {
          await secondSelected;
          releaseLock();
        }
      },
      rollback: async () => {},
      release: () => {},
      query: async (sql) => {
        if (sql.startsWith('SELECT s.id')) {
          if (id === 1) {
            firstSelectReached();
            return [[{
              id: 1,
              usuario_id: 7,
              family_id: 'a'.repeat(64),
              expires_at: new Date(Date.now() + 60000),
              revoked_at: null,
              replaced_by_session_id: null,
              ...usuario(),
            }]];
          }
          secondSelectStarted();
          await lockReleased;
          return [[{
            id: 1,
            usuario_id: 7,
            family_id: 'a'.repeat(64),
            expires_at: new Date(Date.now() + 60000),
            revoked_at: new Date(),
            replaced_by_session_id: 2,
            ...usuario(),
          }]];
        }
        if (sql.startsWith('INSERT INTO auth_sessions')) return [{ insertId: 2 }];
        if (sql.includes('replaced_by_session_id')) {
          rotated = true;
          return [{ affectedRows: 1 }];
        }
        if (sql.includes('WHERE family_id')) {
          revogarFamiliaCalls += 1;
          return [{ affectedRows: 1 }];
        }
        throw new Error(`Query inesperada: ${sql}`);
      },
    };
  };

  const app = createApp();
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  try {
    const url = `http://127.0.0.1:${server.address().port}/auth/refresh`;
    const first = fetch(url, { method: 'POST', headers: { Cookie: 'dl_refresh=token-antigo' } });
    await firstSelected;
    const second = fetch(url, { method: 'POST', headers: { Cookie: 'dl_refresh=token-antigo' } });
    const [firstResponse, secondResponse] = await Promise.all([first, second]);
    assert.equal(firstResponse.status, 200);
    assert.equal(secondResponse.status, 409);
    assert.equal(rotated, true);
    assert.equal(revogarFamiliaCalls, 0);
    assert.equal(secondResponse.headers.get('set-cookie'), null);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    db.getConnection = originalGetConnection;
    process.env.AUTH_REFRESH_ENABLED = previousEnabled;
    process.env.JWT_SECRET = previousSecret;
    process.env.AUTH_REFRESH_REPLAY_GRACE_SECONDS = previousGrace;
  }
});

test('logout e upgrade sao idempotentes sem banco real', async () => {
  const previousEnabled = process.env.AUTH_REFRESH_ENABLED;
  const previousSecret = process.env.JWT_SECRET;
  const originalQuery = db.query;
  const originalGetConnection = db.getConnection;
  process.env.AUTH_REFRESH_ENABLED = 'true';
  process.env.JWT_SECRET = 'jwt-test-secret';
  let created = 0;
  db.query = async (sql) => {
    if (sql.startsWith('SELECT s.id')) return [[{ id: 1 }]];
    if (sql.startsWith('UPDATE auth_sessions')) return [{ affectedRows: 1 }];
    if (sql.startsWith('SELECT id, nome, email, tipo, ativo')) return [[usuario()]];
    throw new Error(`Query inesperada: ${sql}`);
  };
  db.getConnection = async () => ({
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => {},
    release: () => {},
    query: async (sql) => {
      if (sql.startsWith('SELECT id FROM usuarios')) return [[{ id: 7 }]];
      if (sql.startsWith('INSERT INTO auth_sessions')) return [{ insertId: ++created }];
      throw new Error(`Query inesperada: ${sql}`);
    },
  });

  try {
    const app = createApp();
    const logout = await request(app, '/auth/logout', { method: 'POST' });
    assert.equal(logout.response.status, 200);
    assert.match(logout.response.headers.get('set-cookie'), /Expires=Thu, 01 Jan 1970/i);

    const accessToken = jwt.sign({ id: 7, tipo: 'cliente' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const upgrade = await request(app, '/auth/session/upgrade', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    assert.equal(upgrade.response.status, 200);
    assert.equal(upgrade.body.usuario.id, 7);
    assert.equal(created, 1);
  } finally {
    db.query = originalQuery;
    db.getConnection = originalGetConnection;
    process.env.AUTH_REFRESH_ENABLED = previousEnabled;
    process.env.JWT_SECRET = previousSecret;
  }
});

test('erro depois do commit nao executa rollback e sempre libera conexao', async () => {
  const previousEnabled = process.env.AUTH_REFRESH_ENABLED;
  const previousSecret = process.env.JWT_SECRET;
  const originalGetConnection = db.getConnection;
  process.env.AUTH_REFRESH_ENABLED = 'true';
  process.env.JWT_SECRET = 'jwt-test-secret';
  let commits = 0;
  let rollbacks = 0;
  let releases = 0;
  db.getConnection = async () => ({
    beginTransaction: async () => {},
    commit: async () => { commits += 1; },
    rollback: async () => { rollbacks += 1; },
    release: () => { releases += 1; },
    query: async (sql) => {
      if (sql.startsWith('SELECT s.id')) return [[{
        id: 1,
        usuario_id: 7,
        family_id: 'a'.repeat(64),
        expires_at: new Date(Date.now() + 60000),
        revoked_at: null,
        replaced_by_session_id: null,
        ...usuario(),
      }]];
      if (sql.startsWith('INSERT INTO auth_sessions')) return [{ insertId: 2 }];
      if (sql.includes('replaced_by_session_id')) return [{ affectedRows: 1 }];
      throw new Error(`Query inesperada: ${sql}`);
    },
  });

  try {
    const app = express();
    app.use((req, res, next) => {
      res.cookie = () => { throw new Error('cookie failure'); };
      next();
    });
    app.use('/auth', authRoutes);
    const result = await request(app, '/auth/refresh', { method: 'POST', headers: { Cookie: 'dl_refresh=token-antigo' } });
    assert.equal(result.response.status, 500);
    assert.equal(commits, 1);
    assert.equal(rollbacks, 0);
    assert.equal(releases, 1);
  } finally {
    db.getConnection = originalGetConnection;
    process.env.AUTH_REFRESH_ENABLED = previousEnabled;
    process.env.JWT_SECRET = previousSecret;
  }
});
