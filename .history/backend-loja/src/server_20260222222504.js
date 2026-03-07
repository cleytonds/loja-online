import express from "express";
import cors from "cors";
import db from "./config/database.js";

const app = express();

app.use(cors());
app.use(express.json());

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