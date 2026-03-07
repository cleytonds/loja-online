import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import db from "./config/database.js";           // Conexão com MySQL
import authRoutes from "./routes/authRoutes.js"; // Rotas de autenticação
import carrinhoRoutes from "./routes/carrinhoRoutes.js"; // Rotas do carrinho
import produtosRoutes from "./routes/products.routes.js"; // Rotas de produtos

const app = express();


// Middlewares
app.use(cors());
app.use(express.json());

// Rotas da API
app.use("/auth", authRoutes);       // autenticação
app.use("/carrinho", carrinhoRoutes); // carrinho
app.use("/produtos", produtosRoutes); // produtos

// Rota raiz – teste
app.get("/", (req, res) => {
  res.send("API online 🚀");
});

// Inicia o servidor
app.listen(3000, "0.0.0.0", () => {
  console.log("API rodando em todas as interfaces");
});