# Mercado Pago Checkout Pro

## Variáveis

Configure apenas no backend: `MERCADO_PAGO_ACCESS_TOKEN`, `MERCADO_PAGO_WEBHOOK_SECRET`, `MERCADO_PAGO_COLLECTOR_ID`, `MP_ENVIRONMENT`, `MP_MAX_INSTALLMENTS`, `BACKEND_URL` e `FRONT_URL`. Tokens e segredos nunca pertencem ao frontend.

`MP_MAX_INSTALLMENTS` aceita inteiro de 1 a 12; valor ausente ou inválido usa 12. Em sandbox, `MP_ENVIRONMENT=sandbox` é explícito. Use somente credenciais de teste no ambiente de homologação.

## Preferência

O backend cria a preferência por SDK oficial. O corpo usa itens persistidos, `external_reference` igual ao pedido, `back_urls`, `notification_url`, expiração derivada de `pedidos.expires_at`, `installments` e exclusões de `ticket`, `atm`, `debit_card`, `prepaid_card` e `account_money`. `bank_transfer` não é excluído, preservando PIX; `credit_card` também não é excluído.

## Webhook

Cadastre `https://<backend-publico>/pagamentos/mercado-pago/webhook` para eventos `payment`. A notificação moderna exige `x-signature` e `x-request-id`; IPN legado é consultado na API oficial e validado contra collector, referência externa, valor e moeda. O payload nunca é fonte de status ou valor.

O evento é inserido em `pagamento_eventos` e processado em transação com o pedido. `approved` dentro do prazo confirma; notificações repetidas são ignoradas. Pagamento aprovado depois da expiração exige reconciliação operacional ou estorno, nunca reativação automática.

Não existe PIX manual, chave PIX fixa, comprovante ou pagamento por WhatsApp.
