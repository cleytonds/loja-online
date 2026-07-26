-- Reconciliação operacional para pagamentos Mercado Pago aprovados após expires_at.
-- Esta migration é idempotente: pode ser executada após a 005 em MySQL e MariaDB.
-- Não altera status, estoque ou pedidos existentes; o DEFAULT mantém todos em "nenhuma".

SET @database_name := DATABASE();

SET @has_reconciliacao_status := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @database_name AND TABLE_NAME = 'pedidos'
    AND COLUMN_NAME = 'reconciliacao_status'
);
SET @migration_sql := IF(
  @has_reconciliacao_status = 0,
  'ALTER TABLE pedidos ADD COLUMN reconciliacao_status VARCHAR(40) NOT NULL DEFAULT ''nenhuma'' AFTER pagamento_atualizado_em',
  'SELECT 1'
);
PREPARE migration_statement FROM @migration_sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @has_reconciliacao_motivo := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @database_name AND TABLE_NAME = 'pedidos'
    AND COLUMN_NAME = 'reconciliacao_motivo'
);
SET @migration_sql := IF(
  @has_reconciliacao_motivo = 0,
  'ALTER TABLE pedidos ADD COLUMN reconciliacao_motivo VARCHAR(255) NULL AFTER reconciliacao_status',
  'SELECT 1'
);
PREPARE migration_statement FROM @migration_sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @has_reconciliacao_em := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @database_name AND TABLE_NAME = 'pedidos'
    AND COLUMN_NAME = 'reconciliacao_em'
);
SET @migration_sql := IF(
  @has_reconciliacao_em = 0,
  'ALTER TABLE pedidos ADD COLUMN reconciliacao_em DATETIME NULL AFTER reconciliacao_motivo',
  'SELECT 1'
);
PREPARE migration_statement FROM @migration_sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @has_reconciliacao_resolvida_em := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @database_name AND TABLE_NAME = 'pedidos'
    AND COLUMN_NAME = 'reconciliacao_resolvida_em'
);
SET @migration_sql := IF(
  @has_reconciliacao_resolvida_em = 0,
  'ALTER TABLE pedidos ADD COLUMN reconciliacao_resolvida_em DATETIME NULL AFTER reconciliacao_em',
  'SELECT 1'
);
PREPARE migration_statement FROM @migration_sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @has_reconciliacao_resolvida_por := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @database_name AND TABLE_NAME = 'pedidos'
    AND COLUMN_NAME = 'reconciliacao_resolvida_por'
);
SET @migration_sql := IF(
  @has_reconciliacao_resolvida_por = 0,
  'ALTER TABLE pedidos ADD COLUMN reconciliacao_resolvida_por INT NULL AFTER reconciliacao_resolvida_em',
  'SELECT 1'
);
PREPARE migration_statement FROM @migration_sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @has_pending_index := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @database_name AND TABLE_NAME = 'pedidos'
    AND INDEX_NAME = 'idx_pedidos_reconciliacao_pendente'
);
SET @migration_sql := IF(
  @has_pending_index = 0,
  'CREATE INDEX idx_pedidos_reconciliacao_pendente ON pedidos (reconciliacao_status, reconciliacao_em)',
  'SELECT 1'
);
PREPARE migration_statement FROM @migration_sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @has_resolved_by_fk := (
  SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = @database_name AND TABLE_NAME = 'pedidos'
    AND COLUMN_NAME = 'reconciliacao_resolvida_por'
    AND REFERENCED_TABLE_NAME = 'usuarios'
);
SET @migration_sql := IF(
  @has_resolved_by_fk = 0,
  'ALTER TABLE pedidos ADD CONSTRAINT fk_pedidos_reconciliacao_resolvida_por FOREIGN KEY (reconciliacao_resolvida_por) REFERENCES usuarios(id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE migration_statement FROM @migration_sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;
