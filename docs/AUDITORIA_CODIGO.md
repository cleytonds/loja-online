# Auditoria de código — correções aplicadas

Esta revisão eliminou as inconsistências confirmadas do fluxo de pagamento e preparo de deploy.

| Item | Situação final |
|---|---|
| PIX manual, comprovante e chave fixa | Removidos do código, rotas, variáveis de exemplo e testes. Campos antigos do banco permanecem apenas como legado. |
| WhatsApp | Mantido exclusivamente para atendimento e entrega; não inicia nem confirma pagamento. |
| Mercado Pago | Checkout Pro cria preferência pelo backend, permite PIX/cartão de crédito e exclui ticket, ATM, débito, pré-pago e saldo em conta. |
| Webhook | Assinatura moderna, consulta oficial, validações de collector/referência/valor/moeda, auditoria e idempotência. |
| Expiração | Pendentes vencidos devolvem estoque uma vez; aprovação tardia é reconciliação, não reativação. |
| Favoritos | Frontend usa o toggle `POST /favoritos/:produtoId`. |
| Cancelamento do cliente | Chamada inexistente removida; estorno/cancelamento MP segue pendente de regra integrada. |
| Produto | Criação transacional e detalhe público de produto inativo retorna 404. |
| Contexto/logout | Provider duplicado removido e Header usa logout centralizado. |
| Migrations | `002`–`005` verificam estruturas em `information_schema`; a sequência 001–005 é segura para schema completo e upgrades parciais, sem DDL destrutivo. |

## Riscos restantes

- Definir operação de reconciliação e estorno para pagamentos aprovados após expiração.
- Em produção, rodar scheduler em uma única instância e monitorar falhas de webhook.
- Validar meios PIX disponíveis na conta Mercado Pago de produção antes da ativação.
