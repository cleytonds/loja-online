import express from "express";
import cors from "cors";
import db from "./config/database.js";      
import authRoutes from "./routes/authRoutes.js";  
import carrinhoRoutes from "./routes/carrinhoRoutes.js"; 
import produtosRoutes from "./routes/products.routes.js";

const app = express();  // ← Cria o app primeiro

// Middlewares
app.use(cors());
app.use(express.json());

// Rota raiz – teste da API
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