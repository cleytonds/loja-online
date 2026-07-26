-- Recuperação de senha: execute uma única vez em banco já existente.
-- Não altera IDs, pedidos ou histórico de vendas.
ALTER TABLE usuarios
  ADD COLUMN token_redefinicao VARCHAR(64) NULL,
  ADD COLUMN token_redefinicao_expira_em DATETIME NULL,
  ADD INDEX idx_usuarios_token_redefinicao (token_redefinicao);
