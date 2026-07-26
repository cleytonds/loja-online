# Migrations

Para banco existente, execute tambÃ©m `004_pedidos_idempotency.sql` apÃ³s `003_password_reset.sql`, uma Ãºnica vez e apÃ³s backup.

- Banco novo: execute `001_schema.sql`.
- Banco existente aprovado até a Fase 7: execute `002_produto_variacoes_ativo.sql` e depois `003_password_reset.sql`, uma única vez e nesta ordem, após backup.

As migrations não devem ser reexecutadas. Elas preservam IDs, pedidos e histórico de vendas.
