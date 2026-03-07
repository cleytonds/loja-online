import { DataTypes } from "sequelize";
import db from "../config/database.js";

const Usuario = db.define("Usuario", {
  nome: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  senha: { type: DataTypes.STRING, allowNull: false },
  ativo: { type: DataTypes.BOOLEAN, defaultValue: false },
  tokenConfirmacao: { type: DataTypes.STRING },
});

await db.sync(); // garante que a tabela seja criada

export default Usuario;