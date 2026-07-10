# Auditoria e prontidão — DL Modas (backend/produção)

## Plano aprovado (melhorias mínimas e necessárias)

- [ ] Implementar proteção de acesso a comprovantes PIX: remover exposição pública de `uploads/comprovantes` e manter produtos públicos.
- [ ] Manter rota pública existente para produtos e upload atual; adicionar rota protegida `GET /pedidos/:id/comprovante`.
- [ ] Tornar a rotina de expiração mais segura contra execução duplicada em reinícios: proteger com travas no banco (sem mudar fluxo/contratos).
- [ ] Ajustar Helmet para CSP mais segura sem quebrar frontend e uploads/produtos.
- [ ] Revisar CORS para restringir a origens sem abrir globalmente.
- [ ] Melhorar validação real de upload de imagens (Multer) sem trocar formatos nem fluxo.
- [ ] Revisar autorização admin no backend: garantir que cliente comum não acesse/visualize comprovantes de terceiros e não altere status.
- [ ] Melhorar logs para produção reduzindo ruído e evitando vazamento de dados.

## Status

- Em andamento
