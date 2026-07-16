-- Idempotência do checkout: execute uma única vez em bancos existentes, após backup.
-- A chave é criada pelo frontend para cada tentativa e impede reservas duplicadas.
ALTER TABLE pedidos
  ADD COLUMN idempotency_key VARCHAR(100) NULL,
  ADD UNIQUE KEY unique_pedidos_idempotency_key (idempotency_key);
