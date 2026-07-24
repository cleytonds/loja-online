# Banco de dados

O backend usa MySQL/MariaDB com InnoDB. A fonte de schema é `backend-loja/migrations`.

| Estrutura | Uso |
|---|---|
| `pedidos` | proprietário, status, total, `pagamento`, reserva, idempotência e campos `mp_*`. |
| `pedido_itens` | preço, quantidade, produto e variação registrados na compra. |
| `produto_variacoes` | estoque reservado/devolvido em transações. |
| `pagamento_eventos` | auditoria idempotente de notificações do Mercado Pago. |

`005_mercado_pago.sql` adiciona as colunas Mercado Pago usadas pelo código e `pagamento_eventos`. `mp_payment_id` tem unicidade para impedir associação de um pagamento a pedidos distintos. `006_reconciliacao_pagamentos.sql` adiciona somente metadados operacionais para pagamentos aprovados após `expires_at`; não reativa pedido nem estoque.

Para banco novo, aplique `001` a `005` em ordem. As migrations `002` e `003` são compatibilidade para bancos anteriores e detectam em `information_schema` as estruturas já presentes no schema completo. Em banco existente, faça backup e rode antes as consultas de duplicidade de `idempotency_key`, `mp_payment_id` e `(provedor, evento_id)` descritas no [guia de migrations](../backend-loja/migrations/README.md).

Os campos legados `pedidos.pix_key` e `pedidos.comprovante` podem existir em bases antigas, mas não são lidos, escritos ou expostos pelo fluxo atual. Não os remova sem migration de retenção separada.
