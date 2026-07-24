# Fluxos críticos

## Pedido e pagamento

1. O cliente confirma o carrinho uma vez; `POST /pedidos` recalcula preço e valida estoque.
2. O backend cria pedido pendente, reserva estoque e persiste `expires_at` exatamente 10 minutos após a criação.
3. O cliente solicita a preferência e é redirecionado para Checkout Pro.
4. No checkout, Mercado Pago disponibiliza PIX e cartão de crédito conforme a conta.
5. O webhook consulta o pagamento oficial e, em `approved` antes de `expires_at`, atualiza o pedido para `pago` sem nova baixa de estoque.

Estados não aprovados atualizam somente os metadados `mp_*`; não confirmam o pedido. Evento repetido é idempotente.

## Expiração

Somente pedido pendente vencido pode expirar. Scheduler e webhook usam o `expires_at` persistido, definido com 10 minutos. Se a aprovação ocorreu depois do prazo ou o pedido já está expirado, o evento e metadados são registrados com reconciliação `pendente`; o pedido e o estoque não são reativados automaticamente. Um administrador resolve o caso como `resolvida_estorno` ou `resolvida_atendimento`, sem qualquer baixa de estoque ou alteração automática de status.

## Atendimento

WhatsApp é canal de dúvidas e combinação de entrega após pagamento. Ele não cria pedido, não confirma pagamento e não substitui Checkout Pro.
