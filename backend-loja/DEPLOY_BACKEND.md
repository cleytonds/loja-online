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

### Imagens de produtos

Para o volume de produção em `/data/produtos`, configure `UPLOAD_DIR=/data`: `getUploadProductsDir()` acrescenta `produtos`. Upload, leitura pública e exclusão após substituição usam esse mesmo diretório. As URLs continuam em `/uploads/produtos/<arquivo>`, com o nome final persistido em `produto_imagens.url`; o frontend já aceita WebP.

Apenas novos uploads de criação/edição passam por Sharp (Node.js >= 20.9.0; instalar dependências opcionais nativas com `npm ci`). JPEG vira WebP com qualidade 90; PNG usa WebP sem perdas. A imagem é orientada pelo EXIF, convertida para sRGB com perfil ICC e limitada a 2400 px por lado, mantendo proporção e sem recorte ou ampliação. O original é mantido quando a saída não economiza bytes. WebP já dentro do limite e animações são validados e preservados sem recompressão. O limite existente de 5 MB por arquivo continua; o decode limita a 40 milhões de pixels e 10 segundos de processamento. Um lote é processado por vez em cada processo, podendo aumentar o tempo de resposta sob concorrência.

Novos arquivos otimizados recebem UUID e sufixo `.optimized.webp`, com `public, max-age=31536000, immutable`; esses nomes nunca devem ser reutilizados. Arquivos anteriores mantêm URLs e bytes e recebem `public, max-age=3600, must-revalidate`. ETag, Last-Modified e acesso cross-origin são preservados. Em substituições futuras, arquivos anteriores só são removidos após commit; falhas de limpeza podem deixar órfãos, sem desfazer referências já confirmadas.

Esta alteração não contém migração nem processamento em lote dos arquivos existentes. Não reduz os 357 MB já armazenados; a economia de armazenamento é incremental, e o cache reduz transferências em acessos repetidos. Antes de publicar, execute `npm run test:safe` e valide visualmente algumas novas fotos de roupas: compressão com perdas e redução de resolução podem afetar detalhes finos. O binário Linux do Sharp precisa ser instalado no build do Railway; não copie `node_modules` do Windows.

## Observabilidade e smoke test

- `GET /health` confirma que o processo HTTP está ativo.
- `GET /ready` executa `SELECT 1` e confirma acesso ao banco.
- Verifique `GET /produtos`, login inválido controlado, CORS da origem publicada e webhook sem assinatura retornando 400/401.
- Faça teste controlado de e-mail e webhook somente após configurar domínios públicos e credenciais corretas.

## Rollback

Mantenha a versão anterior do backend e o backup do banco. Faça rollback da aplicação primeiro; migrations aditivas não devem ser removidas sem plano específico e backup validado.
