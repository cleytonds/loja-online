// Carrega variáveis de ambiente do arquivo .env
import dotenv from "dotenv";
dotenv.config();

// Importa bibliotecas
import express from "express";
import cors from "cors";

// Importa conexão com o banco MySQL
import db from "./config/database.js";

// Importa rotas
import authRoutes from "./routes/authRoutes.js";
import carrinhoRoutes from "./routes/carrinhoRoutes.js";
import produtosRoutes from "./routes/products.routes.js";

// Cria aplicação Express
const app = express();


// ===== MIDDLEWARES =====

// Permite que o frontend acesse a API
app.use(cors());

// Permite receber JSON no body das requisições
app.use(express.json());


// ===== ROTAS DA API =====

// Rotas de autenticação (cadastro, login, confirmação)
app.use("/auth", authRoutes);

// Rotas do carrinho
app.use("/carrinho", carrinhoRoutes);

// Rotas de produtos
app.use("/produtos", produtosRoutes);


// ===== ROTA DE TESTE =====

// Acessando http://localhost:3000
app.get("/", (req, res) => {
  res.send("API online 🚀");
});


// ===== INICIA O SERVIDOR =====

app.listen(3000, "0.0.0.0", () => {
  console.log("API rodando em todas as interfaces");
});