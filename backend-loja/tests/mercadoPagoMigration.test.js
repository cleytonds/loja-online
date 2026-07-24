import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('migration Mercado Pago declara colunas, índices e auditoria esperados', () => {
  const sql = fs.readFileSync(path.resolve('migrations/005_mercado_pago.sql'), 'utf8');
  for (const coluna of ['mp_preference_id', 'mp_checkout_url', 'mp_payment_id', 'mp_status', 'mp_status_detail', 'pagamento_confirmado_em', 'pagamento_atualizado_em']) {
    assert.match(sql, new RegExp(`COLUMN_NAME = '${coluna}'`));
    assert.match(sql, new RegExp(`ADD COLUMN ${coluna}`));
  }
  assert.match(sql, /information_schema\.COLUMNS/);
  assert.match(sql, /PREPARE migration_statement/);
  assert.match(sql, /uq_pedidos_mp_payment_id/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS pagamento_eventos/);
  assert.match(sql, /uq_pagamento_eventos_provedor_evento/);
  assert.match(sql, /FOREIGN KEY \(pedido_id\) REFERENCES pedidos\(id\)/);
});
