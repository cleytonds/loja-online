# DL Modas

E-commerce de moda feminina com catálogo de produtos e variações, carrinho, pedidos, reserva transacional de estoque, painel administrativo e atendimento ao cliente.

O repositório reúne o frontend da loja, a API e a documentação operacional. A produção utiliza Vercel para o frontend e Railway para o backend.

## Funcionalidades principais

- Catálogo com categorias, variações, imagens e controle de estoque.
- Carrinho, favoritos, perfil e histórico de pedidos.
- Cadastro, autenticação JWT, confirmação de e-mail e recuperação de senha.
- Painel administrativo para produtos, estoque, pedidos e reconciliações.
- Reserva de estoque durante a criação do pedido e expiração controlada.
- Integração de e-mail por Brevo API HTTPS, com fallback SMTP configurável.
- Integração Mercado Pago Checkout Pro versionada e coberta por testes de contrato.

## Arquitetura e tecnologias

| Camada | Tecnologia |
| --- | --- |
| Frontend | React, Vite, Axios e React Router |
| Backend | Node.js, Express e JWT |
| Dados | MySQL ou MariaDB |
| E-mail | Brevo API HTTPS ou SMTP configurável |
| Hospedagem | Vercel (frontend) e Railway (backend) |
| Pagamentos | Mercado Pago Checkout Pro, em integração/homologação controlada |

## Estrutura do repositório

```text
Frontend-loja/             Aplicação React/Vite
backend-loja/              API Express e testes de backend
backend-loja/migrations/   Schema e migrations idempotentes
docs/                      Arquitetura, API, deploy, segurança e testes
.github/workflows/         Integração contínua
```

## Pré-requisitos

- Node.js 22 ou compatível.
- npm.
- MySQL ou MariaDB para executar a API localmente.
- Uma cópia local dos arquivos de ambiente, criada a partir dos exemplos.

## Instalação e desenvolvimento

### Frontend

```bash
cd Frontend-loja
copy .env.example .env
npm ci
npm run dev
```

O frontend usa `VITE_API_URL` para apontar para a URL pública ou local da API.

### Backend

```bash
cd backend-loja
copy .env.example .env
npm ci
npm run dev
```

O backend exige uma instância MySQL/MariaDB configurada pelas variáveis `DB_*`. Não execute migrations em produção sem procedimento aprovado.

## Build e testes

```bash
# Frontend
cd Frontend-loja
node --test tests/celular.test.js tests/paymentReturn.test.js tests/verificarCodigo.contract.test.mjs src/utils/whatsapp.test.js
npm run build

# Backend: testes isolados, sem banco ou APIs reais
cd backend-loja
npm run test:safe
node --test tests/cadastroFlow.test.js tests/emailProvider.test.js
```

O teste `databaseIntegrity.test.js` exige banco configurado e, por isso, não faz parte da suíte segura de CI.

## Variáveis de ambiente

Copie os arquivos `Frontend-loja/.env.example` e `backend-loja/.env.example`. Os valores reais pertencem apenas ao ambiente local ou ao provedor de hospedagem.

| Grupo | Variáveis |
| --- | --- |
| Frontend | `VITE_API_URL` |
| Aplicação | `NODE_ENV`, `PORT`, `FRONT_URL`, `PUBLIC_API_URL`, `CORS_ORIGINS`, `TRUST_PROXY` |
| Banco | `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSL_ENABLED`, `DB_SSL_REJECT_UNAUTHORIZED`, `DB_SSL_CA` |
| Autenticação | `JWT_SECRET` |
| E-mail | `EMAIL_PROVIDER`, `EMAIL_FROM`, `EMAIL_FROM_NAME`, `BREVO_API_KEY`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` |
| Mercado Pago | `MP_ENVIRONMENT`, `MERCADO_PAGO_ACCESS_TOKEN`, `MERCADO_PAGO_WEBHOOK_SECRET`, `MERCADO_PAGO_COLLECTOR_ID`, `MP_MAX_INSTALLMENTS` |
| Operação | `ENABLE_ORDER_SCHEDULER`, `UPLOAD_DIR`, `WHATSAPP_NUMERO` |

Nunca versione `.env`, chaves, tokens, dumps, backups ou credenciais.

## Pedidos, estoque e pagamentos

O pedido é criado com itens e valores validados pelo backend. O estoque é reservado transacionalmente e pedidos pendentes podem expirar conforme a política configurada. O scheduler não deve expirar ou devolver estoque de pedidos já pagos.

O Mercado Pago possui criação de preferência, retorno de checkout, validação oficial de pagamento, assinatura de webhook, idempotência e auditoria de eventos. A homologação final de meios de pagamento, regras de aprovação tardia e operação de produção deve seguir a documentação e um procedimento aprovado antes de qualquer mudança de negócio.

## Segurança

- Autorização por JWT e restrição administrativa nas rotas sensíveis.
- Senhas armazenadas com hash.
- Validação de payloads, uploads e cabeçalhos de segurança.
- CORS configurável por ambiente.
- Tratamento sanitizado de erros e variáveis obrigatórias no runtime.
- Migrations idempotentes e reconciliação operacional para casos de pagamento tardio.

## Deploy

- Frontend: Vercel, com `VITE_API_URL` configurada por ambiente.
- Backend: Railway, com volume persistente para uploads e variáveis configuradas no painel.
- Banco: MySQL Railway ou instância compatível.

Consulte [Deploy](docs/DEPLOY.md), [Arquitetura](docs/ARQUITETURA.md), [API](docs/API.md), [Segurança](docs/SEGURANCA.md), [Testes](docs/TESTES.md), [Migrations](backend-loja/migrations/README.md) e [Mercado Pago](docs/MERCADO_PAGO.md).

## Autoria

Desenvolvido por Cleyton Pereira da Silva para a DL Modas.
