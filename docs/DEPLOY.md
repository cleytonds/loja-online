# Deploy

## Pré-requisitos

1. Aplicar migrations `001` a `005`, em ordem, em cópia validada do banco. Execute pré-validações de duplicidade e mantenha backup: DDL em MySQL/MariaDB pode fazer commit implícito.
2. Hospedar backend em URL HTTPS estável e configurar `BACKEND_URL` sem barra final.
3. Hospedar frontend e definir `FRONT_URL` e `CORS_ORIGINS` com as origens reais.
4. Definir Access Token de produção, segredo do webhook, collector ID e `MP_ENVIRONMENT=production` somente no backend.
5. Cadastrar o webhook `POST /pagamentos/mercado-pago/webhook` para `payment`.

Use processo supervisionado, health check, TLS, logs estruturados, backup do banco e volume persistente apenas para `uploads/produtos`. Não use túnel temporário para produção.

## Checklist

- `.env` ignorado pelo Git; exemplos sem segredos.
- `MERCADO_PAGO_ACCESS_TOKEN`, `MERCADO_PAGO_WEBHOOK_SECRET` e `MERCADO_PAGO_COLLECTOR_ID` configurados.
- `MP_MAX_INSTALLMENTS` entre 1 e 12.
- CORS permite somente frontend esperado.
- Scheduler ativo em uma única instância ou separado em worker único.
- Teste sandbox aprovado antes de token de produção.
- Plano operacional para webhook indisponível, pagamento tardio, reconciliação e estorno.

Não configure PIX manual, chave PIX, comprovante ou WhatsApp como meio de pagamento.
