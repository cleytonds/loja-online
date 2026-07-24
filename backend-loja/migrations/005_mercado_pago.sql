-- Mercado Pago. Compatível com MySQL/MariaDB por usar information_schema e
-- SQL dinâmico, sem depender de ADD/INDEX IF NOT EXISTS.
-- A ausência de pedidos produz erro nativo claro: aplique 001 e 004 antes.

-- Não remova nem altere duplicidades automaticamente. Se qualquer consulta
-- abaixo retornar linhas, saneie operacionalmente antes de criar o índice único.
SELECT mp_payment_id, COUNT(*) AS quantidade
FROM pedidos
WHERE mp_payment_id IS NOT NULL
GROUP BY mp_payment_id
HAVING COUNT(*) > 1;

SET @schema_name = DATABASE();
SELECT COUNT(*) INTO @has_pedidos_table
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'pedidos';
SELECT IF(@has_pedidos_table = 1, '005: tabela base encontrada', 'ERRO 005: pedidos ausente; aplique 001_schema.sql antes') AS migration_notice;

SELECT COUNT(*) INTO @has_mp_preference_id FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'pedidos' AND COLUMN_NAME = 'mp_preference_id';
SET @sql = IF(@has_mp_preference_id = 0, 'ALTER TABLE pedidos ADD COLUMN mp_preference_id VARCHAR(255) NULL', 'SELECT ''005: mp_preference_id já existe'' AS migration_notice');
PREPARE migration_statement FROM @sql; EXECUTE migration_statement; DEALLOCATE PREPARE migration_statement;

SELECT COUNT(*) INTO @has_mp_checkout_url FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'pedidos' AND COLUMN_NAME = 'mp_checkout_url';
SET @sql = IF(@has_mp_checkout_url = 0, 'ALTER TABLE pedidos ADD COLUMN mp_checkout_url TEXT NULL', 'SELECT ''005: mp_checkout_url já existe'' AS migration_notice');
PREPARE migration_statement FROM @sql; EXECUTE migration_statement; DEALLOCATE PREPARE migration_statement;

SELECT COUNT(*) INTO @has_mp_payment_id FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'pedidos' AND COLUMN_NAME = 'mp_payment_id';
SET @sql = IF(@has_mp_payment_id = 0, 'ALTER TABLE pedidos ADD COLUMN mp_payment_id VARCHAR(64) NULL', 'SELECT ''005: mp_payment_id já existe'' AS migration_notice');
PREPARE migration_statement FROM @sql; EXECUTE migration_statement; DEALLOCATE PREPARE migration_statement;

SELECT COUNT(*) INTO @has_mp_status FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'pedidos' AND COLUMN_NAME = 'mp_status';
SET @sql = IF(@has_mp_status = 0, 'ALTER TABLE pedidos ADD COLUMN mp_status VARCHAR(64) NULL', 'SELECT ''005: mp_status já existe'' AS migration_notice');
PREPARE migration_statement FROM @sql; EXECUTE migration_statement; DEALLOCATE PREPARE migration_statement;

SELECT COUNT(*) INTO @has_mp_status_detail FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'pedidos' AND COLUMN_NAME = 'mp_status_detail';
SET @sql = IF(@has_mp_status_detail = 0, 'ALTER TABLE pedidos ADD COLUMN mp_status_detail VARCHAR(128) NULL', 'SELECT ''005: mp_status_detail já existe'' AS migration_notice');
PREPARE migration_statement FROM @sql; EXECUTE migration_statement; DEALLOCATE PREPARE migration_statement;

SELECT COUNT(*) INTO @has_confirmed_at FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'pedidos' AND COLUMN_NAME = 'pagamento_confirmado_em';
SET @sql = IF(@has_confirmed_at = 0, 'ALTER TABLE pedidos ADD COLUMN pagamento_confirmado_em DATETIME NULL', 'SELECT ''005: pagamento_confirmado_em já existe'' AS migration_notice');
PREPARE migration_statement FROM @sql; EXECUTE migration_statement; DEALLOCATE PREPARE migration_statement;

SELECT COUNT(*) INTO @has_updated_at FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'pedidos' AND COLUMN_NAME = 'pagamento_atualizado_em';
SET @sql = IF(@has_updated_at = 0, 'ALTER TABLE pedidos ADD COLUMN pagamento_atualizado_em DATETIME NULL', 'SELECT ''005: pagamento_atualizado_em já existe'' AS migration_notice');
PREPARE migration_statement FROM @sql; EXECUTE migration_statement; DEALLOCATE PREPARE migration_statement;

SELECT COUNT(*) INTO @has_unique_payment
FROM (SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'pedidos' AND NON_UNIQUE = 0 GROUP BY INDEX_NAME HAVING GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX SEPARATOR ',') = 'mp_payment_id') AS matching_unique_indexes;
SET @sql = IF(@has_unique_payment = 0, 'ALTER TABLE pedidos ADD UNIQUE KEY uq_pedidos_mp_payment_id (mp_payment_id)', 'SELECT ''005: unique de mp_payment_id já existe'' AS migration_notice');
PREPARE migration_statement FROM @sql; EXECUTE migration_statement; DEALLOCATE PREPARE migration_statement;

SELECT COUNT(*) INTO @has_preference_index
FROM (SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'pedidos' GROUP BY INDEX_NAME HAVING GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX SEPARATOR ',') = 'mp_preference_id') AS matching_indexes;
SET @sql = IF(@has_preference_index = 0, 'CREATE INDEX idx_pedidos_mp_preference_id ON pedidos (mp_preference_id)', 'SELECT ''005: índice de mp_preference_id já existe'' AS migration_notice');
PREPARE migration_statement FROM @sql; EXECUTE migration_statement; DEALLOCATE PREPARE migration_statement;

SELECT COUNT(*) INTO @has_status_index
FROM (SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'pedidos' GROUP BY INDEX_NAME HAVING GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX SEPARATOR ',') = 'mp_status') AS matching_indexes;
SET @sql = IF(@has_status_index = 0, 'CREATE INDEX idx_pedidos_mp_status ON pedidos (mp_status)', 'SELECT ''005: índice de mp_status já existe'' AS migration_notice');
PREPARE migration_statement FROM @sql; EXECUTE migration_statement; DEALLOCATE PREPARE migration_statement;

CREATE TABLE IF NOT EXISTS pagamento_eventos (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  provedor VARCHAR(50) NOT NULL,
  evento_id VARCHAR(255) NOT NULL,
  tipo VARCHAR(80) NOT NULL,
  acao VARCHAR(120) NULL,
  recurso_id VARCHAR(64) NOT NULL,
  payload JSON NULL,
  pedido_id INT NULL,
  processado TINYINT(1) NOT NULL DEFAULT 0,
  erro VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processado_em DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_pagamento_eventos_provedor_evento (provedor, evento_id),
  KEY idx_pagamento_eventos_pedido_id (pedido_id),
  KEY idx_pagamento_eventos_recurso_id (recurso_id),
  CONSTRAINT fk_pagamento_eventos_pedido FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Completa uma tabela parcial de implantação anterior sem sobrescrever dados.
-- O backend usa tipo, acao e recurso_id (não type/action/data_id).
SELECT COUNT(*) INTO @has_event_id FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'pagamento_eventos' AND COLUMN_NAME = 'id';
SET @sql = IF(@has_event_id = 0, 'ALTER TABLE pagamento_eventos ADD COLUMN id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT FIRST', 'SELECT ''005: evento.id já existe'' AS migration_notice');
PREPARE migration_statement FROM @sql; EXECUTE migration_statement; DEALLOCATE PREPARE migration_statement;
SELECT COUNT(*) INTO @has_event_primary FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'pagamento_eventos' AND CONSTRAINT_TYPE = 'PRIMARY KEY';
SET @sql = IF(@has_event_primary = 0, 'ALTER TABLE pagamento_eventos ADD PRIMARY KEY (id)', 'SELECT ''005: primary key de evento já existe'' AS migration_notice');
PREPARE migration_statement FROM @sql; EXECUTE migration_statement; DEALLOCATE PREPARE migration_statement;

SELECT COUNT(*) INTO @has_event_provider FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'pagamento_eventos' AND COLUMN_NAME = 'provedor';
SET @sql = IF(@has_event_provider = 0, 'ALTER TABLE pagamento_eventos ADD COLUMN provedor VARCHAR(50) NOT NULL', 'SELECT ''005: evento.provedor já existe'' AS migration_notice');
PREPARE migration_statement FROM @sql; EXECUTE migration_statement; DEALLOCATE PREPARE migration_statement;
SELECT COUNT(*) INTO @has_event_idempotency FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'pagamento_eventos' AND COLUMN_NAME = 'evento_id';
SET @sql = IF(@has_event_idempotency = 0, 'ALTER TABLE pagamento_eventos ADD COLUMN evento_id VARCHAR(255) NOT NULL', 'SELECT ''005: evento.evento_id já existe'' AS migration_notice');
PREPARE migration_statement FROM @sql; EXECUTE migration_statement; DEALLOCATE PREPARE migration_statement;
SELECT COUNT(*) INTO @has_event_tipo FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'pagamento_eventos' AND COLUMN_NAME = 'tipo';
SET @sql = IF(@has_event_tipo = 0, 'ALTER TABLE pagamento_eventos ADD COLUMN tipo VARCHAR(80) NOT NULL', 'SELECT ''005: evento.tipo já existe'' AS migration_notice');
PREPARE migration_statement FROM @sql; EXECUTE migration_statement; DEALLOCATE PREPARE migration_statement;
SELECT COUNT(*) INTO @has_event_acao FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'pagamento_eventos' AND COLUMN_NAME = 'acao';
SET @sql = IF(@has_event_acao = 0, 'ALTER TABLE pagamento_eventos ADD COLUMN acao VARCHAR(120) NULL', 'SELECT ''005: evento.acao já existe'' AS migration_notice');
PREPARE migration_statement FROM @sql; EXECUTE migration_statement; DEALLOCATE PREPARE migration_statement;
SELECT COUNT(*) INTO @has_event_resource FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'pagamento_eventos' AND COLUMN_NAME = 'recurso_id';
SET @sql = IF(@has_event_resource = 0, 'ALTER TABLE pagamento_eventos ADD COLUMN recurso_id VARCHAR(64) NOT NULL', 'SELECT ''005: evento.recurso_id já existe'' AS migration_notice');
PREPARE migration_statement FROM @sql; EXECUTE migration_statement; DEALLOCATE PREPARE migration_statement;
SELECT COUNT(*) INTO @has_event_payload FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'pagamento_eventos' AND COLUMN_NAME = 'payload';
SET @sql = IF(@has_event_payload = 0, 'ALTER TABLE pagamento_eventos ADD COLUMN payload JSON NULL', 'SELECT ''005: evento.payload já existe'' AS migration_notice');
PREPARE migration_statement FROM @sql; EXECUTE migration_statement; DEALLOCATE PREPARE migration_statement;
SELECT COUNT(*) INTO @has_event_pedido FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'pagamento_eventos' AND COLUMN_NAME = 'pedido_id';
SET @sql = IF(@has_event_pedido = 0, 'ALTER TABLE pagamento_eventos ADD COLUMN pedido_id INT NULL', 'SELECT ''005: evento.pedido_id já existe'' AS migration_notice');
PREPARE migration_statement FROM @sql; EXECUTE migration_statement; DEALLOCATE PREPARE migration_statement;
SELECT COUNT(*) INTO @has_event_processed FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'pagamento_eventos' AND COLUMN_NAME = 'processado';
SET @sql = IF(@has_event_processed = 0, 'ALTER TABLE pagamento_eventos ADD COLUMN processado TINYINT(1) NOT NULL DEFAULT 0', 'SELECT ''005: evento.processado já existe'' AS migration_notice');
PREPARE migration_statement FROM @sql; EXECUTE migration_statement; DEALLOCATE PREPARE migration_statement;
SELECT COUNT(*) INTO @has_event_error FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'pagamento_eventos' AND COLUMN_NAME = 'erro';
SET @sql = IF(@has_event_error = 0, 'ALTER TABLE pagamento_eventos ADD COLUMN erro VARCHAR(255) NULL', 'SELECT ''005: evento.erro já existe'' AS migration_notice');
PREPARE migration_statement FROM @sql; EXECUTE migration_statement; DEALLOCATE PREPARE migration_statement;
SELECT COUNT(*) INTO @has_event_created FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'pagamento_eventos' AND COLUMN_NAME = 'created_at';
SET @sql = IF(@has_event_created = 0, 'ALTER TABLE pagamento_eventos ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP', 'SELECT ''005: evento.created_at já existe'' AS migration_notice');
PREPARE migration_statement FROM @sql; EXECUTE migration_statement; DEALLOCATE PREPARE migration_statement;
SELECT COUNT(*) INTO @has_event_processed_at FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'pagamento_eventos' AND COLUMN_NAME = 'processado_em';
SET @sql = IF(@has_event_processed_at = 0, 'ALTER TABLE pagamento_eventos ADD COLUMN processado_em DATETIME NULL', 'SELECT ''005: evento.processado_em já existe'' AS migration_notice');
PREPARE migration_statement FROM @sql; EXECUTE migration_statement; DEALLOCATE PREPARE migration_statement;

SELECT provedor, evento_id, COUNT(*) AS quantidade
FROM pagamento_eventos
GROUP BY provedor, evento_id
HAVING COUNT(*) > 1;

SELECT COUNT(*) INTO @has_event_unique
FROM (SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'pagamento_eventos' AND NON_UNIQUE = 0 GROUP BY INDEX_NAME HAVING GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX SEPARATOR ',') = 'provedor,evento_id') AS matching_unique_indexes;
SET @sql = IF(@has_event_unique = 0, 'ALTER TABLE pagamento_eventos ADD UNIQUE KEY uq_pagamento_eventos_provedor_evento (provedor, evento_id)', 'SELECT ''005: unique de evento já existe'' AS migration_notice');
PREPARE migration_statement FROM @sql; EXECUTE migration_statement; DEALLOCATE PREPARE migration_statement;

SELECT COUNT(*) INTO @has_event_pedido_index
FROM (SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'pagamento_eventos' GROUP BY INDEX_NAME HAVING GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX SEPARATOR ',') = 'pedido_id') AS matching_indexes;
SET @sql = IF(@has_event_pedido_index = 0, 'CREATE INDEX idx_pagamento_eventos_pedido_id ON pagamento_eventos (pedido_id)', 'SELECT ''005: índice de pedido_id já existe'' AS migration_notice');
PREPARE migration_statement FROM @sql; EXECUTE migration_statement; DEALLOCATE PREPARE migration_statement;

SELECT COUNT(*) INTO @has_event_resource_index
FROM (SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'pagamento_eventos' GROUP BY INDEX_NAME HAVING GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX SEPARATOR ',') = 'recurso_id') AS matching_indexes;
SET @sql = IF(@has_event_resource_index = 0, 'CREATE INDEX idx_pagamento_eventos_recurso_id ON pagamento_eventos (recurso_id)', 'SELECT ''005: índice de recurso_id já existe'' AS migration_notice');
PREPARE migration_statement FROM @sql; EXECUTE migration_statement; DEALLOCATE PREPARE migration_statement;

SELECT COUNT(*) INTO @has_event_fk
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'pagamento_eventos'
  AND COLUMN_NAME = 'pedido_id' AND REFERENCED_TABLE_NAME = 'pedidos'
  AND REFERENCED_COLUMN_NAME = 'id';
SET @sql = IF(@has_event_fk = 0, 'ALTER TABLE pagamento_eventos ADD CONSTRAINT fk_pagamento_eventos_pedido FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE SET NULL', 'SELECT ''005: foreign key de pedido já existe'' AS migration_notice');
PREPARE migration_statement FROM @sql; EXECUTE migration_statement; DEALLOCATE PREPARE migration_statement;
