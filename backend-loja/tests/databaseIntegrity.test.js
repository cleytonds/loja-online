import test from 'node:test';
import assert from 'node:assert/strict';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

function createPool() {
  return mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT),
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
  });
}

test('schema mantém constraints e índices necessários para pedidos e estoque', async () => {
  const pool = createPool();

  try {
    const [rows] = await pool.query('SHOW CREATE TABLE pedidos');
    const ddl = rows[0]['Create Table'];

    assert.match(ddl, /CHECK \(`total` >= 0\)/);
    assert.match(ddl, /idx_pedidos_status_created_at/);
    assert.match(ddl, /idx_pedidos_usuario_status/);

    const [variacoes] = await pool.query('SHOW CREATE TABLE produto_variacoes');
    const variacoesDdl = variacoes[0]['Create Table'];
    assert.match(variacoesDdl, /CHECK \(`estoque` >= 0\)/);

    const [itens] = await pool.query('SHOW CREATE TABLE pedido_itens');
    const itensDdl = itens[0]['Create Table'];
    assert.match(itensDdl, /CHECK \(`quantidade` > 0\)/);

    const [usuarios] = await pool.query('SHOW CREATE TABLE usuarios');
    const usuariosDdl = usuarios[0]['Create Table'];
    assert.match(usuariosDdl, /token_redefinicao/);
    assert.match(usuariosDdl, /token_redefinicao_expira_em/);
    assert.match(usuariosDdl, /idx_usuarios_token_redefinicao/);
  } finally {
    await pool.end();
  }
});
