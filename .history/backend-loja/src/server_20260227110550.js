// Importa o framework Express (criar API)
import express from "express";

// Permite acesso da API pelo frontend (CORS)
import cors from "cors";

// Importa a conexão com o banco de dados
import db from "./config/database.js";

// Importa as rotas de autenticação (login / cadastro)
import authRoutes from "./routes/authRoutes.js";

// Importa as rotas do carrinho
import carrinhoRoutes from "./routes/carrinhoRoutes.js";

// Importa as rotas de produtos
import produtosRoutes from "./routes/products.routes.js";

// Cria a aplicação Express
const app = express();

// ==================
// MIDDLEWARES
// ==================

// Permite requisições de outros domínios (frontend)
app.use(cors());

// Permite receber JSON no body (req.body)
app.use(express.json());

// ==================
// ROTA DE TESTE
// ==================

// Rota raiz para testar se a API está online
app.get("/", (req, res) => {
  res.send("API online 🚀");
});

// ==================
// ROTAS DA APLICAÇÃO
// ==================

// Rotas de autenticação
app.use("/auth", authRoutes);

// Rotas do carrinho
app.use("/carrinho", carrinhoRoutes);

// Rotas de produtos
app.use("/produtos", produtosRoutes);

// ==================
// SERVIDOR
// ==================

// Inicia o servidor na porta 3000
app.listen(3000, () => {
  console.log("Servidor rodando na porta 3000");
});