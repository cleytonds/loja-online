# Testes

O backend usa o test runner nativo do Node. O grupo seguro cobre autenticação, idempotência, segurança, catálogo, upload de produto, scheduler, Mercado Pago, preferência, webhook, expiração, migration e transições de pedido.

```powershell
Set-Location backend-loja
$env:NODE_ENV='test'
node --test tests\*.test.js
```

Não execute `databaseIntegrity.test.js` com credenciais reais: ele depende de banco MySQL. Para validar migrations, use instância descartável e aplique `005_mercado_pago.sql` antes dos testes de integração.

No frontend:

```powershell
Set-Location Frontend-loja
npm run build
```

Também execute `git diff --check`. Não existem mais testes de PIX manual ou upload de comprovante; `imageMagic.test.js` cobre imagens de produto e `mercadoPagoMigration.test.js` confere as estruturas declaradas na migration.

`migrationsSequence.test.js` valida estaticamente a ordem 001–005, a ausência de comandos destrutivos, o uso de `DATABASE()`/`information_schema` nas migrations de compatibilidade e o contrato Mercado Pago. Ele não conecta a banco. O teste manual completo deve ocorrer em banco descartável conforme [Migrations](../backend-loja/migrations/README.md).
