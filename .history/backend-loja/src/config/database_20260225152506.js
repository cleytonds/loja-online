import mysql from "mysql2";

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "loja_online",
});

db.connect((err) => {
  if (err) {
    console.error("Erro ao conectar no banco:", err);
  } else {
    console.log("Banco conectado com sucesso!");
  }
});

export default db;