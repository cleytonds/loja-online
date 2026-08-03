# Projeto DL Modas 2.0

> **Manual oficial de arquitetura, desenvolvimento, operação e continuidade**
>
> Este documento é a referência principal para proprietários, desenvolvedores e assistentes de IA que trabalhem no projeto DL Modas. Ele descreve o estado arquitetural esperado, as práticas obrigatórias e os procedimentos seguros para evolução e operação do sistema.

| Campo | Valor |
|---|---|
| Projeto | DL Modas |
| Categoria | E-commerce de moda feminina |
| Documento | Manual oficial do projeto |
| Versão documental | 2.0 |
| Ambientes | Desenvolvimento local e produção |
| Frontend local | `http://localhost:5173` |
| Backend local | `http://localhost:3000` |
| Banco local | MariaDB/XAMPP em `127.0.0.1:3307` |
| Frontend de produção | Vercel |
| Backend e banco de produção | Railway |

> [!IMPORTANT]
> Este manual não contém senhas, tokens, chaves privadas ou dados pessoais. Valores secretos devem existir somente nos gerenciadores de variáveis dos ambientes ou em arquivos locais ignorados pelo Git.

---

## Índice

1. [Visão Geral](#1-visão-geral)
2. [Arquitetura](#2-arquitetura)
3. [Estrutura das Pastas](#3-estrutura-das-pastas)
4. [Fluxo Git Oficial](#4-fluxo-git-oficial)
5. [Regras do Projeto](#5-regras-do-projeto)
6. [Banco de Dados](#6-banco-de-dados)
7. [Deploy](#7-deploy)
8. [Ambiente Local](#8-ambiente-local)
9. [Funcionalidades Implementadas](#9-funcionalidades-implementadas)
10. [Funcionalidades Futuras](#10-funcionalidades-futuras)
11. [Procedimento para Novas Funcionalidades](#11-procedimento-para-novas-funcionalidades)
12. [Checklist de Segurança](#12-checklist-de-segurança)
13. [INSTRUÇÕES PARA IA](#13-instruções-para-ia)
14. [Histórico](#14-histórico)
15. [Checklist Diário](#15-checklist-diário)
16. [Checklist antes de Commit](#16-checklist-antes-de-commit)
17. [Checklist antes de Deploy](#17-checklist-antes-de-deploy)
18. [Glossário](#18-glossário)

---

# 1. Visão Geral

## 1.1 Nome e objetivo

**DL Modas** é uma plataforma de comércio eletrônico voltada à venda de moda feminina. O sistema oferece catálogo com categorias e variações, carrinho, favoritos, autenticação, pedidos com controle transacional de estoque, painel administrativo, imagens de produtos, comunicação por e-mail e pagamento pelo Mercado Pago Checkout Pro.

Seus objetivos técnicos são:

- oferecer uma experiência de compra clara e responsiva;
- manter preços, estoque e pedidos consistentes no backend;
- impedir que valores enviados pelo navegador sejam tratados como fonte confiável;
- integrar pagamentos de forma auditável e idempotente;
- separar configuração local de configuração de produção;
- permitir evolução controlada por migrations, testes e revisão Git;
- preservar dados, credenciais e arquivos persistentes.

## 1.2 Tecnologias utilizadas

| Camada | Tecnologias principais | Responsabilidade |
|---|---|---|
| Frontend | React 18, Vite 5, React Router, Axios, React Icons, Recharts, CSS/Tailwind tooling | Interface, navegação, estado do usuário e consumo da API |
| Backend | Node.js, Express 5, JavaScript ES Modules | API HTTP, regras de negócio, autenticação e integrações |
| Banco | MySQL em produção; MariaDB 10.4/XAMPP local; InnoDB | Persistência transacional |
| Acesso ao banco | `mysql2/promise` | Pool de conexões e queries assíncronas |
| Autenticação | JWT e `bcryptjs` | Sessão stateless e hash de senha |
| Uploads | Multer, validação de assinatura de imagem e Express Static | Recepção e publicação de imagens |
| Pagamentos | Mercado Pago Checkout Pro | Preferências, checkout hospedado, webhook e reconciliação |
| E-mail | SMTP/Nodemailer ou API HTTPS da Brevo | Confirmação de cadastro e recuperação de senha |
| Segurança HTTP | Helmet, CORS, rate limit, limites de payload | Redução da superfície de ataque |
| Hospedagem | Vercel e Railway | Frontend, backend, banco e volume persistente |
| Testes | Node Test Runner | Contratos, regras, segurança, migrations e fluxos críticos |

## 1.3 Arquitetura geral

O projeto adota uma arquitetura cliente-servidor:

- o frontend nunca acessa o banco diretamente;
- o frontend chama uma API central por Axios;
- o backend autentica, valida e executa as regras de negócio;
- o backend consulta o banco por meio de um pool;
- pagamentos são confirmados por consulta oficial e webhook do Mercado Pago;
- uploads são armazenados fora do banco, enquanto o banco guarda seus caminhos;
- configurações variam por ambiente, sem credenciais no código.

```text
Navegador do usuário
        │
        │ HTTPS / HTTP local
        ▼
Frontend React + Vite
        │
        │ Axios (VITE_API_URL)
        ▼
Backend Node.js + Express
        ├──────────────► MySQL/MariaDB
        │                   │
        │                   └── dados, pedidos, estoque e auditoria
        │
        ├──────────────► Volume de uploads
        │                   └── uploads/produtos
        │
        ├──────────────► Mercado Pago
        │                   └── Checkout Pro + webhook
        │
        └──────────────► SMTP/Brevo
                            └── e-mails transacionais
```

## 1.4 Fluxo entre ambientes

```text
DESENVOLVIMENTO                           PRODUÇÃO

localhost:5173                            Vercel
Frontend Vite                             Frontend compilado
      │                                         │
      ▼                                         ▼
localhost:3000                            Railway Backend HTTPS
Express local                                  │
      │                                         ├── Railway MySQL
      ├── MariaDB XAMPP :3307                   ├── Volume persistente
      └── uploads/produtos local                ├── Mercado Pago
                                                └── E-mail
```

> [!WARNING]
> Desenvolvimento e produção são ambientes independentes. Nunca use credenciais de produção para “facilitar” um teste local e nunca faça uma alteração manual diretamente no banco ou filesystem de produção sem backup, validação e autorização.

---

# 2. Arquitetura

## 2.1 Frontend

O frontend reside em `Frontend-loja/` e é uma aplicação React construída pelo Vite.

Características:

- navegação por `HashRouter`, adequada à hospedagem estática sem depender de rewrite de todas as rotas;
- uma instância Axios central em `src/services/api.js`;
- URL base definida por `import.meta.env.VITE_API_URL`;
- páginas carregadas para catálogo, conta, carrinho, pedidos, pagamento e administração;
- componentes reutilizáveis para imagens, preços, cabeçalho, rodapé e atendimento;
- contextos para autenticação, carrinho e estado compartilhado;
- normalização de URLs de imagem em `src/utils/imagem.js`;
- build de produção gerado em `dist/`.

Fluxo típico:

```text
Componente/Página
      │
      ▼
api.get/post/put/patch/delete(...)
      │
      ▼
Axios central
      ├── baseURL = VITE_API_URL
      └── Authorization: Bearer <JWT>, quando disponível
```

> [!TIP]
> Uma nova chamada à API deve usar a instância central `api`. Não crie URLs absolutas do backend dentro de páginas ou componentes.

## 2.2 Backend

O backend reside em `backend-loja/` e é uma API Express em ES Modules.

Responsabilidades:

- validar ambiente e iniciar o servidor;
- aplicar CORS somente às origens permitidas;
- autenticar JWT e autorizar funções administrativas;
- limitar requisições sensíveis;
- validar payloads e arquivos;
- recalcular preços no servidor;
- reservar e devolver estoque em transações;
- persistir pedidos e eventos de pagamento;
- servir uploads;
- enviar e-mails;
- fornecer health checks.

Endpoints operacionais:

| Endpoint | Objetivo |
|---|---|
| `GET /health` | Confirma que o processo HTTP está ativo |
| `GET /ready` | Executa `SELECT 1` e confirma acesso ao banco |
| `GET /produtos` | Lista catálogo público |
| `GET /produtos/categorias` | Lista categorias |

## 2.3 Banco MySQL/MariaDB

O banco é a fonte de verdade para:

- usuários e autenticação;
- categorias e produtos;
- variações, preço normal, preço promocional, estoque e estado ativo;
- imagens associadas aos produtos;
- favoritos;
- pedidos e itens;
- expiração e idempotência;
- metadados e eventos do Mercado Pago;
- reconciliação operacional.

O banco local usa MariaDB do XAMPP. A produção usa o serviço configurado no Railway. O projeto busca compatibilidade por meio de SQL baseado em `information_schema` e evita depender de sintaxes de migration que variam entre versões.

## 2.4 Uploads

O banco não armazena o binário das imagens. Ele armazena caminhos como:

```text
/uploads/produtos/nome-do-arquivo.jpg
```

O backend publica fisicamente:

```text
URL pública: /uploads/produtos/<arquivo>
Diretório:   <UPLOAD_DIR>/produtos/<arquivo>
```

Em desenvolvimento, sem `UPLOAD_DIR`, a raiz padrão é `backend-loja/uploads`. Em produção, `UPLOAD_DIR` deve apontar para armazenamento persistente e gravável.

> [!WARNING]
> Backup SQL não inclui os binários dos uploads. O plano de backup deve proteger banco e volume de imagens separadamente.

## 2.5 Railway

O Railway hospeda o backend e os serviços de produção associados, como banco e volume persistente.

Requisitos:

- variáveis configuradas no painel, não em arquivos commitados;
- `NODE_ENV=production`;
- URL HTTPS pública estável;
- banco acessível apenas pelo backend;
- volume persistente configurado em `UPLOAD_DIR`;
- health check apropriado;
- apenas uma instância com scheduler ativo, enquanto não houver lock distribuído.

As variáveis injetadas pelo ambiente têm precedência sobre `.env` e `.env.local`. Esses arquivos locais não devem fazer parte do deploy.

## 2.6 Vercel

O Vercel hospeda o frontend compilado.

Responsabilidades operacionais:

- instalar dependências;
- executar o build Vite;
- publicar `dist/`;
- injetar `VITE_API_URL` durante o build;
- servir a aplicação em HTTPS.

`VITE_API_URL` em produção deve apontar para o backend público do Railway. Nunca deve apontar para `localhost` em um build publicado.

## 2.7 Mercado Pago

O único fluxo de pagamento oficial é o **Mercado Pago Checkout Pro**. PIX e cartão são apresentados dentro do checkout hospedado conforme a conta e as regras do Mercado Pago.

```text
Carrinho
   │
   ▼
POST /pedidos
   │ valida itens, preço e estoque
   │ cria reserva transacional
   ▼
POST /pagamentos/mercado-pago/preferencia/:pedidoId
   │
   ▼
Checkout Pro
   │
   ├── retorno do navegador
   └── webhook assinado
            │
            ▼
Consulta oficial do pagamento
            │
            ▼
Atualização idempotente do pedido
```

Princípios:

- o frontend não envia preço confiável ao Mercado Pago;
- o backend obtém itens e total do pedido persistido;
- a confirmação não depende apenas do retorno do navegador;
- o webhook consulta o pagamento oficial;
- pedido, valor, moeda, collector e ambiente são validados;
- eventos repetidos são idempotentes;
- aprovação tardia segue para reconciliação, sem reativar estoque automaticamente.

## 2.8 JWT

O JWT representa a autenticação do usuário entre frontend e backend.

```text
Login válido
   │
   ▼
Backend assina JWT
   │
   ▼
Frontend armazena token
   │
   ▼
Axios envia Authorization: Bearer <token>
   │
   ▼
Middleware valida assinatura e autorização
```

Regras:

- `JWT_SECRET` deve ser longo, aleatório e exclusivo por ambiente;
- nunca registrar token completo em logs;
- nunca confiar no tipo de usuário enviado pelo frontend;
- rotas administrativas devem usar autenticação e autorização.

## 2.9 E-mail

O backend suporta:

- SMTP por Nodemailer;
- API HTTPS da Brevo;
- confirmação de cadastro;
- reenvio de código;
- recuperação de senha;
- timeouts para impedir bloqueio prolongado da requisição.

O provedor é selecionado por `EMAIL_PROVIDER`. Segredos SMTP ou Brevo pertencem apenas ao ambiente do backend.

## 2.10 Upload de imagens

O fluxo de imagem é:

```text
Administrador seleciona arquivo
        │
        ▼
Multer recebe upload
        │
        ├── valida quantidade/tamanho/MIME
        └── valida assinatura real do arquivo
        │
        ▼
Arquivo salvo em uploads/produtos
        │
        ▼
Caminho relativo salvo em produto_imagens
        │
        ▼
Express Static publica o arquivo
        │
        ▼
Frontend monta VITE_API_URL + caminho relativo
```

Não associar uma imagem arbitrária quando o binário original estiver ausente.

---

# 3. Estrutura das Pastas

```text
loja-online/
├── Frontend-loja/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── routes/
│   │   ├── services/
│   │   └── utils/
│   ├── tests/
│   ├── .env.example
│   ├── package.json
│   └── vite.config.js
├── backend-loja/
│   ├── migrations/
│   ├── src/
│   │   ├── config/
│   │   ├── middlewares/
│   │   ├── routes/
│   │   ├── services/
│   │   └── utils/
│   ├── tests/
│   ├── uploads/
│   │   └── produtos/
│   ├── .env.example
│   └── package.json
├── docs/
├── backups-locais/
└── PROJETO_DL_MODAS_2.0.md
```

| Pasta | Finalidade |
|---|---|
| `Frontend-loja` | Aplicação React/Vite consumida pelo usuário |
| `Frontend-loja/public` | Arquivos públicos copiados sem transformação, como ícones e banners |
| `Frontend-loja/src` | Código-fonte do frontend |
| `Frontend-loja/src/components` | Componentes reutilizáveis de interface |
| `Frontend-loja/src/context` | Estado compartilhado, como carrinho e autenticação |
| `Frontend-loja/src/pages` | Telas associadas às rotas da aplicação |
| `Frontend-loja/src/routes` | Proteções e composição das rotas do frontend |
| `Frontend-loja/src/services` | Clientes de serviços, incluindo Axios central |
| `Frontend-loja/src/utils` | Funções puras e utilitários do frontend |
| `backend-loja` | API, integrações e regras de negócio |
| `backend-loja/src/config` | Banco, ambiente e configurações externas |
| `backend-loja/src/middlewares` | JWT, autorização, upload e validação |
| `backend-loja/src/routes` | Endpoints HTTP agrupados por domínio |
| `backend-loja/src/services` | Integrações externas, como Mercado Pago |
| `backend-loja/src/utils` | Regras reutilizáveis, segurança, e-mail e cálculos |
| `backend-loja/migrations` | Criação e evolução versionada do schema |
| `backend-loja/tests` | Testes automatizados do backend |
| `backend-loja/uploads/produtos` | Imagens locais de produtos; não é substituto para backup persistente |
| `docs` | Documentação especializada de API, deploy, segurança e operação |
| `backups-locais` | Backups operacionais locais; nunca devem ser publicados |
| `dist` | Resultado gerado do build do frontend; não editar manualmente |
| `node_modules` | Dependências instaladas; nunca versionar |

> [!NOTE]
> O diretório `backend-loja` pode possuir metadados Git próprios em alguns ambientes. Antes de operações Git, confirme a raiz com `git rev-parse --show-toplevel` para não atuar no repositório errado.

---

# 4. Fluxo Git Oficial

## 4.1 Conceitos

- `main`: versão oficial integrada e candidata a produção;
- branch: linha isolada de trabalho;
- commit: unidade revisável e coerente de mudança;
- push: envio de commits locais ao remoto;
- Pull Request: revisão e validação antes da integração;
- merge: incorporação aprovada à `main`;
- deploy: publicação de uma revisão identificada.

## 4.2 Fluxo obrigatório

```text
Nova funcionalidade ou correção
              │
              ▼
Criar branch a partir da main atualizada
              │
              ▼
Desenvolver uma mudança de escopo claro
              │
              ▼
Criar/atualizar testes e documentação
              │
              ▼
Executar testes e build
              │
              ▼
Revisar git status e git diff
              │
              ▼
Criar commit coerente
              │
              ▼
Push da branch
              │
              ▼
Pull Request + revisão + CI
              │
              ▼
Merge na main
              │
              ▼
Deploy da revisão aprovada
              │
              ▼
Smoke test e monitoramento
```

## 4.3 Nomes de branches

| Tipo | Padrão | Exemplo |
|---|---|---|
| Funcionalidade | `feat/<descricao>` | `feat/calculo-frete` |
| Correção | `fix/<descricao>` | `fix/imagem-produto` |
| Segurança | `security/<descricao>` | `security/validacao-upload` |
| Documentação | `docs/<descricao>` | `docs/manual-operacao` |
| Manutenção | `chore/<descricao>` | `chore/atualizar-dependencias` |
| Teste | `test/<descricao>` | `test/pedidos-admin` |

## 4.4 Boas práticas de commit

```text
feat: adicionar cálculo de frete
fix: preservar estoque ao inativar variação
test: cobrir expiração de pedido
docs: atualizar procedimento de deploy
chore: atualizar dependências de desenvolvimento
```

Um commit deve:

- representar um único propósito;
- incluir testes correspondentes quando aplicável;
- não misturar configuração local com funcionalidade;
- não conter arquivos gerados, temporários ou secretos;
- ser compreensível sem depender de conversa externa.

## 4.5 Comandos seguros de inspeção

```bash
git rev-parse --show-toplevel
git branch --show-current
git status --short
git diff
git diff --staged
git log --oneline --decorate -10
```

> [!WARNING]
> Não execute `git add .` automaticamente. Adicione arquivos explicitamente somente depois de revisar `git status` e `git diff`.

---

# 5. Regras do Projeto

## 5.1 Regras obrigatórias

1. Nunca editar diretamente em produção.
2. Sempre reproduzir e testar localmente primeiro.
3. Nunca enviar credenciais, tokens ou dados reais ao Git.
4. Nunca executar uma migration sem confirmar que ela está pendente.
5. Nunca executar migrations antigas novamente sem análise de idempotência.
6. Nunca apagar ou reescrever uma migration já distribuída.
7. Nunca confiar em preços, permissões ou status enviados pelo frontend.
8. Nunca alterar fluxo de pagamento sem testes de idempotência e webhook.
9. Nunca apagar uploads ou registros para “corrigir” referências sem backup.
10. Sempre revisar `git status`, arquivos não rastreados e diffs antes do commit.

## 5.2 Nunca versionar

```gitignore
.env
.env.local
.env.*.local
node_modules/
dist/
*.log
backups/
backups-locais/
_tmp_*
```

Também não versionar:

- senhas e hashes provenientes de dados reais;
- access tokens e webhook secrets;
- chaves SMTP/Brevo;
- dumps com clientes ou pedidos;
- caminhos absolutos de notebooks;
- arquivos temporários de diagnóstico;
- uploads reais sem estratégia explícita de armazenamento.

## 5.3 Fonte de verdade

| Assunto | Fonte de verdade |
|---|---|
| Código oficial | `main` remota após CI e revisão |
| Schema | Migrations aprovadas |
| Configuração local | `.env.local`, ignorado |
| Configuração de produção | Painéis Railway/Vercel |
| Preços e estoque | Backend + banco |
| Estado de pagamento | API oficial Mercado Pago + eventos persistidos |
| Binários de imagens | Volume persistente/backup de uploads |

---

# 6. Banco de Dados

## 6.1 Princípios

- utilizar InnoDB;
- utilizar `utf8mb4` com collation compatível entre MySQL e MariaDB;
- fazer backup antes de DDL;
- testar restauração, não apenas geração do backup;
- aplicar migrations sequencialmente;
- validar schema antes e depois;
- preferir migrations aditivas e idempotentes;
- tratar rollback de DDL como restauração de backup quando necessário.

## 6.2 Migrations existentes

| Migration | Finalidade |
|---|---|
| `001_schema.sql` | Schema inicial |
| `002_produto_variacoes_ativo.sql` | Estado ativo das variações |
| `003_password_reset.sql` | Recuperação de senha |
| `004_pedidos_idempotency.sql` | Idempotência de pedidos |
| `005_mercado_pago.sql` | Checkout Pro e eventos de pagamento |
| `006_reconciliacao_pagamentos.sql` | Reconciliação operacional |
| `008_precos_promocionais_variacoes.sql` | Preço promocional por variação |

Arquivos `007` de importação de dados exigem revisão operacional e não devem ser tratados automaticamente como migration comum de schema.

## 6.3 Criar banco local

Exemplo no cliente MariaDB/MySQL:

```sql
CREATE DATABASE loja_online
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

## 6.4 Importar ou restaurar

> [!CAUTION]
> Importação substitui ou adiciona dados conforme o SQL. Confirme banco, host e backup antes de executar. Nunca copie este exemplo para produção sem revisar todos os parâmetros.

Exemplo local no XAMPP:

```powershell
C:\xampp\mysql\bin\mysql.exe `
  --host=127.0.0.1 `
  --port=3307 `
  --user=root `
  --default-character-set=utf8mb4 `
  loja_online
```

No prompt do cliente:

```sql
SOURCE D:/caminho/backup_validado.sql;
```

Procedimento:

1. confirmar que o destino é local ou uma cópia isolada;
2. validar encoding UTF-8 sem BOM quando necessário;
3. validar compatibilidade de collation;
4. criar banco vazio ou confirmar estratégia para banco existente;
5. importar;
6. conferir tabelas, contagens e constraints;
7. iniciar o backend e consultar `/ready`;
8. executar testes de rotas críticas.

## 6.5 Exportar

Exemplo local:

```powershell
C:\xampp\mysql\bin\mysqldump.exe `
  --host=127.0.0.1 `
  --port=3307 `
  --user=root `
  --single-transaction `
  --routines `
  --triggers `
  --default-character-set=utf8mb4 `
  loja_online
```

O arquivo de saída deve ser criado em pasta local protegida e ignorada pelo Git. Verifique tamanho, cabeçalho, encoding e capacidade de restauração.

## 6.6 Criar uma migration

Padrão:

1. escolher o próximo número disponível;
2. descrever objetivo e pré-condições em comentários;
3. consultar `DATABASE()` e `information_schema` quando precisar ser idempotente;
4. evitar `DROP`, `TRUNCATE` ou mutações destrutivas;
5. não misturar schema com importação de dados reais;
6. criar teste de contrato da migration;
7. aplicar primeiro em banco descartável;
8. validar em cópia representativa;
9. documentar rollback operacional.

Exemplo conceitual:

```sql
SET @schema_name = DATABASE();

SELECT COUNT(*) INTO @column_exists
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = @schema_name
  AND TABLE_NAME = 'tabela'
  AND COLUMN_NAME = 'nova_coluna';

SET @sql = IF(
  @column_exists = 0,
  'ALTER TABLE tabela ADD COLUMN nova_coluna VARCHAR(100) NULL',
  'SELECT ''coluna já existe'' AS migration_notice'
);

PREPARE migration_statement FROM @sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;
```

## 6.7 Validação antes e depois

```sql
SELECT DATABASE();
SHOW TABLES;
DESCRIBE produtos;
DESCRIBE produto_variacoes;
DESCRIBE pedidos;
SHOW INDEX FROM pedidos;
```

Checklist:

- [ ] Backup criado e testado.
- [ ] Banco-alvo confirmado.
- [ ] Migration ainda pendente.
- [ ] Compatibilidade MySQL/MariaDB analisada.
- [ ] Duplicidades verificadas antes de índices únicos.
- [ ] Migration testada em ambiente descartável.
- [ ] Colunas, índices e constraints validados depois.
- [ ] Backend e testes executados.

---

# 7. Deploy

## 7.1 Estratégia

O deploy deve partir de uma revisão identificável da `main`, nunca de uma árvore local suja.

```text
main aprovada
    │
    ├──► Vercel: build e publicação do frontend
    │
    └──► Railway: backend Node.js
                 ├── banco MySQL
                 └── volume persistente de uploads
```

## 7.2 Frontend no Vercel

1. confirmar que o repositório e a branch de produção estão corretos;
2. usar `Frontend-loja` como diretório do projeto, se configurado dessa forma;
3. instalar com `npm ci`;
4. executar `npm run build`;
5. publicar `dist`;
6. configurar `VITE_API_URL` com a URL HTTPS do backend;
7. validar que nenhum valor contém localhost;
8. verificar navegação por `HashRouter`.

## 7.3 Backend no Railway

1. instalar com `npm ci`;
2. iniciar com `npm start`;
3. usar `NODE_ENV=production`;
4. fornecer `PORT` pelo ambiente;
5. configurar banco, CORS, JWT, e-mail, Mercado Pago e uploads;
6. configurar `UPLOAD_DIR` para volume persistente;
7. ativar scheduler em somente uma instância;
8. validar `/health` e `/ready`.

## 7.4 Banco de produção

1. gerar backup consistente;
2. garantir restauração testável;
3. confirmar migrations pendentes;
4. aplicar em janela controlada;
5. validar schema e aplicação;
6. manter o backup até o encerramento da janela de observação.

## 7.5 Variáveis de ambiente

### Frontend

| Variável | Uso |
|---|---|
| `VITE_API_URL` | URL pública do backend |

### Backend

| Grupo | Variáveis |
|---|---|
| Runtime | `NODE_ENV`, `PORT`, `TRUST_PROXY` |
| URLs/CORS | `FRONT_URL`, `PUBLIC_API_URL`, `CORS_ORIGINS` |
| Banco | `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, opções `DB_SSL_*` |
| JWT | `JWT_SECRET` |
| E-mail | `EMAIL_PROVIDER`, `SMTP_*`, `EMAIL_FROM`, `EMAIL_FROM_NAME`, `BREVO_API_KEY` |
| Mercado Pago | `MP_ENVIRONMENT`, `MERCADO_PAGO_ACCESS_TOKEN`, `MERCADO_PAGO_WEBHOOK_SECRET`, `MERCADO_PAGO_COLLECTOR_ID`, `MP_MAX_INSTALLMENTS` |
| Operação | `ENABLE_ORDER_SCHEDULER`, `UPLOAD_DIR`, `WHATSAPP_NUMERO` |

> [!WARNING]
> Somente nomes de variáveis pertencem à documentação. Valores reais devem permanecer nos painéis seguros dos provedores.

## 7.6 Checklist antes do deploy

- [ ] Branch é `main` e está sincronizada.
- [ ] Árvore de trabalho está limpa.
- [ ] CI passou.
- [ ] Testes locais passaram.
- [ ] Build do frontend passou.
- [ ] Nenhum segredo está no diff.
- [ ] Nenhuma URL local está no build de produção.
- [ ] Backup do banco foi validado.
- [ ] Migrations pendentes foram identificadas.
- [ ] Volume de uploads está montado.
- [ ] CORS contém somente origens públicas esperadas.
- [ ] Webhook aponta para URL HTTPS correta.
- [ ] Plano de rollback está disponível.

## 7.7 Checklist depois do deploy

- [ ] `GET /health` responde 200.
- [ ] `GET /ready` responde 200.
- [ ] Frontend abre sem erros no console.
- [ ] Catálogo e categorias carregam.
- [ ] Imagens principais respondem 200.
- [ ] Cadastro e login foram testados controladamente.
- [ ] E-mail transacional foi validado.
- [ ] Checkout sandbox/controlado foi validado quando aplicável.
- [ ] Webhook registra eventos corretamente.
- [ ] Upload persiste após reinício/redeploy.
- [ ] Logs não expõem tokens ou dados pessoais.

---

# 8. Ambiente Local

## 8.1 Ferramentas

- Windows;
- XAMPP com MariaDB;
- Node.js compatível com os `package-lock.json`;
- npm;
- Git;
- VS Code;
- terminal PowerShell.

## 8.2 Banco local

| Campo | Valor local |
|---|---|
| Host | `127.0.0.1` |
| Porta | `3307` |
| Usuário | `root` |
| Senha | definida somente em `.env.local`; pode ser vazia no XAMPP local |
| Banco | `loja_online` |

Nunca copie essa configuração para produção.

## 8.3 `.env.local`

Frontend:

```dotenv
VITE_API_URL=http://localhost:3000
```

Backend, usando valores locais e sem registrar senha neste manual:

```dotenv
DB_HOST=127.0.0.1
DB_PORT=3307
DB_USER=root
DB_PASSWORD=
DB_NAME=loja_online
DB_SSL_ENABLED=false
```

> [!IMPORTANT]
> `.env` e `.env.local` devem permanecer ignorados pelo Git. O Railway mantém suas próprias variáveis e não depende desses arquivos locais.

## 8.4 Instalação

Backend:

```powershell
cd D:\Projetos\loja-online\backend-loja
npm ci
```

Frontend:

```powershell
cd D:\Projetos\loja-online\Frontend-loja
npm ci
```

## 8.5 Inicialização

Ordem recomendada:

```text
1. Iniciar MariaDB no XAMPP
2. Confirmar porta 3307 e banco loja_online
3. Iniciar backend
4. Validar /ready
5. Iniciar frontend
6. Abrir localhost:5173
```

Backend:

```powershell
cd D:\Projetos\loja-online\backend-loja
npm run dev
```

Frontend, em outro terminal:

```powershell
cd D:\Projetos\loja-online\Frontend-loja
npm run dev
```

Validação:

```powershell
curl.exe http://localhost:3000/health
curl.exe http://localhost:3000/ready
curl.exe http://localhost:3000/produtos
curl.exe http://localhost:3000/produtos/categorias
```

## 8.6 Testes e build

Backend:

```powershell
cd D:\Projetos\loja-online\backend-loja
npm run test:safe
```

Para executar todos os testes Node presentes:

```powershell
node --test tests/*.test.js
```

Frontend:

```powershell
cd D:\Projetos\loja-online\Frontend-loja
npm run build
```

> [!TIP]
> Em PowerShell com política restritiva, pode ser necessário usar `npm.cmd` no lugar de `npm`.

## 8.7 Diagnóstico local básico

| Sintoma | Verificação |
|---|---|
| Backend não inicia | Porta, variáveis obrigatórias e logs |
| `/ready` retorna 503 | MariaDB ativo, porta 3307, usuário e banco |
| CORS | `CORS_ORIGINS` contém `http://localhost:5173` |
| Frontend chama Railway | `VITE_API_URL` resolvido pelo Vite |
| Imagem indisponível | Registro em `produto_imagens`, arquivo físico e URL direta |
| `/produtos` retorna 500 | Schema esperado, especialmente migrations pendentes |

---

# 9. Funcionalidades Implementadas

## 9.1 Usuários e autenticação

- cadastro de usuário;
- confirmação por código;
- reenvio de código;
- login;
- consulta do usuário autenticado;
- JWT;
- hash seguro de senha;
- recuperação e redefinição de senha;
- distinção entre cliente e administrador;
- proteção de rotas privadas e administrativas;
- tratamento de conta pendente de confirmação.

## 9.2 Catálogo

- listagem de produtos ativos;
- pesquisa por nome;
- filtro por categoria;
- paginação opcional;
- detalhes do produto;
- categorias;
- imagens principais e galeria;
- variações por tamanho e cor;
- preço normal e promocional;
- cálculo de preço efetivo;
- ocultação de variações inativas no catálogo público.

## 9.3 Carrinho e favoritos

- inclusão e remoção de itens;
- aumento e redução de quantidade;
- preservação de metadados da variação;
- exibição de preço promocional;
- cálculo de subtotal e total;
- favoritos vinculados ao usuário;
- navegação para checkout.

## 9.4 Pedidos e estoque

- criação autenticada de pedido;
- validação de produto e variação;
- recálculo de preço no backend;
- registro do preço histórico no item;
- reserva transacional de estoque;
- idempotência por chave de requisição;
- expiração de pedidos pendentes;
- devolução controlada de estoque;
- histórico do cliente;
- estados administrativos;
- proteção de transições inválidas;
- reconciliação de pagamentos tardios.

## 9.5 Painel administrativo

- listagem de vendas e pedidos;
- separação entre pedidos atuais e histórico;
- detalhes do cliente e itens;
- paginação e agregação;
- criação e edição de produtos;
- gerenciamento de imagens;
- gerenciamento de variações;
- ativação e inativação sem exclusão física;
- preservação de estoque ao inativar;
- bloqueio da inativação da última variação ativa;
- preço promocional por variação;
- fila de reconciliação de pagamentos.

## 9.6 Mercado Pago

- Checkout Pro;
- criação de preferência pelo backend;
- PIX e cartão no checkout hospedado;
- URLs públicas de retorno;
- webhook;
- consulta oficial do pagamento;
- validação de valor, moeda, pedido, ambiente e recebedor;
- eventos idempotentes;
- prevenção de associação duplicada de pagamento;
- retorno de pagamento no frontend;
- tratamento de aprovação tardia;
- reconciliação operacional.

## 9.7 E-mails

- SMTP;
- Brevo por API HTTPS;
- confirmação de cadastro;
- reenvio de confirmação;
- recuperação de senha;
- timeout e mensagens de falha controladas;
- não exposição de credenciais nos erros.

## 9.8 Uploads e imagens

- upload administrativo;
- formatos JPEG, PNG e WebP conforme validações;
- verificação de assinatura real do arquivo;
- armazenamento em `uploads/produtos`;
- caminhos relativos no banco;
- publicação via Express Static;
- normalização de URLs antigas no frontend;
- fallback “Imagem indisponível”.

## 9.9 Segurança e confiabilidade

- Helmet;
- CORS explícito;
- rate limiting;
- limite de JSON;
- autenticação JWT;
- autorização administrativa;
- validação de IDs e payloads;
- transações de banco;
- locks para fluxos concorrentes;
- idempotência;
- validação de magic bytes de imagens;
- logs estruturados sem segredos intencionais;
- health e readiness checks;
- encerramento seguro;
- scheduler de expiração.

---

# 10. Funcionalidades Futuras

## 10.1 Roadmap sugerido

| Horizonte | Funcionalidade | Resultado esperado |
|---|---|---|
| Curto prazo | Notificações de pedido | Atualizações por e-mail e canais autorizados |
| Curto prazo | Melhorias de UX | Estados de carregamento, acessibilidade e mensagens melhores |
| Curto prazo | SEO técnico | Metadados, sitemap e dados estruturados |
| Médio prazo | Frete | CEP, transportadoras, prazos e regras comerciais |
| Médio prazo | Avaliações | Notas e comentários moderados por compra |
| Médio prazo | Analytics | Funil, conversão e comportamento com consentimento |
| Médio prazo | Relatórios | Vendas, estoque, promoções e reconciliação |
| Médio prazo | PWA | Instalação, cache controlado e experiência offline parcial |
| Longo prazo | Aplicativo | Aplicativo móvel apoiado na API existente |
| Longo prazo | Armazenamento de objetos | Migração de uploads para S3/Cloudinary equivalente |

## 10.2 Critérios para priorização

Uma iniciativa deve ser priorizada por:

1. impacto no cliente;
2. redução de risco operacional;
3. retorno comercial;
4. complexidade e custo;
5. dependências de dados e infraestrutura;
6. capacidade de testar e reverter;
7. compatibilidade com a arquitetura atual.

---

# 11. Procedimento para Novas Funcionalidades

## 11.1 Padrão obrigatório

1. Definir problema, objetivo e critérios de aceite.
2. Atualizar a `main` local sem perder trabalho pendente.
3. Criar uma branch de escopo único.
4. Mapear arquivos, banco, APIs e riscos afetados.
5. Implementar a menor solução compatível.
6. Criar ou atualizar testes.
7. Se houver banco, criar migration aditiva e testá-la isoladamente.
8. Executar testes e build.
9. Revisar segurança, logs, CORS, autenticação e dados sensíveis.
10. Revisar `git status`, `git diff` e arquivos não rastreados.
11. Criar commits pequenos e coerentes.
12. Fazer push somente da branch.
13. Abrir Pull Request com resumo, testes, riscos e rollback.
14. Corrigir apontamentos da revisão e da CI.
15. Fazer merge na `main` somente após aprovação.
16. Publicar pela pipeline oficial.
17. Executar smoke test e monitorar.
18. Atualizar documentação e registrar decisões importantes.

## 11.2 Modelo de Pull Request

```markdown
## Objetivo
Descreva o problema e o resultado esperado.

## Alterações
- Mudança 1
- Mudança 2

## Banco
- Migration: sim/não
- Backup necessário: sim/não
- Rollback: procedimento

## Segurança
- Autenticação/autorização afetada: sim/não
- Novas variáveis: nomes, sem valores

## Validação
- [ ] Testes backend
- [ ] Build frontend
- [ ] Smoke test local

## Riscos
Liste riscos e mitigação.
```

## 11.3 Definição de pronto

Uma funcionalidade está pronta quando:

- atende aos critérios de aceite;
- possui testes proporcionais ao risco;
- não introduz segredo ou configuração local no Git;
- preserva contratos existentes ou documenta mudança;
- passa no build;
- possui plano de banco e rollback quando aplicável;
- foi revisada;
- foi validada após o deploy.

---

# 12. Checklist de Segurança

## 12.1 Nunca subir

- [ ] `.env`
- [ ] `.env.local`
- [ ] credenciais de banco
- [ ] JWT secrets
- [ ] tokens do Mercado Pago
- [ ] webhook secrets
- [ ] chaves SMTP/Brevo
- [ ] backups SQL reais
- [ ] dados pessoais
- [ ] hashes originados de usuários reais
- [ ] scripts temporários de administração
- [ ] caminhos absolutos do notebook
- [ ] logs com payloads sensíveis

## 12.2 Sempre confirmar

- [ ] `git rev-parse --show-toplevel`
- [ ] `git branch --show-current`
- [ ] `git status --short`
- [ ] `git diff`
- [ ] `git diff --staged`
- [ ] testes executados
- [ ] build executado
- [ ] arquivos ignorados corretamente
- [ ] nenhuma URL local em produção
- [ ] CORS restrito
- [ ] autenticação e autorização preservadas
- [ ] migration validada e backup disponível
- [ ] produção verificada após publicação

## 12.3 Revisão de código sensível

Mudanças nestas áreas exigem atenção adicional:

- `authRoutes.js` e middlewares de autenticação;
- `pedidos.js` e transações de estoque;
- `pagamentos.js` e serviço Mercado Pago;
- migrations;
- upload e validação de imagens;
- carregamento de ambiente;
- CORS, proxy e headers;
- envio de e-mail e logs.

---

# 13. INSTRUÇÕES PARA IA

> [!IMPORTANT]
> Estas instruções são obrigatórias para qualquer IA — Codex, ChatGPT ou equivalente — que analise ou altere o projeto.

## 13.1 Conduta obrigatória

Uma IA deve:

1. confirmar a raiz do repositório antes de usar Git;
2. ler instruções locais do projeto antes de agir;
3. verificar o estado atual e preservar mudanças do usuário;
4. explicar o diagnóstico antes de alterações de risco;
5. limitar alterações ao escopo autorizado;
6. preservar a arquitetura existente;
7. manter compatibilidade entre local e produção;
8. nunca modificar produção sem autorização explícita;
9. nunca acessar ou alterar Railway, Vercel ou Mercado Pago sem autorização;
10. nunca apagar migrations;
11. nunca executar migration sem confirmar banco e pendência;
12. nunca importar dump ou executar SQL destrutivo por suposição;
13. nunca expor `.env`, tokens, senhas ou dados pessoais;
14. nunca substituir imagens ausentes por imagens aleatórias;
15. nunca descartar mudanças existentes para facilitar uma tarefa;
16. usar a instância Axios central para novas chamadas;
17. manter preço e regras críticas no backend;
18. criar testes proporcionais à mudança;
19. executar validações relevantes;
20. informar exatamente arquivos, banco e comportamento alterados.

## 13.2 Antes de alterar

```text
Entender solicitação
      │
      ▼
Inspecionar estado real
      │
      ▼
Identificar riscos e dependências
      │
      ▼
Confirmar escopo e autorização
      │
      ▼
Alterar o mínimo necessário
```

## 13.3 Restrições específicas

- Não alterar frontend quando a tarefa for somente backend, e vice-versa.
- Não mudar regra de negócio para contornar schema incorreto.
- Não aplicar todas as migrations quando apenas uma está pendente.
- Não usar credenciais de produção em testes locais.
- Não tratar retorno do navegador como confirmação de pagamento.
- Não remover idempotência, locks ou validação de estoque.
- Não modificar URLs de retorno do Mercado Pago sem necessidade comprovada.
- Não criar outra configuração paralela se o projeto já oferece um padrão.
- Não commitar arquivos ignorados ou temporários.
- Não afirmar sucesso sem evidência de teste.

## 13.4 Relatório obrigatório da IA

Ao terminar uma mudança, informar:

- causa identificada;
- solução aplicada;
- arquivos alterados;
- banco ou serviços alterados;
- testes executados e resultados;
- limitações ou riscos restantes;
- impacto em produção;
- próximo passo seguro, se houver.

## 13.5 Prevenção de regressões

Uma IA deve comparar o comportamento antes e depois, especialmente para:

- login, cadastro e recuperação;
- carrinho e preço promocional;
- reserva/devolução de estoque;
- expiração e estados do pedido;
- checkout, webhook e reconciliação;
- upload e publicação de imagens;
- CORS e URLs por ambiente;
- migrations já aplicadas.

---

# 14. Histórico

> [!NOTE]
> Esta linha do tempo resume evoluções funcionais do projeto. O histórico Git continua sendo a fonte exata de autoria, commits e datas.

| Etapa | Evolução principal |
|---|---|
| Fundação | Estrutura inicial de frontend React, backend Express e banco MySQL |
| Catálogo | Produtos, categorias, imagens e variações |
| Conta | Cadastro, login, JWT, confirmação e recuperação de senha |
| Compra | Carrinho, favoritos, pedidos e controle de estoque |
| Administração | Gestão de produtos, variações, pedidos e dashboard |
| Robustez | Transações, idempotência, expiração e testes de segurança |
| Pagamentos | Integração Mercado Pago Checkout Pro, webhook e auditoria |
| Operação | Reconciliação de pagamentos tardios e health checks |
| Comunicação | SMTP e integração Brevo |
| Identidade | Layout responsivo, banners, ícones e identidade DL Modas |
| Promoções | Preço promocional por variação e preço efetivo no pedido |
| Migração local | Ambiente XAMPP em porta 3307, `.env.local` e restauração validada |
| Continuidade | Consolidação deste manual oficial 2.0 |

Decisões arquiteturais relevantes:

- Checkout Pro é o meio de pagamento oficial;
- WhatsApp é atendimento, não confirmação de pagamento;
- preço do pedido é recalculado e persistido pelo backend;
- upload é arquivo persistente, não blob no banco;
- migrations são sequenciais e aditivas;
- configurações locais e de produção permanecem separadas.

---

# 15. Checklist Diário

## Início do trabalho

- [ ] Confirmar raiz Git.
- [ ] Confirmar branch atual.
- [ ] Ler `git status --short`.
- [ ] Identificar mudanças existentes que pertencem a outra tarefa.
- [ ] Atualizar a referência da principal de forma segura.
- [ ] Confirmar que XAMPP/MariaDB está no ambiente correto.
- [ ] Confirmar `.env.local` sem expor valores.
- [ ] Iniciar backend e validar `/ready`.
- [ ] Iniciar frontend e validar catálogo.

## Durante o trabalho

- [ ] Manter escopo pequeno.
- [ ] Não alterar produção.
- [ ] Não copiar credenciais para código ou logs.
- [ ] Criar testes junto com a mudança.
- [ ] Registrar decisões não óbvias.
- [ ] Verificar erros do console e backend.
- [ ] Preservar dados e uploads.

## Encerramento

- [ ] Executar testes relevantes.
- [ ] Executar build quando frontend for afetado.
- [ ] Revisar arquivos alterados.
- [ ] Remover artefatos temporários seguros de remover.
- [ ] Confirmar que nenhum serviço de teste ficou ativo desnecessariamente.
- [ ] Documentar pendências.

---

# 16. Checklist antes de Commit

- [ ] Estou no repositório correto.
- [ ] Estou na branch correta.
- [ ] A branch tem propósito claro.
- [ ] `git status --short` foi revisado linha por linha.
- [ ] `git diff` foi revisado integralmente.
- [ ] `git diff --staged` contém somente a mudança pretendida.
- [ ] Não usei `git add .` sem revisão.
- [ ] `.env` e `.env.local` não estão staged.
- [ ] Não há dumps, backups, uploads ou scripts temporários staged.
- [ ] Não há tokens, senhas, e-mails reais ou hashes reais.
- [ ] Não há caminhos absolutos locais.
- [ ] Não há URL localhost em configuração de produção.
- [ ] Testes relevantes passaram.
- [ ] Build passou quando aplicável.
- [ ] Migration possui teste e documentação quando aplicável.
- [ ] O commit não mistura assuntos independentes.
- [ ] A mensagem segue o padrão do projeto.

---

# 17. Checklist antes de Deploy

## Código e Git

- [ ] Deploy parte da `main` oficial.
- [ ] Revisão/PR foi aprovado.
- [ ] CI está verde.
- [ ] Commit implantado foi identificado.
- [ ] Não existem mudanças locais influenciando o artefato.

## Frontend

- [ ] `npm ci` concluído.
- [ ] `npm run build` concluído.
- [ ] `VITE_API_URL` aponta para HTTPS de produção.
- [ ] Nenhum localhost foi incorporado ao build.
- [ ] Navegação e imagens foram testadas.

## Backend

- [ ] `npm ci` concluído.
- [ ] Testes seguros concluídos.
- [ ] Variáveis obrigatórias presentes.
- [ ] CORS contém somente origens autorizadas.
- [ ] `PUBLIC_API_URL` está correta.
- [ ] Scheduler está ativo em uma única instância.
- [ ] Volume de upload está persistente.

## Banco

- [ ] Backup consistente e restaurável.
- [ ] Banco-alvo confirmado.
- [ ] Migrations pendentes identificadas.
- [ ] Pré-condições aprovadas.
- [ ] Plano de rollback/restauração disponível.

## Integrações

- [ ] Mercado Pago no ambiente correto.
- [ ] Webhook cadastrado na URL exata.
- [ ] Collector e moeda validados.
- [ ] Provedor de e-mail configurado.
- [ ] Segredos não aparecem em logs.

## Pós-deploy

- [ ] `/health` e `/ready` respondem 200.
- [ ] Produtos, categorias e imagens carregam.
- [ ] Login e cadastro respondem corretamente.
- [ ] Pedido controlado foi validado.
- [ ] Webhook e reconciliação foram observados.
- [ ] Logs e métricas estão normais.

---

# 18. Glossário

| Termo | Definição no contexto do projeto |
|---|---|
| Commit | Registro imutável de uma mudança coerente no Git |
| Branch | Linha de desenvolvimento isolada da principal |
| Merge | Integração de uma branch em outra |
| Pull Request | Proposta revisável de integração no repositório remoto |
| Push | Envio de commits locais ao repositório remoto |
| Deploy | Publicação de uma versão em um ambiente executável |
| Migration | Script versionado que cria ou evolui o schema do banco |
| Rollback | Retorno a uma versão anterior; para DDL pode exigir restauração de backup |
| Railway | Plataforma usada para backend, banco e infraestrutura persistente de produção |
| Vercel | Plataforma usada para build e hospedagem do frontend |
| JWT | Token assinado usado para autenticação stateless |
| Axios | Cliente HTTP central usado pelo frontend para chamar a API |
| Express | Framework HTTP do backend Node.js |
| React | Biblioteca de componentes usada no frontend |
| HashRouter | Roteamento que mantém a rota após `#`, compatível com hospedagem estática |
| Webhook | Chamada servidor-a-servidor enviada por um provedor para notificar eventos |
| Mercado Pago | Provedor do Checkout Pro e fonte oficial do estado de pagamento |
| Node.js | Runtime JavaScript do backend e ferramentas de build |
| Nodemon | Ferramenta que reinicia o backend durante desenvolvimento |
| Build | Processo que transforma o frontend em artefatos otimizados |
| `dist` | Diretório gerado pelo build Vite |
| Upload | Arquivo enviado e persistido fora do banco |
| `.env` | Arquivo local de variáveis; nunca deve ser versionado |
| `.env.local` | Sobrescrita local específica do desenvolvedor; ignorada pelo Git |
| CORS | Política que controla quais origens de navegador podem chamar o backend |
| API | Contrato HTTP oferecido pelo backend |
| Endpoint | Método e caminho específicos de uma API |
| Middleware | Função Express executada durante o processamento da requisição |
| Hash de senha | Representação irreversível usada no lugar da senha original |
| Idempotência | Propriedade que evita efeitos duplicados ao repetir uma operação |
| Transação | Grupo de operações de banco confirmado ou revertido em conjunto |
| Lock | Bloqueio usado para coordenar alterações concorrentes |
| InnoDB | Engine transacional utilizada por MySQL/MariaDB |
| Pool | Conjunto reutilizável de conexões com o banco |
| Carga útil (payload) | Dados enviados em uma requisição ou evento |
| Smoke test | Verificação rápida dos fluxos essenciais após publicação |
| CI | Automação de testes e verificações a cada mudança |
| PWA | Aplicação web com recursos de instalação e funcionamento semelhante a app |
| SEO | Otimização para mecanismos de busca |
| Scheduler | Processo periódico que expira pedidos pendentes |
| Reconciliação | Tratamento operacional de divergência ou pagamento tardio |
| Volume persistente | Armazenamento que sobrevive a reinícios e novos deploys |

---

## Referências internas

- `README.md`
- `docs/ARQUITETURA.md`
- `docs/API.md`
- `docs/BANCO_DE_DADOS.md`
- `docs/DEPLOY.md`
- `docs/FLUXOS.md`
- `docs/MERCADO_PAGO.md`
- `docs/SEGURANCA.md`
- `docs/TESTES.md`
- `docs/TROUBLESHOOTING.md`
- `backend-loja/migrations/README.md`
- `backend-loja/DEPLOY_BACKEND.md`

> [!IMPORTANT]
> Em caso de divergência entre este manual e o comportamento real, interrompa alterações de risco, inspecione código, migrations e configuração do ambiente, documente a divergência e atualize o manual junto com a correção aprovada.

---

**Fim do Manual Oficial — Projeto DL Modas 2.0**
