# Deploy do backend DL Modas

## Pré-requisitos

- Node.js LTS compatível com o `package-lock.json`.
- MySQL/MariaDB acessível e migrations `001` a `006` executadas em ordem.
- Disco persistente para uploads ou armazenamento compartilhado futuro.

## Instalação e execução

```bash
npm ci
npm start
```

O provedor deve fornecer `PORT`. Em produção use `NODE_ENV=production`.

## Variáveis obrigatórias de produção

Configure as chaves de `backend-loja/.env.example`, em especial `FRONT_URL`, `PUBLIC_API_URL`, `CORS_ORIGINS`, banco, `JWT_SECRET`, e credenciais de e-mail e Mercado Pago. Use URLs HTTPS públicas; não use localhost, `example.com` ou curingas em CORS.

`PUBLIC_API_URL` gera a URL do webhook real:

```text
${PUBLIC_API_URL}/pagamentos/mercado-pago/webhook
```

Cadastre exatamente esse caminho no painel do Mercado Pago. Não registre tokens, segredos ou payloads integrais nos logs.

## Banco e proxy

Ative `DB_SSL_ENABLED=true` somente quando o provedor exigir SSL. Mantenha `DB_SSL_REJECT_UNAUTHORIZED=true` e forneça `DB_SSL_CA` quando necessário.

Defina `TRUST_PROXY` somente conforme a topologia do provedor (por exemplo, `1` para um proxy confiável).

## Scheduler e arquivos

`ENABLE_ORDER_SCHEDULER=true` deve existir em apenas uma instância enquanto não houver lock distribuído. As demais instâncias devem usar `false`.

Em produção, `UPLOAD_DIR` é obrigatório e deve ser gravável e persistente. Disco efêmero/serverless ou várias instâncias sem armazenamento compartilhado não são compatíveis com uploads locais; avalie S3/Cloudinary futuramente.

## Observabilidade e smoke test

- `GET /health` confirma que o processo HTTP está ativo.
- `GET /ready` executa `SELECT 1` e confirma acesso ao banco.
- Verifique `GET /produtos`, login inválido controlado, CORS da origem publicada e webhook sem assinatura retornando 400/401.
- Faça teste controlado de e-mail e webhook somente após configurar domínios públicos e credenciais corretas.

## Rollback

Mantenha a versão anterior do backend e o backup do banco. Faça rollback da aplicação primeiro; migrations aditivas não devem ser removidas sem plano específico e backup validado.
