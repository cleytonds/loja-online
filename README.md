# DLmodas — Loja Online (Full Stack)

Plataforma de e-commerce full stack para catálogo de produtos (com variações), carrinho, favoritos, pedidos e painel administrativo. O sistema inclui autenticação via JWT, cadastro com confirmação por email e fluxo de pagamento via PIX (manual) com envio de comprovante por WhatsApp.

---

## Destaques do Projeto

- Sistema completo de e-commerce full stack com autenticação JWT
- Reserva de estoque com expiração automática de pedidos
- Fluxo de checkout com pagamento PIX manual + WhatsApp
- Painel administrativo com CRUD de produtos e dashboard
- Controle de variações (cor, tamanho, preço e estoque)
- Arquitetura separada (React + Node + MySQL)

Projeto desenvolvido com foco em simular uma loja real em produção.

## 1. Visão Geral

O **DLmodas** é um sistema completo de loja virtual que permite:

- Consumidores navegarem pelo catálogo, verem detalhes, escolherem variações (cor/tamanho) e adicionarem itens ao carrinho.
- Autenticarem-se para acessar carrinho, favoritos, perfil e histórico de pedidos.
- Criar pedidos a partir do carrinho com **reserva de estoque** e **expiração automática**.
- Realizar pagamento **PIX** exibindo a chave e acionando o envio de comprovante via WhatsApp.
- Administradores gerenciarem produtos (CRUD com upload de imagens), visualizarem gráficos/dados e atualizarem status dos pedidos manualmente.

---

## 2. Tecnologias Utilizadas

### Frontend

- **React**
- **React Router DOM**
- **Axios**
- **Context API** (Auth e Carrinho)
- **Recharts** (dashboard/admin)
- **React Icons**

### Backend

- **Node.js**
- **Express**
- **MySQL** (via `mysql2`)
- **JWT** (`jsonwebtoken`)
- **Multer** (upload local de imagens em `uploads/`)
- **Nodemailer** (envio de emails)
- **dotenv**

---

## 3. Estrutura Completa de Pastas

A árvore abaixo reflete a organização do repositório conforme os arquivos presentes.

```text
.
├── README.md
├── package.json
├── Frontend-loja/
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   ├── vite.config.js
│   ├── public/
│   │   ├── banner-fashion.jpg.png
│   │   ├── banner1.jpg
│   │   ├── banner2.jpg
│   │   └── banner3.jpg
│   ├── src/
│   │   ├── App.css
│   │   ├── App.jsx
│   │   ├── index.css
│   │   ├── login.css
│   │   ├── main.jsx
│   │   ├── routes/
│   │   │   ├── AdminRoute.jsx
│   │   │   ├── PrivateRoute.jsx
│   │   │   └── (outros arquivos em src/routes/)
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── config/
│   │   │   └── pagamento.js
│   │   ├── context/
│   │   │   ├── AuthContext.jsx
│   │   │   └── CarrinhoContext.jsx
│   │   ├── components/
│   │   │   ├── Header.jsx
│   │   │   ├── MiniCarrinho.jsx
│   │   │   ├── IconeCarrinho.jsx
│   │   │   ├── ProtectedRoute.jsx
│   │   │   └── (outros componentes em src/components/)
│   │   └── pages/
│   │       ├── Home.jsx
│   │       ├── produtos.jsx
│   │       ├── ProdutoDetalhe.jsx
│   │       ├── Carrinho.jsx
│   │       ├── Favoritos.jsx
│   │       ├── MeusPedidos.jsx
│   │       ├── Perfil.jsx
│   │       ├── Admin.jsx
│   │       ├── EditarProduto.jsx
│   │       ├── Pagamento.jsx
│   │       ├── Busca.jsx
│   │       ├── Login.jsx
│   │       ├── Cadastro.jsx
│   │       ├── VerificarCodigo.jsx
│   │       ├── Confirmacao.jsx
│   │       ├── EsqueciSenha.jsx
│   │       ├── RedefinirSenha.jsx
│   │       └── (demais páginas em src/pages/)
│   └── dist/
│       └── index.html
│
└── backend-loja/
    ├── package.json
    ├── package-lock.json
    ├── .gitignore
    ├── server.js (entry em src/server.js)
    ├── uploads/
    │   └── (imagens enviadas via upload)
    └── src/
        ├── server.js
        ├── config/
        │   ├── database.js
        │   ├── upload.js
        │   └── (demais configs em src/config/)
        ├── routes/
        │   ├── authRoutes.js
        │   ├── carrinhoRoutes.js
        │   ├── products.routes.js
        │   ├── pedidos.js
        │   ├── usuariosRoutes.js
        │   └── favoritosRoutes.js
        ├── controllers/
        │   ├── authController.js
        │   ├── produtoController.js
        │   ├── usuarioPerfilController.js
        │   └── (demais controllers em src/controllers/)
        ├── middlewares/
        │   ├── auth.js
        │   └── isAdmin.js
        ├── models/
        │   └── Usuario.js
        ├── services/
        │   ├── api.js
        │   └── mailer.js
        ├── utils/
        │   └── email.js
        └── (demais pastas em src/)
```

> Observação: o README acima lista os diretórios que existem no projeto. Arquivos “adicionais” estão mencionados como **(demais arquivos em ...)** quando a listagem completa não foi expandida linha a linha.

---

## 4. Fluxo da Aplicação

### 4.1 Cadastro

1. O usuário envia **nome, email e senha** para `POST /auth/cadastro`.
2. O backend:
   - normaliza o email,
   - valida senha e verifica duplicidade,
   - faz hash da senha,
   - gera **código** e um **token_confirmacao**,
   - salva na tabela `usuarios` com `ativo = 0`.
3. O sistema envia um email com um link para o frontend:
   - `FRONT_URL/#/confirmar/<tokenConfirmacao>`
4. O usuário confirma a conta informando **token + código**.

### 4.2 Confirmação

- A confirmação acontece via `POST /auth/verificar-codigo`.
- No frontend, a página `Confirmacao` / `VerificarCodigo` faz a chamada e, ao sucesso, redireciona para `/login`.

### 4.3 Login e JWT

1. O usuário envia **email e senha** para `POST /auth/login`.
2. O backend valida:
   - email,
   - senha (bcrypt),
   - se `ativo === 1`.
3. Retorna:
   - `token` (JWT) e um objeto `usuario`.
   - o token expira em **1d**.
4. No frontend, o token é armazenado em `localStorage` e anexado automaticamente nas requests via `src/services/api.js`.

### 4.4 Produtos e Variações

- Listagem e detalhe do produto:
  - `GET /produtos` retorna produtos ativos com `categoria_nome`, `imagem_principal` e um array `variacoes`.
  - `GET /produtos/:id` retorna produto + imagens + variações.
- Variações incluem `cor`, `tamanho`, `preco`, `estoque`.

### 4.5 Carrinho

- A adição ao carrinho e a atualização de estoque são tratadas no backend:
  - `POST /carrinho/carrinho` (token obrigatório)
  - `GET /carrinho/carrinho` (token obrigatório)
  - `DELETE /carrinho/carrinho/:id` (token obrigatório)
- No frontend, o carrinho também possui persistência local via `CarrinhoContext` (armazenando itens em `localStorage`).

### 4.6 Favoritos

- Alternar favorito:
  - `POST /favoritos/:produtoId` (token obrigatório)
- Listar favoritos:
  - `GET /favoritos` (token obrigatório)
- O frontend faz o toggle e atualiza a lista.

### 4.7 Checkout e Criação de Pedido

- Ao finalizar a compra (em `src/pages/Carrinho.jsx`), o frontend envia para:
  - `POST /pedidos` com `{ itens: [...] }`
- O backend:
  - valida estoque de cada variação,
  - soma o total,
  - cria o pedido com `status = 'pendente'`,
  - define `expires_at = NOW() + 10 minutos`,
  - grava `pedido_itens`,
  - reserva estoque subtraindo a quantidade de `produto_variacoes.estoque`.

### 4.8 Pagamento PIX (fluxo atual)

O projeto realiza pagamento PIX de forma **manual**:

1. O cliente acessa a tela de pagamento (`src/pages/Pagamento.jsx`).
2. A página exibe:
   - **Chave PIX**: `dayaneferreiral1905@gmail.com`
3. Ao clicar em **“Já paguei - enviar comprovante”**, o frontend:
   - carrega o pedido em `GET /pedidos/meus`,
   - verifica se o status não é `expirado`,
   - faz `PUT /pedidos/:id/status` com `status: 'Pendente'`,
   - monta uma mensagem com os itens e abre um link do WhatsApp:
     - `https://wa.me/55<numero>?text=<mensagem>`

> O envio do comprovante é feito pelo WhatsApp via mensagem (não há upload do comprovante no código atual).

### 4.9 Painel Administrativo

- Rota do admin (frontend): `/admin`
- A proteção do admin é feita no frontend via `AdminRoute` (checa `user.tipo === 'admin'`).
- No backend, as rotas admin usam:
  - `verificarToken` + `isAdmin`.

No painel (`src/pages/Admin.jsx`), o admin:

- vê produtos,
- cria/edita/exclui produtos com upload de múltiplas imagens,
- vê gráficos (Recharts),
- visualiza pedidos e atualiza status manualmente com `PUT /pedidos/:id/status`.

### 4.10 Perfil

- `Perfil` usa o token e chama:
  - `GET /pedidos/meus` (para histórico)
  - `GET/PUT /usuarios/perfil` (dados pessoais)
  - `PUT /usuarios/senha` (alteração de senha)
  - `GET /usuarios/favoritos` não é usado direto no Perfil; favoritos são acessados em `/favoritos`.

### 4.11 Pedidos, Controle de Estoque e Expiração Automática

- Ao criar pedido, o estoque é reservado subtraindo em `produto_variacoes`.
- O backend executa um `setInterval` em `backend-loja/src/routes/pedidos.js` a cada **60 segundos** para:
  - buscar pedidos com `status = 'pendente'` e `expires_at < NOW()`,
  - devolver estoque somando novamente em `produto_variacoes`,
  - atualizar `pedidos.status` para `'expirado'`.

---

## 5. Fluxo do Pedido (exatamente como funciona hoje)

1. **Cliente cria pedido**
   - Frontend envia `POST /pedidos` com itens.
2. **Pedido fica como “pendente”**
   - Backend grava `status = 'pendente'`.
3. **Estoque é reservado**
   - Backend valida `produto_variacoes.estoque` e subtrai `estoque` ao inserir `pedido_itens`.
4. **Cliente realiza pagamento PIX (manual)**
   - Tela `/pagamento` exibe a chave PIX.
5. **Cliente envia comprovante via WhatsApp**
   - Ao clicar “Já paguei - enviar comprovante”, o frontend abre um link do WhatsApp com mensagem contendo pedido e itens.
6. **Administrador analisa**
   - O admin visualiza pedidos no painel.
7. **Administrador altera o status do pedido manualmente**
   - Admin chama `PUT /pedidos/:id/status` enviando `status` (ex.: `'pago'` ou `'enviado'`).
8. **Se o pedido expirar (10 minutos)**
   - Backend muda status para **`'expirado'`** automaticamente.
   - O estoque reservado é **devolvido automaticamente** durante a rotina de expiração.

---

## 6. Segurança

- **JWT** (`jsonwebtoken`):
  - login em `POST /auth/login` retorna `token`.
  - middleware `backend-loja/src/middlewares/auth.js` valida `Authorization: Bearer <token>` e injeta `req.user`.
- **dotenv**:
  - `backend-loja/src/server.js` carrega `.env`.
- **Autenticação Bearer**:
  - o frontend envia `Authorization: Bearer ${token}` nas requests.
- **CORS**:
  - habilitado no backend via `cors(...)` com `origin` baseado em `process.env.CORS_ORIGINS`.
- **Uploads**:
  - `multer` salva imagens localmente em `backend-loja/uploads/`.
- **Proteção de rotas**:
  - admin utiliza `isAdmin` (verifica `req.user.tipo === 'admin'`).

---

## 7. Variáveis de Ambiente

> Valores e nomes abaixo foram baseados no que o código usa diretamente.

### Backend

```env
PORT=

CORS_ORIGINS=

DB_HOST=
DB_PORT=
DB_USER=
DB_PASSWORD=
DB_NAME=

JWT_SECRET=

FRONT_URL=

# SMTP (utilizado por utils/email.js)
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=

# Opcional para TLS no Nodemailer
SMTP_SECURE=
```

- **PIX_KEY**: no código do backend, a chave PIX aparece hardcoded em `backend-loja/src/routes/pedidos.js` como:
  - `dayaneferreiral1905@gmail.com`

### Frontend

```env
VITE_API_URL=
```

> Observação: no frontend, o Axios está configurado com baseURL fixo `http://localhost:3000` em `src/services/api.js`. O README documenta `VITE_API_URL` apenas como variável potencial se você optar por usar (mas o código atual não está consumindo ela diretamente).

---

## 8. Como Executar

### Backend

1. Instale dependências:
   ```bash
   cd backend-loja
   npm install
   ```
2. Configure `.env` com `JWT_SECRET`, `FRONT_URL`, credenciais do MySQL e SMTP.
3. Inicie em modo de desenvolvimento:
   ```bash
   npm run dev
   ```
4. A API roda em `http://localhost:3000`.

### Frontend

1. Instale dependências:
   ```bash
   cd Frontend-loja
   npm install
   ```
2. Inicie:
   ```bash
   npm run dev
   ```
3. Acesse: `http://localhost:5173`.

### Banco (MySQL)

- O backend utiliza MySQL via `mysql2/promise` em `src/config/database.js`.
- Garanta que o schema contenha tabelas usadas nas consultas do código (ex.: `usuarios`, `produtos`, `produto_variacoes`, `produto_imagens`, `categorias`, `carrinho`, `favoritos`, `pedidos`, `pedido_itens`).

---

## 9. Funcionalidades Implementadas

- ✔ Cadastro de usuário
- ✔ Confirmação de conta por email (token + código)
- ✔ Reenvio de código
- ✔ Login com JWT
- ✔ Proteção de rotas (Auth Bearer)
- ✔ Produtos (listagem e detalhe)
- ✔ Categorias (endpoint para listagem)
- ✔ Variações (cor/tamanho/preço/estoque)
- ✔ Carrinho (Context + persistência local)
- ✔ Favoritos (toggle e listagem)
- ✔ Checkout / criação de pedido
- ✔ Pagamento PIX (manual) com:
  - exibição de chave PIX
  - envio de comprovante via WhatsApp (mensagem)
- ✔ Painel Administrativo
- ✔ Dashboard com gráficos (Recharts)
- ✔ CRUD de produtos (com upload múltiplo de imagens)
- ✔ Controle de estoque (reserva ao criar pedido)
- ✔ Expiração automática de pedidos (10 minutos)
- ✔ Atualização de status do pedido pelo admin
- ✔ Perfil do usuário (dados pessoais e alteração de senha)
- ✔ Histórico de pedidos

---

## 10. Melhorias Futuras

- Integração oficial de pagamento PIX (ex.: gateway que gere QR Code/charge)
- Mercado Pago / PagSeguro / Stripe (gateways adicionais)
- Deploy automatizado (CI/CD)
- Docker para backend/frontend
- Cloudinary para substituir uploads locais
- Cache/filas para tarefas assíncronas (ex.: emails, relatórios)
- Observabilidade com logs estruturados e métricas
- Rate limiting mais consistente em rotas sensíveis

---

## 11. Arquitetura

Fluxo geral:

- **Frontend** (React + React Router)
  ↓
- **API REST**
  ↓
- **Express**
  ↓
- **JWT** (Bearer token)
  ↓
- **MySQL** (persistência)

---

## 12. Banco de Dados (principais tabelas)

As tabelas são inferidas pelas consultas SQL presentes no código:

- `usuarios`
- `produtos`
- `produto_variacoes`
- `pedido_itens`
- `pedidos`
- `favoritos`
- `carrinho`
- Além disso, também são usadas nas queries:
  - `produto_imagens`
  - `categorias`

---

## 13. Deploy (preparação para produção)

- Garantir variáveis via `.env`:
  - `dotenv` no backend
  - `JWT_SECRET` e `FRONT_URL`
- Configurar CORS (`CORS_ORIGINS` no backend)
- Garantir persistência de uploads (atualmente em disco/local `uploads/`)
- Configurar conexão MySQL (host/port/user/pass/db)
- Prover `SMTP_*` para envio de emails
- Provisionar servidor e rota da API (o frontend hoje usa baseURL fixa)

---

## 14. Licença

MIT License. Veja o arquivo [LICENSE](LICENSE) (não incluído neste README) ou adicione conforme necessário.

---

## Contato / Créditos

**DLmodas** — Loja Online Full Stack

## Status do Projeto

✔ Projeto funcional e em evolução contínua  
✔ Arquitetura pronta para produção  
✔ Base preparada para integração com gateways de pagamento reais (PIX automático, Stripe, Mercado Pago)

## Autor:

Desenvolvido por Cleyton Silva  
Projeto full stack focado em Node.js + React + MySQL
