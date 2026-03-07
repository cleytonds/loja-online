const mysql = require("mysql2");

const connection = mysql.createConnection({
  host: "localhost",
  port: 3307,              // 👈 MUITO IMPORTANTE
  user: "root",
  password: "",
  database: "loja_online"
});

connection.connect(err => {
  if (err) {
    console.error("Erro ao conectar no banco:", err);
    return;
  }
  console.log("Banco conectado com sucesso!");
});

module.exports = connection;