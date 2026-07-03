# DLmodas

## Plataforma de E-commerce Full Stack

Sistema completo para gerenciamento de loja virtual,
produtos, clientes, pedidos e vendas.

Tecnologias:
React | Node.js | Express | MySQL

## 1. Nome do projeto

**Loja Online - DLmodas**

## 2. Descrição geral do sistema

Aplicação **full stack de e-commerce** com catálogo de produtos, variações (cor/tamanho/estoque), carrinho, pedidos, favoritos e um painel administrativo para gestão de produtos. O sistema inclui autenticação com **JWT**, **cadastro com verificação por email** (código/confirmação) e **recuperação de senha**.

## 3. Objetivo do projeto

Fornecer uma base completa de e-commerce com:

- Interface React (páginas públicas e áreas protegidas)
- API REST em Node.js/Express
- Persistência em MySQL
- Fluxos de autenticação e segurança (JWT + bcrypt + email)
- Evolução do módulo de **perfil do usuário** (dados pessoais, senha e favoritos)

## 4. Funcionalidades principais

### Autenticação & Usuários

- Cadastro com confirmação por email (código + token)
- Login com **JWT**
- Recuperação de senha por email (fluxo de redefinição conforme ambiente)
- Perfil do usuário:
  - Buscar dados do usuário logado
  - Atualizar `nome`, `email`, `foto` (update parcial)
  - Alterar senha exigindo senha atual (bcrypt)
- Favoritos (listar e remover/alternar)

### Catálogo de Produtos

- Listagem de produtos com imagens e variações
- Detalhe do produto (imagens + variações)
- Categoria (endpoint de categorias)

### Carrinho & Pedidos

- Carrinho associado ao usuário
- Checkout/criação de pedido (cria pedido e itens)
- Listagem de pedidos do usuário
- Cancelamento e repetição de pedido (conforme rotas existentes)

### Painel Administrativo

- Dashboard com gráficos (Recharts)
- CRUD de produtos com upload múltiplo de imagens
- Controle de acesso por role (`tipo: admin`)

> Observação: caso alguma funcionalidade dependa de infraestrutura externa (ex.: provedor de email/serviços), configura conforme ambiente.

## 5. Tecnologias utilizadas

### Frontend

- **React 18**
- **Vite**
- **React Router DOM**
- **Axios**
- **Context API** (Auth e Carrinho)
- **Recharts** (dashboard admin)
- **TailwindCSS** (configurado no projeto)

### Backend

- **Node.js**
- **Express**
- **MySQL** (mysql2)
- **JWT**
- **bcryptjs**
- **Multer** (upload local de imagens em `uploads/`)
- **Nodemailer** (envio de emails conforme ambiente)

## 6. Arquitetura do projeto

### 6.1 Frontend

- Usa `HashRouter` para navegação
- Páginas principais:
  - **Home** (`/`)
  - **Produtos** (`/produtos`)
  - **Detalhe do Produto** (`/produto/:id`)
  - **Carrinho** (`/carrinho`)
  - **Meus Pedidos** (`/meus-pedidos`)
  - **Favoritos** (`/favoritos`)
  - **Login / Cadastro / Fluxos de senha**
  - **Perfil** (rotas protegidas, `/perfil`)
  - **Admin** (rotas protegidas, `/admin`)
- Proteções:
  - `PrivateRoute` para rotas autenticadas
  - `AdminRoute` para rotas do painel administrativo
- Comunicação:
  - `src/services/api.js` (Axios) chamando o backend em `http://localhost:3000`

### 6.2 Backend

- Express com rotas organizadas por domínio:
  - `/auth`
  - `/produtos`
  - `/carrinho`
  - `/pedidos`
  - `/usuarios`
  - `/favoritos`
- Autenticação:
  - Middleware `verificarToken` decodifica JWT e injeta `req.user`
  - Controle de acesso admin por `req.user.tipo`
- Banco:
  - `src/config/database.js` cria pool com `mysql2/promise`
  - Consultas SQL via `db.query` / `await`

### 6.3 Banco de dados (MySQL)

- Persistência via MySQL e relacionamentos entre:
  - `usuarios`
  - `produtos`, `categorias`
  - `produto_imagens`, `produto_variacoes`
  - `carrinho`
  - `pedidos`, `pedido_itens`
  - `favoritos`

> O schema exato (DDL/tabelas/colunas) deve ser definido conforme o ambiente e migrações/SQL do projeto.

### 6.4 Comunicação via API

- O frontend faz chamadas HTTP para os endpoints REST do backend via Axios.
- Auth:
  - token JWT é enviado no header `Authorization: Bearer <token>`.

## 7. Estrutura de pastas (árvore)

### Frontend

```text
Frontend-loja/
 ├── src/
 │   ├── components/
 │   │   ├── Header.jsx
 │   │   ├── MiniCarrinho.jsx
 │   │   └── ...
 │   ├── context/
 │   │   ├── AuthContext.jsx
 │   │   └── CarrinhoContext.jsx
 │   ├── pages/
 │   │   ├── Home.jsx
 │   │   ├── produtos.jsx
 │   │   ├── ProdutoDetalhe.jsx
 │   │   ├── Carrinho.jsx
 │   │   ├── Favoritos.jsx
 │   │   ├── Perfil.jsx
 │   │   ├── Admin.jsx
 │   │   └── ...
 │   ├── routes/
 │   │   ├── PrivateRoute.jsx
 │   │   └── AdminRoute.jsx
 │   └── services/
 │       └── api.js
 └── vite.config.js
```

### Backend

```text
backend-loja/
 ├── src/
 │   ├── config/
 │   │   ├── database.js
 │   │   ├── upload.js
 │   │   └── ...
 │   ├── controllers/
 │   │   ├── authController.js
 │   │   ├── usuarioPerfilController.js
 │   │   ├── produtoController.js
 │   │   └── ...
 │   ├── middlewares/
 │   │   ├── auth.js
 │   │   └── isAdmin.js
 │   ├── routes/
 │   │   ├── authRoutes.js
 │   │   ├── products.routes.js
 │   │   ├── carrinhoRoutes.js
 │   │   ├── pedidos.js
 │   │   ├── usuariosRoutes.js
 │   │   └── favoritosRoutes.js
 │   └── server.js
 └── package.json
```

## 8. Principais telas (Frontend)

- **Home (`/`)**: landing page da loja
- **Produtos (`/produtos`)**: listagem de catálogo
- **Detalhes do produto (`/produto/:id`)**: exibe imagens e variações
- **Carrinho (`/carrinho`)**: itens selecionados e navegação para checkout
- **Favoritos (`/favoritos`)**: lista de produtos marcados como favoritos
- **Login/Cadastro/Fluxos de senha**: rotas `/login`, `/cadastro`, `/esqueci-senha`, `/redefinir-senha/:token`, `/confirmar/:token`
- **Painel Administrativo (`/admin`)**: gestão de produtos + dashboard

## 9. Principais APIs (Backend)

> Prefixos são definidos em `backend-loja/src/server.js`.

### Rotas de usuários / perfil

- `GET /usuarios/perfil` — dados do usuário logado
- `PUT /usuarios/perfil` — atualiza `nome`, `email`, `foto` (update parcial)
- `PUT /usuarios/senha` — altera senha (senha atual + nova, bcrypt)
- `GET /usuarios/favoritos` — lista favoritos (conforme tabela e estrutura do ambiente)

### Rotas de produtos

- `GET /produtos` — lista produtos ativos
- `GET /produtos/categorias` — lista categorias
- `GET /produtos/:id` — detalhe do produto + imagens + variações
- Endpoints admin (protegidos):
  - `POST /produtos`
  - `PUT /produtos/:id`
  - `DELETE /produtos/:id`
  - upload via `multer` (`imagens`)

### Rotas do carrinho

- `POST /carrinho/carrinho` (ver implementação exata da rota no código)
- `GET /carrinho/carrinho` — lista carrinho do usuário
- `DELETE /carrinho/carrinho/:id` — remove item do carrinho

### Rotas de favoritos

- `GET /favoritos` — lista favoritos do usuário
- `POST /favoritos/:produtoId` — alterna favorito (adiciona/remove)

> Observação: o projeto também utiliza `/usuarios/favoritos` no módulo de perfil.

### Rotas de pedidos

- `POST /pedidos` — cria pedido a partir do carrinho
- `GET /pedidos/meus/:usuario_id` — lista pedidos do usuário (conforme rota)
- `PUT /pedidos/cancelar/:pedido_id` — cancela
- `POST /pedidos/repetir/:pedido_id` — repete pedido

## 10. Autenticação JWT

- **Login**: endpoint em `/auth/login` retorna `{ token, usuario }`
- **Token**: enviado no header `Authorization` como `Bearer <token>`
- **Proteção de rotas**:
  - Middleware `verificarToken` valida token e injeta `req.user`
  - `isAdmin` valida `req.user.tipo === 'admin'`

## 11. Banco de dados (tabelas, relacionamentos e fluxo)

Com base nos endpoints SQL do projeto, o fluxo típico é:

- Usuário se autentica (JWT)
- Catálogo consulta `produtos`, `produto_imagens` e `produto_variacoes`
- Carrinho e pedidos usam tabelas relacionadas por `usuario_id` e chaves de produtos/variações
- Favoritos usa `favoritos` (relaciona `usuario_id` + `produto_id`)

> O schema exato (DDL completo) não foi incluído no repositório analisado. Configure conforme ambiente.

## 12. Como instalar o projeto

### Backend

```bash
cd backend-loja
npm install
npm run dev
```

### Frontend

```bash
cd Frontend-loja
npm install
npm run dev
```

> Portas:

- Backend: `3000`
- Frontend: `5173`

## 13. Configuração das variáveis de ambiente (.env)

O projeto usa `dotenv` no backend. Exemplo (ajuste conforme ambiente):

```env
DB_HOST=localhost
DB_USER=root
DB_PASS=root123
DB_NAME=loja_online
DB_PORT=3307

JWT_SECRET=seu_jwt_secret
FRONT_URL=http://localhost:5173

PORT=3000
```

> Se houver configuração de email e/ou outros serviços, configure conforme os arquivos do projeto (`services/mailer` e `utils/email`).

## 14. Como executar localmente

1. Subir MySQL com o banco `loja_online` (ou outro nome conforme `.env`)
2. Iniciar backend:
   ```bash
   cd backend-loja
   npm run dev
   ```
3. Iniciar frontend:
   ```bash
   cd Frontend-loja
   npm run dev
   ```
4. Acessar o frontend em `http://localhost:5173`

## 15. Melhorias futuras sugeridas

- Padronizar respostas JSON (formato de sucesso/erro) em toda a API
- Unificar estratégia de acesso ao banco (evitar mistura de callback vs async/await)
- Implementar paginação e filtros avançados no catálogo
- Melhorar robustez de favoritos (ex.: normalização de duplicidade, índices no MySQL)
- Melhorar observabilidade (logs estruturados e métricas)
- Refinar segurança: validação de entrada (schema validation), rate limiting e proteção adicional

## 16. Aprendizados

- Integração completa React + Express com API REST
- Autenticação JWT e rotas protegidas (auth middleware + role-based access)
- Uso de bcrypt para alteração segura de senha
- Implementação de fluxos de verificação por email e confirmação
- Modelagem relacional no MySQL para produtos, variações, carrinho, pedidos e favoritos
- Upload e persistência de imagens para catálogo
- Construção de dashboard administrativo com dados do banco

## 17. Deploy

### Frontend (Vercel)

1. Build do frontend:
   ```bash
   cd Frontend-loja
   npm install
   npm run build
   ```
2. Configurar variável base de API (ajustar `baseURL` conforme domínio do backend)
3. Publicar no Vercel

### Backend (Render / Railway)

1. Build do backend:
   ```bash
   cd backend-loja
   npm install
   npm run dev  # ou comando equivalente de produção no ambiente
   ```
2. Configurar variáveis de ambiente (`.env`) no provedor
3. Publicar o serviço e apontar o frontend para o endpoint público do backend

---

## Contato / Créditos

**DLmodas - Loja Online Completa**
