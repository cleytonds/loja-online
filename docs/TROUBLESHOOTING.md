# Troubleshooting

| Sintoma | Verificação segura |
|---|---|
| API não inicia | confira `NODE_ENV`, `JWT_SECRET`, banco, `FRONT_URL`, `BACKEND_URL`, `CORS_ORIGINS` e variáveis Mercado Pago sem imprimir valores. |
| Preferência falha | valide Access Token, URLs HTTPS, pedido pendente não vencido, itens e `MP_MAX_INSTALLMENTS`. |
| PIX não aparece | confirme que `bank_transfer` não foi excluído e valide a habilitação da conta Mercado Pago no ambiente correto. |
| Webhook 401 | confira segredo e manifesto de assinatura do ambiente correspondente. |
| Webhook não confirma | confirme consulta oficial, collector, referência externa, valor, moeda e prazo do pedido. |
| Pagamento aprovado após expiração | não reative pedido/estoque; use `pagamento_eventos` para reconciliação ou estorno. |
| Produto não abre | produto pode estar inativo; a rota pública retorna 404. |

Não existe diagnóstico de PIX manual ou comprovante porque esses fluxos não fazem parte da aplicação.
