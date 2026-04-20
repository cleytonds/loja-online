import mysql from "mysql2/promise";

// 🔥 POOL DE CONEXÕES (mais rápido e estável)
const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",
  database: "loja_online",
  port: 3307,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

console.log("Banco conectado com Pool de conexões!");

export default db;