import express from "express";
import cors from "cors";
import db from "./config/database.js";      
import authRoutes from "./routes/authRoutes.js";  
import carrinhoRoutes from "./routes/carrinhoRoutes.js"; 

const app = express();  // ← Cria o app primeiro

// Middlewares
app.use(cors());
app.use(express.json());

// Rota raiz – teste da API
app.get("/", (req, res) => {
  res.send("API online 🚀");
});

// Rotas
app.use("/", authRoutes);
app.use("/", carrinhoRoutes);

// Rota para produtos
app.get("/produtos", (req, res) => {
  db.query("SELECT * FROM produtos", (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

// Inicializa servidor
app.listen(3000, () => {
  console.log("Servidor rodando na porta 3000");
});