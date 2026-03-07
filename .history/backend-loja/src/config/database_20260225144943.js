const express = require("express");
const cors = require("cors");
const connection = require("./database");

const app = express();

app.use(cors());
app.use(express.json());

// exemplo de rota
app.get("/produtos", (req, res) => {
  connection.query("SELECT * FROM produtos", (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

app.listen(3000, () => {
  console.log("API rodando na porta 3000");
});