import { Sequelize } from "sequelize";

const db = new Sequelize("loja_online", "root", "", {
  host: "localhost",
  port: 3307,
  dialect: "mysql",
  logging: false,
});

try {
  await db.authenticate();
  console.log("Banco conectado com sucesso!");
} catch (err) {
  console.error("Erro ao conectar no banco:", err);
}

export default db;