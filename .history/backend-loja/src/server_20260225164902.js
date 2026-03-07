import express from "express";
import cors from "cors";
import db from "./config/database.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/produtos", (req, res) => {
  db.query("SELECT * FROM produtos", (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

app.listen(3000, () => {
  console.log("API rodando na porta 3000");
});

const mysql = require("mysql2");

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "", // coloque sua senha do MySQL
  database: "loja_online"
});

db.connect((err) => {
  if (err) throw err;
  console.log("Banco conectado com sucesso!");
});

module.exports = db;