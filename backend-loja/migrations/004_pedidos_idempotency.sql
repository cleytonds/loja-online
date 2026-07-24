-- Idempotência do checkout. Não altera nem remove dados existentes.
-- Verifique duplicidades antes de executar em base antiga; o índice único será
-- recusado pelo banco se esta consulta retornar linhas.
SELECT idempotency_key, COUNT(*) AS quantidade
FROM pedidos
WHERE idempotency_key IS NOT NULL
GROUP BY idempotency_key
HAVING COUNT(*) > 1;

SET @schema_name = DATABASE();
SELECT COUNT(*) INTO @has_pedidos_table
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'pedidos';
SELECT IF(@has_pedidos_table = 1, '004: tabela base encontrada', 'ERRO 004: pedidos ausente; aplique 001_schema.sql antes') AS migration_notice;
SELECT COUNT(*) INTO @has_idempotency_key
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'pedidos'
  AND COLUMN_NAME = 'idempotency_key';
SET @sql = IF(
  @has_idempotency_key = 0,
  'ALTER TABLE pedidos ADD COLUMN idempotency_key VARCHAR(100) NULL',
  'SELECT ''004: coluna pedidos.idempotency_key já existe'' AS migration_notice'
);
PREPARE migration_statement FROM @sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SELECT COUNT(*) INTO @has_unique_idempotency
FROM (
  SELECT INDEX_NAME
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'pedidos' AND NON_UNIQUE = 0
  GROUP BY INDEX_NAME
  HAVING GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX SEPARATOR ',') = 'idempotency_key'
) AS matching_unique_indexes;
SET @sql = IF(
  @has_unique_idempotency = 0,
  'ALTER TABLE pedidos ADD UNIQUE KEY unique_pedidos_idempotency_key (idempotency_key)',
  'SELECT ''004: índice único de idempotency_key já existe'' AS migration_notice'
);
PREPARE migration_statement FROM @sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;
