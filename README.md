# DL Modas

E-commerce de moda feminina com catálogo de variações, carrinho, pedidos com reserva transacional de estoque, painel administrativo e Checkout Pro do Mercado Pago.

## Pagamentos

O único meio de pagamento é Mercado Pago Checkout Pro. O cliente cria um pedido com `pagamento: mercado_pago`, recebe a preferência do backend e escolhe PIX ou cartão de crédito no checkout hospedado. Boleto, ATM, débito, pré-pago, PIX manual, comprovante e WhatsApp como pagamento não fazem parte do sistema.

O webhook consulta o pagamento na API oficial, valida pedido, valor, moeda e origem, registra eventos idempotentes e marca o pedido como pago apenas quando a aprovação ocorreu dentro da reserva. Aprovação tardia permanece para reconciliação operacional, sem rebaixar ou reativar estoque automaticamente.

## Estrutura

- `Frontend-loja/`: React/Vite.
- `backend-loja/`: Express, MySQL/MariaDB e integração Mercado Pago.
- `backend-loja/migrations/`: schema e upgrades.
- `docs/`: operação, API, segurança, deploy e testes.

## Desenvolvimento

Copie os arquivos `.env.example` para `.env`, preencha valores locais seguros e nunca versione segredos. Instale dependências em cada projeto e use os scripts dos respectivos `package.json`.

Antes de ativar Checkout Pro, aplique as migrations até `005_mercado_pago.sql` em ambiente de teste. Consulte [Migrations](backend-loja/migrations/README.md), [Mercado Pago](docs/MERCADO_PAGO.md), [Deploy](docs/DEPLOY.md) e [Testes](docs/TESTES.md).
