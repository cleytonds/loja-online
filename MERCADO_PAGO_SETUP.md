# Mercado Pago — documentação consolidada

O guia técnico do Checkout Pro, da preferência, webhook, Sandbox, produção e reconciliação foi consolidado em [docs/MERCADO_PAGO.md](docs/MERCADO_PAGO.md).

Para o checklist operacional de infraestrutura, use [docs/DEPLOY.md](docs/DEPLOY.md). Para os fluxos e consultas de validação conceitual, use [docs/FLUXOS.md](docs/FLUXOS.md) e [docs/BANCO_DE_DADOS.md](docs/BANCO_DE_DADOS.md).

Não use credenciais reais em arquivos versionados e não trate retornos de navegador como confirmação de pagamento; o código atual confirma o pedido pelo webhook e pela consulta oficial do pagamento.
