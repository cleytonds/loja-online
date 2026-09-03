-- Sessoes renovaveis de autenticacao. Idempotente e somente aditiva.
SET @schema_name = DATABASE();

SELECT COUNT(*) INTO @has_usuarios_table
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'usuarios';

SELECT COUNT(*) INTO @has_auth_sessions_table
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'auth_sessions';

SET @sql = IF(
  @has_usuarios_table = 1 AND @has_auth_sessions_table = 0,
  'CREATE TABLE auth_sessions (id INT AUTO_INCREMENT PRIMARY KEY, usuario_id INT NOT NULL, token_hash CHAR(64) NOT NULL, family_id CHAR(64) NOT NULL, expires_at DATETIME NOT NULL, revoked_at DATETIME NULL, replaced_by_session_id INT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, last_used_at DATETIME NULL, UNIQUE KEY uq_auth_sessions_token_hash (token_hash), KEY idx_auth_sessions_usuario_id (usuario_id), KEY idx_auth_sessions_family_id (family_id), KEY idx_auth_sessions_expires_at (expires_at), CONSTRAINT fk_auth_sessions_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id), CONSTRAINT fk_auth_sessions_replaced_by FOREIGN KEY (replaced_by_session_id) REFERENCES auth_sessions(id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
  IF(@has_auth_sessions_table = 1, 'SELECT ''009: tabela auth_sessions ja existe'' AS migration_notice', 'SELECT ''009: tabela usuarios ausente; nenhuma alteracao executada'' AS migration_notice')
);

PREPARE migration_statement FROM @sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;
