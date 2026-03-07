import express from "express";
import cors from "cors";
import db from "./config/database.js";      // ✔ database.js está em src/config/
import authRoutes from "./routes/authRoutes.js";  // ✔ authRoutes.js está em src/routes/
import carrinhoRoutes from "./routes/carrinhoRoutes.js"; // ✔ carrinhoRoutes.js também em src/routes/
app.use("/", carrinhoRoutes);

const app = express();

app.use(cors());
app.use(express.json());

// Rotas de autenticação
app.use("/", authRoutes);

// Rota para produtos
app.get("/produtos", (req, res) => {
  db.query("SELECT * FROM produtos", (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

app.listen(3000, () => {
  console.log("Servidor rodando na porta 3000");
});