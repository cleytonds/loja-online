import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const migrationsDir = path.resolve('migrations');
const migrationNames = [
  '001_schema.sql',
  '002_produto_variacoes_ativo.sql',
  '003_password_reset.sql',
  '004_pedidos_idempotency.sql',
  '005_mercado_pago.sql',
  '006_reconciliacao_pagamentos.sql',
];

function migration(name) {
  return fs.readFileSync(path.join(migrationsDir, name), 'utf8');
}

test('cadeia de migrations é completa, ordenada e não usa comandos destrutivos', () => {
  assert.deepEqual(
    fs.readdirSync(migrationsDir).filter((name) => /^\d{3}_.*\.sql$/.test(name)).sort(),
    migrationNames,
  );

  for (const name of migrationNames) {
    const content = migration(name);
    const executableSql = content.replace(/^--.*$/gm, '');
    assert.doesNotMatch(executableSql, /\bDROP\s+(TABLE|COLUMN|DATABASE)\b/i);
    assert.doesNotMatch(executableSql, /\bTRUNCATE\b/i);
    assert.doesNotMatch(executableSql, /\bDELETE\s+FROM\b/i);
    assert.doesNotMatch(executableSql, /^\s*USE\s+[`\w-]+/im);
  }
});

test('migrations de compatibilidade consultam information_schema e DATABASE()', () => {
  for (const name of migrationNames.slice(1)) {
    const content = migration(name);
    assert.match(content, /DATABASE\(\)/i);
    assert.match(content, /information_schema/i);
    assert.match(content, /PREPARE\s+migration_statement/i);
  }

  assert.match(migration('002_produto_variacoes_ativo.sql'), /COLUMN_NAME = 'ativo'/);
  assert.match(migration('003_password_reset.sql'), /token_redefinicao_expira_em/);
  assert.match(migration('004_pedidos_idempotency.sql'), /HAVING COUNT\(\*\) > 1/);
});

test('migration Mercado Pago declara o contrato usado pelo backend', () => {
  const content = migration('005_mercado_pago.sql');
  for (const field of [
    'mp_preference_id', 'mp_checkout_url', 'mp_payment_id', 'mp_status',
    'mp_status_detail', 'pagamento_confirmado_em', 'pagamento_atualizado_em',
    'pagamento_eventos', 'evento_id', 'tipo', 'acao', 'recurso_id', 'processado',
  ]) {
    assert.match(content, new RegExp(field));
  }
  assert.match(content, /FOREIGN KEY \(pedido_id\) REFERENCES pedidos\(id\)/);
  assert.match(content, /uq_pedidos_mp_payment_id/);
  assert.match(content, /uq_pagamento_eventos_provedor_evento/);
});

test('migration de reconciliação adiciona somente metadados operacionais idempotentes', () => {
  const content = migration('006_reconciliacao_pagamentos.sql');
  for (const field of [
    'reconciliacao_status', 'reconciliacao_motivo', 'reconciliacao_em',
    'reconciliacao_resolvida_em', 'reconciliacao_resolvida_por',
  ]) {
    assert.match(content, new RegExp(field));
  }
  assert.match(content, /DEFAULT ''nenhuma''/);
  assert.match(content, /idx_pedidos_reconciliacao_pendente/);
  assert.match(content, /ON DELETE SET NULL/);
});
