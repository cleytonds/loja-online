# Auditoria e prontidão — DL Modas (backend/produção)

## Plano aprovado (melhorias mínimas e necessárias)

- [ ] Definir fluxo operacional de reconciliação ou estorno para pagamentos Mercado Pago aprovados após a expiração do pedido.
- [ ] Tornar a rotina de expiração mais segura contra execução duplicada em reinícios: proteger com travas no banco (sem mudar fluxo/contratos).
- [ ] Ajustar Helmet para CSP mais segura sem quebrar frontend e uploads/produtos.
- [ ] Revisar CORS para restringir a origens sem abrir globalmente.
- [ ] Melhorar validação real de upload de imagens (Multer) sem trocar formatos nem fluxo.
- [ ] Melhorar logs para produção reduzindo ruído e evitando vazamento de dados.

## Status

- Em andamento
