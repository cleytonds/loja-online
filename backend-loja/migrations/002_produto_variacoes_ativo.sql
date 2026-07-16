-- Upgrade seguro para bases existentes: não remove nem recria dados.
ALTER TABLE produto_variacoes
  ADD COLUMN ativo TINYINT(1) NOT NULL DEFAULT 1 AFTER estoque,
  ADD INDEX idx_produto_variacoes_produto_ativo (produto_id, ativo);
