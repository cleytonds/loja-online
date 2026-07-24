# Arquitetura

O frontend React/Vite usa HashRouter, Contexts de autenticação/carrinho e uma instância Axios central. O backend Express concentra autenticação JWT, CORS, rotas, pool MySQL/MariaDB, scheduler de expiração e Mercado Pago.

## Pagamento

`Carrinho → POST /pedidos → reserva de estoque → POST /pagamentos/mercado-pago/preferencia/:id → Checkout Pro → webhook → pedido pago`.

O frontend envia somente o ID do pedido para a preferência. Itens, preços, expiração, URLs e credenciais são responsabilidade do backend. Não há fluxo manual de PIX, upload de comprovante ou WhatsApp como pagamento.

## Consistência

Pedidos usam chave de idempotência e reserva em transação. O scheduler expira pendentes vencidos e devolve estoque uma vez; o webhook bloqueia o pedido e evento com `FOR UPDATE`, consulta o pagamento oficial e não deduz estoque novamente. Pagamento aprovado após expiração é registrado para reconciliação, sem reativação automática.

Imagens de produtos ficam em `uploads/produtos`; não há armazenamento de comprovantes de pagamento.
