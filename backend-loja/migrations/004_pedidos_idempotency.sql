-- Idempotência do checkout. Não altera nem remove dados existentes.
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

-- A coluna precisa existir antes da verificação de duplicidades, inclusive em
-- banco novo. Registros existentes não são alterados.
SELECT idempotency_key, COUNT(*) AS quantidade
FROM pedidos
WHERE idempotency_key IS NOT NULL
GROUP BY idempotency_key
HAVING COUNT(*) > 1;

SELECT COUNT(*) INTO @idempotency_duplicate_groups
FROM (
  SELECT idempotency_key
  FROM pedidos
  WHERE idempotency_key IS NOT NULL
  GROUP BY idempotency_key
  HAVING COUNT(*) > 1
) AS duplicate_idempotency_keys;

SELECT COUNT(*) INTO @has_unique_idempotency
FROM (
  SELECT INDEX_NAME
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'pedidos' AND NON_UNIQUE = 0
  GROUP BY INDEX_NAME
  HAVING GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX SEPARATOR ',') = 'idempotency_key'
) AS matching_unique_indexes;
SET @sql = IF(
  @has_unique_idempotency = 0 AND @idempotency_duplicate_groups = 0,
  'ALTER TABLE pedidos ADD UNIQUE KEY unique_pedidos_idempotency_key (idempotency_key)',
  IF(
    @has_unique_idempotency = 1,
    'SELECT ''004: índice único de idempotency_key já existe'' AS migration_notice',
    'SELECT ''004: duplicidades encontradas; índice único não foi criado'' AS migration_notice'
  )
);
PREPARE migration_statement FROM @sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;
