const express = require("express");
const app = express();
const db = require("./config/database");

app.use(express.json());

// rota de teste
app.get("/produtos", (req, res) => {
  db.query("SELECT * FROM produtos", (err, results) => {
    if (err) {
      return res.status(500).json(err);
    }
    res.json(results);
  });
});

app.listen(3000, () => {
  console.log("API rodando na porta 3000");
});