import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";

import db from "./config/database.js";
import path from "path";



// ✅ ROTAS
import authRoutes from "./routes/authRoutes.js";
import carrinhoRoutes from "./routes/carrinhoRoutes.js";
import produtosRoutes from "./routes/products.routes.js";
import pedidosRoutes from "./routes/pedidos.js";
import usuariosRoutes from "./routes/usuariosRoutes.js";

const app = express();


app.use("/uploads", express.static(path.resolve("uploads")));

// ✅ MIDDLEWARES PRIMEIRO
app.use(cors({
  origin: [
    process.env.FRONT_URL,
    "http://localhost:5173"
  ],
  credentials: true
}));

app.use(express.json());

// ✅ DEPOIS AS ROTAS
app.use("/auth", authRoutes);
app.use("/carrinho", carrinhoRoutes);
app.use("/produtos", produtosRoutes);
app.use("/pedidos", pedidosRoutes);
app.use("/usuarios", usuariosRoutes);

// rota de teste
app.get("/", (req, res) => {
  res.send("API online 🚀");
});

// servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`API rodando em todas as interfaces na porta ${PORT}`);
});