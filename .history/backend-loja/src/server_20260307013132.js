// server.js
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";

import db from "./config/database.js";
import pedidosRoutes from "./routes/pedidos.js";

app.use("/pedidos", pedidosRoutes);


// rotas
import authRoutes from "./routes/authRoutes.js";
import carrinhoRoutes from "./routes/carrinhoRoutes.js";
import produtosRoutes from "./routes/products.routes.js";

const app = express();

// middlewares
app.use(cors());
app.use(express.json());

// rotas
app.use("/auth", authRoutes);
app.use("/carrinho", carrinhoRoutes);
app.use("/produtos", produtosRoutes);

// rota de teste
app.get("/", (req, res) => {
  res.send("API online 🚀");
});

// servidor
app.listen(3000, "0.0.0.0", () => {
  console.log("API rodando em todas as interfaces");
});