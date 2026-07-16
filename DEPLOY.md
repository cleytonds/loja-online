# Deploy da DL Modas

## ConfiguraÃ§Ã£o

1. Copie os arquivos `.env.example` de backend e frontend para `.env` no ambiente de destino e preencha os valores reais. Nunca versione esses arquivos.
2. Configure `CORS_ORIGINS` exclusivamente com os domÃ­nios HTTPS do frontend.
3. Execute `npm ci` em cada projeto. No frontend, execute `npm run build` e publique apenas `dist/` em servidor estÃ¡tico ou proxy reverso.
4. Antes de atualizar banco existente, faÃ§a backup testado. Execute as migrations em ordem: `002`, `003`, `004`. Para banco novo, execute `001` e as migrations posteriores aplicÃ¡veis.

## API e scheduler

Inicie a API com `npm start` atravÃ©s de PM2 ou processo equivalente. Use proxy reverso com HTTPS e encaminhe apenas para a porta interna da API.

Defina `ENABLE_ORDER_SCHEDULER=true` em **uma Ãºnica** instÃ¢ncia da API. Todas as demais instÃ¢ncias devem usar `false`. Em testes, o scheduler permanece desativado.

## Uploads e persistÃªncia

Produtos sÃ£o armazenados em `uploads/produtos` e comprovantes em `uploads/comprovantes`. O diretÃ³rio precisa ser gravÃ¡vel pelo processo da API e persistente entre reinÃ­cios/redeploys. Em hospedagem com filesystem efÃªmero, monte um volume persistente; sem isso, uploads podem ser perdidos. NÃ£o exponha `uploads/comprovantes` publicamente.

## Backup, rollback e verificaÃ§Ã£o

Mantenha backup criptografado do banco e dos uploads antes de cada deploy. Para rollback, restaure a versÃ£o anterior da aplicaÃ§Ã£o e, se uma migration tiver sido aplicada, restaure o backup compatÃ­vel em vez de remover colunas manualmente.

ApÃ³s o deploy, valide `GET /`, catÃ¡logo, login, rota administrativa, checkout PIX/WhatsApp, upload de comprovante e logs. Monitore erros SMTP, permissÃµes de upload e a execuÃ§Ã£o do scheduler.
