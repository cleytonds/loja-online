-- Preço promocional opcional por variação.
-- Idempotente para MySQL/MariaDB: não altera preços, estoque ou pedidos existentes.

SET @schema_name = DATABASE();

SELECT COUNT(*) INTO @has_variations_table
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = @schema_name
  AND TABLE_NAME = 'produto_variacoes';

SELECT IF(
  @has_variations_table = 1,
  '008: tabela produto_variacoes encontrada',
  'ERRO 008: produto_variacoes ausente; aplique 001_schema.sql antes'
) AS migration_notice;

SELECT COUNT(*) INTO @has_promotional_price
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = @schema_name
  AND TABLE_NAME = 'produto_variacoes'
  AND COLUMN_NAME = 'preco_promocional';

SET @sql = IF(
  @has_variations_table = 1 AND @has_promotional_price = 0,
  'ALTER TABLE produto_variacoes ADD COLUMN preco_promocional DECIMAL(10,2) NULL AFTER preco',
  IF(
    @has_promotional_price = 1,
    'SELECT ''008: coluna preco_promocional já existe'' AS migration_notice',
    'SELECT ''008: tabela base ausente; nenhuma alteração executada'' AS migration_notice'
  )
);

PREPARE migration_statement FROM @sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;
