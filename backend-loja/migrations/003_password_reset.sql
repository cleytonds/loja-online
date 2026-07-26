-- Compatibilidade para bases antigas. Não substitui tokens existentes.
-- A ausência de usuarios gera erro nativo ao tentar o primeiro ALTER; aplique 001 antes.
SET @schema_name = DATABASE();
SELECT COUNT(*) INTO @has_usuarios_table
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'usuarios';
SELECT IF(@has_usuarios_table = 1, '003: tabela base encontrada', 'ERRO 003: usuarios ausente; aplique 001_schema.sql antes') AS migration_notice;

SELECT COUNT(*) INTO @has_reset_token
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'usuarios'
  AND COLUMN_NAME = 'token_redefinicao';
SET @sql = IF(
  @has_reset_token = 0,
  'ALTER TABLE usuarios ADD COLUMN token_redefinicao VARCHAR(64) NULL',
  'SELECT ''003: coluna usuarios.token_redefinicao já existe'' AS migration_notice'
);
PREPARE migration_statement FROM @sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SELECT COUNT(*) INTO @has_reset_expiration
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'usuarios'
  AND COLUMN_NAME = 'token_redefinicao_expira_em';
SET @sql = IF(
  @has_reset_expiration = 0,
  'ALTER TABLE usuarios ADD COLUMN token_redefinicao_expira_em DATETIME NULL',
  'SELECT ''003: coluna usuarios.token_redefinicao_expira_em já existe'' AS migration_notice'
);
PREPARE migration_statement FROM @sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SELECT COUNT(*) INTO @has_reset_index
FROM (
  SELECT INDEX_NAME
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'usuarios'
  GROUP BY INDEX_NAME
  HAVING GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX SEPARATOR ',') = 'token_redefinicao'
) AS matching_indexes;
SET @sql = IF(
  @has_reset_index = 0,
  'CREATE INDEX idx_usuarios_token_redefinicao ON usuarios (token_redefinicao)',
  'SELECT ''003: índice de token_redefinicao já existe'' AS migration_notice'
);
PREPARE migration_statement FROM @sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;
