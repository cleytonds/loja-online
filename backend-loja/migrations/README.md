# Migrations do banco

As migrations são sequenciais e preservam dados. Não há `DROP`, `TRUNCATE` ou rollback transacional confiável para DDL: faça backup testado e restaure o backup caso uma alteração precise ser desfeita.

1. `001_schema.sql` cria o schema completo de banco novo.
2. `002_produto_variacoes_ativo.sql` complementa `ativo` e seu índice em bases antigas.
3. `003_password_reset.sql` complementa tokens de redefinição em bases antigas.
4. `004_pedidos_idempotency.sql` adiciona idempotência de pedidos.
5. `005_mercado_pago.sql` adiciona dados Checkout Pro e auditoria de eventos.
6. `006_reconciliacao_pagamentos.sql` adiciona a fila operacional de pagamentos aprovados após a expiração.

As migrations 002–006 usam `DATABASE()` e `information_schema` com SQL dinâmico. Assim, não dependem de `ADD COLUMN IF NOT EXISTS`, que varia entre versões de MySQL e MariaDB. Para tabelas base ausentes, exibem aviso e o `ALTER` seguinte falha com erro nativo claro; aplique `001` primeiro.

## Banco novo

1. Crie um banco vazio com charset `utf8mb4`.
2. Execute `001` até `006`, nessa ordem.
3. As migrations 002 e 003 apenas registram que a estrutura já criada pela 001 existe.
4. Execute as verificações abaixo.

## Banco existente

1. Faça backup e confira a versão do servidor.
2. Execute as consultas de pré-validação de cada migration.
3. Aplique somente os arquivos ainda não registrados pelo seu processo operacional, sempre respeitando a ordem.
4. Valide colunas, índices e foreign keys.
5. Para rollback operacional, restaure o backup; `ALTER TABLE` pode realizar commit implícito.

## Pré-validações

```sql
SELECT idempotency_key, COUNT(*) AS quantidade
FROM pedidos
WHERE idempotency_key IS NOT NULL
GROUP BY idempotency_key HAVING COUNT(*) > 1;

SELECT mp_payment_id, COUNT(*) AS quantidade
FROM pedidos
WHERE mp_payment_id IS NOT NULL
GROUP BY mp_payment_id HAVING COUNT(*) > 1;

SELECT provedor, evento_id, COUNT(*) AS quantidade
FROM pagamento_eventos
GROUP BY provedor, evento_id HAVING COUNT(*) > 1;
```

Se qualquer consulta retornar linhas, não crie o índice único até resolver a duplicidade operacionalmente, sem apagar dados automaticamente.

## Verificação pós-migration

```sql
DESCRIBE produto_variacoes;
DESCRIBE usuarios;
DESCRIBE pedidos;
SHOW INDEX FROM pedidos;
SHOW CREATE TABLE pagamento_eventos;

SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('produto_variacoes', 'usuarios', 'pedidos', 'pagamento_eventos')
ORDER BY TABLE_NAME, ORDINAL_POSITION;
```

Teste primeiro em banco descartável. Não aplique em produção sem backup, janela de mudança e plano de restauração.
