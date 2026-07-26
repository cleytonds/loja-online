# API HTTP

Todas as rotas autenticadas usam `Authorization: Bearer <JWT>`. Erros retornam JSON. O pagamento é exclusivamente Checkout Pro do Mercado Pago: não existem endpoints de PIX manual, comprovante ou pagamento por WhatsApp.

## Pedidos

| Método | Rota | Acesso | Finalidade |
|---|---|---|---|
| `POST` | `/pedidos` | cliente | Cria pedido `pagamento: "mercado_pago"`, reserva estoque e aceita `X-Idempotency-Key`. |
| `GET` | `/pedidos/meus` | cliente | Lista pedidos do titular. |
| `GET` | `/pedidos/:id` | dono/admin | Consulta pedido. |
| `PUT` | `/pedidos/:id/status` | admin | Avança somente pelas transições administrativas permitidas. |
| `GET` | `/pedidos?reconciliacao_status=pendente` | admin | Lista a fila paginada de reconciliações, da mais antiga para a mais recente. |
| `PUT` | `/pedidos/:id/reconciliacao` | admin | Registra `resolvida_estorno` ou `resolvida_atendimento`, sem mudar pedido ou estoque. |
| `GET` | `/pedidos/atendimento/whatsapp` | público | Retorna apenas o número de atendimento, sem efeito de pagamento. |

Não há `PUT /pedidos/cancelar/:id`, `GET /pedidos/:id/pix`, `POST /pedidos/:id/pix/comprovante` nem acesso a comprovantes.

## Checkout Pro e webhook

| Método | Rota | Acesso | Finalidade |
|---|---|---|---|
| `POST` | `/pagamentos/mercado-pago/preferencia/:pedidoId` | dono autenticado | Cria ou reutiliza preferência válida e retorna `checkoutUrl`. |
| `POST` | `/pagamentos/mercado-pago/webhook` | Mercado Pago | Recebe notificação moderna ou IPN legado, consulta a API oficial e atualiza o pedido de forma idempotente. |

O backend cria itens, total, `external_reference`, retorno, notificação, expiração e meios de pagamento. O cliente nunca envia preço nem confirma o pagamento. O webhook aceita apenas eventos `payment`; para formato moderno, assinatura é obrigatória. Para IPN legado sem assinatura, o pagamento consultado deve corresponder a collector, pedido, valor e moeda.

## Produtos e favoritos

`GET /produtos` lista apenas ativos. `GET /produtos/:id` retorna `404` para produto inativo ou inexistente. Criação, edição e estoque são administrativos.

Favoritos usam `POST /favoritos/:produtoId` como toggle. O identificador é o ID do produto; não existe contrato `DELETE /favoritos/:id`.

## Arquivos

Somente imagens de produtos são públicas em `/uploads/produtos/<arquivo>`. Não existe upload ou leitura de comprovante de pagamento.
