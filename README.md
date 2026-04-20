# Loja Online - DLmodas 🚀

## 📋 Visão Geral

**DLmodas** é uma loja online completa full-stack com:

- **Frontend**: React + Vite + TailwindCSS + React Router
- **Backend**: Node.js + Express + MySQL + Sequelize/MySQL2
- **Autenticação completa** com JWT, email verification e recuperação de senha
- **Upload de imagens** com Multer + Cloudinary
- **Painel Admin** com dashboard (Recharts)
- **Carrinho persistente** e sistema de pedidos
- **Responsivo** e moderno

## ✨ Funcionalidades Principais

### 👤 **Sistema de Usuários**
- [x] Cadastro com confirmação por email (código + token)
- [x] Login com JWT
- [x] Recuperação de senha (esqueci senha + redefinição)
- [x] Perfil do usuário
- [x] Roles: cliente / admin
- [x] Reenvio de código de confirmação

### 🛒 **Produtos & Catálogo**
- [x] Listagem completa de produtos com imagens
- [x] Filtros por categoria
- [x] Admin: CRUD completo (com upload múltiplo de imagens)
- [x] Variações (tamanho, cor, preço, estoque)
- [x] Busca de produtos

### 🛍️ **Carrinho & Pedidos**
- [x] Carrinho persistente (Context API)
- [x] Mini-carrinho no header
- [x] Checkout e confirmação de pedido
- [x] Histórico de pedidos (Meus Pedidos)
- [x] Favoritos

### 👨‍💼 **Painel Administrativo**
- [x] Dashboard com gráficos (Recharts)
- [x] Gerenciar produtos (Criar/Editar/Excluir)
- [x] Middleware de autenticação admin
- [x] Proteção de rotas

### 📧 **Sistema de Emails**
- [x] Confirmação de cadastro
- [x] Reenvio de código
- [x] Nodemailer integrado

### 🔐 **Segurança**
- [x] JWT tokens (exp 1d)
- [x] bcrypt para senhas
- [x] CORS configurado
- [x] Rate limiting
- [x] Helmet security
- [x] Middleware auth + isAdmin

## 🛠️ Tecnologias Utilizadas

### Backend (`backend-loja/`)
```
Node.js + Express (v5)
MySQL (mysql2 pool) + Sequelize
JWT + bcryptjs
Multer + Cloudinary (upload imagens)
Nodemailer (emails)
dotenv (.env)
cors + helmet + morgan
nodemon (dev)
```

### Frontend (`Frontend-loja/`)
```
React 18 + Vite
React Router DOM
TailwindCSS 4 + PostCSS
React Context (Auth + Carrinho)
Axios (API calls)
React Icons
Recharts (gráficos admin)
```

### Banco de Dados
```
MySQL 8+
Tabelas: usuarios, produtos, categorias, produto_imagens, produto_variacoes, pedidos, carrinho
```

## 🚀 Como Executar

### 1. **Backend**
```bash
cd backend-loja
npm install
# Configurar .env (DB_HOST, JWT_SECRET, etc)
npm run dev
```
**Porta**: 3000

### 2. **Frontend**
```bash
cd Frontend-loja
npm install
npm run dev
```
**Porta**: 5173

### 3. **Banco**
```sql
CREATE DATABASE loja_online;
-- Importar schema (criar se necessário)
```

## 📁 Estrutura do Projeto

```
loja-online/
├── backend-loja/
│   ├── src/
│   │   ├── config/     (DB, upload)
│   │   ├── controllers/
│   │   ├── middlewares/ (auth, admin)
│   │   ├── models/     (Usuario)
│   │   ├── routes/     (auth, produtos, carrinho, pedidos, usuarios)
│   │   └── server.js
│   └── package.json
├── Frontend-loja/
│   ├── src/
│   │   ├── components/ (Header, MiniCarrinho)
│   │   ├── context/    (AuthContext, CarrinhoContext)
│   │   ├── pages/      (Login, Admin, Perfil, etc)
│   │   ├── routes/     (PrivateRoute, AdminRoute)
│   │   └── services/   (api.js)
│   ├── tailwind.config.js
│   └── vite.config.js
└── README.md
```

## 🔗 Rotas da API

```
GET    /produtos           -> Lista produtos
GET    /produtos/categorias -> Categorias
POST   /auth/cadastro      -> Registro
POST   /auth/login         -> Login
POST   /auth/verificar-codigo -> Confirmar conta
GET    /auth/me            -> Dados usuário logado
POST   /carrinho/...       -> Gerenciar carrinho
POST   /pedidos/...        -> Pedidos
POST   /usuarios/...       -> Perfil (protegido)
```

## 📬 Variáveis de Ambiente (.env)

```env
DB_HOST=localhost
DB_USER=root
DB_PASS=
DB_NAME=loja_online
DB_PORT=3307
JWT_SECRET=seu_jwt_secret_aqui
FRONT_URL=http://localhost:5173
PORT=3000
CLOUDINARY_URL=...
```

## 👥 Contribuição

1. Fork o projeto
2. Crie uma branch `feat/nova-funcionalidade`
3. Commit com mensagens claras
4. Push e abra PR

## 📄 Licença

MIT License - Veja `LICENSE` para detalhes.

---

**Desenvolvido com ❤️ por Cleyton** | 🚀 **DLmodas - Loja Online Completa**
