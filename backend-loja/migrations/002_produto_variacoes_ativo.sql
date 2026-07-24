-- Compatibilidade para bases antigas. DATABASE() evita fixar o nome do banco.
-- Se produto_variacoes não existir, o ALTER abaixo falhará com a mensagem nativa
-- clara; aplique 001_schema.sql antes desta migration.
SET @schema_name = DATABASE();
SELECT COUNT(*) INTO @has_produto_variacoes_table
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'produto_variacoes';
SELECT IF(@has_produto_variacoes_table = 1, '002: tabela base encontrada', 'ERRO 002: produto_variacoes ausente; aplique 001_schema.sql antes') AS migration_notice;

SELECT COUNT(*) INTO @has_ativo
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = @schema_name
  AND TABLE_NAME = 'produto_variacoes'
  AND COLUMN_NAME = 'ativo';

SET @sql = IF(
  @has_ativo = 0,
  'ALTER TABLE produto_variacoes ADD COLUMN ativo TINYINT(1) NOT NULL DEFAULT 1 AFTER estoque',
  'SELECT ''002: coluna produto_variacoes.ativo já existe'' AS migration_notice'
);
PREPARE migration_statement FROM @sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SELECT COUNT(*) INTO @has_produto_ativo_index
FROM (
  SELECT INDEX_NAME
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'produto_variacoes'
  GROUP BY INDEX_NAME
  HAVING GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX SEPARATOR ',') = 'produto_id,ativo'
) AS matching_indexes;

SET @sql = IF(
  @has_produto_ativo_index = 0,
  'CREATE INDEX idx_produto_variacoes_produto_ativo ON produto_variacoes (produto_id, ativo)',
  'SELECT ''002: índice para produto_id, ativo já existe'' AS migration_notice'
);
PREPARE migration_statement FROM @sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;
