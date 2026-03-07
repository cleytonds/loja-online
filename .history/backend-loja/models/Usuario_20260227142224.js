import { DataTypes } from "sequelize";
import db from "../config/database.js"; // seu arquivo de conexão com o banco

const Usuario = db.define("Usuario", {
  nome: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  senha: { type: DataTypes.STRING, allowNull: false },
  ativo: { type: DataTypes.BOOLEAN, defaultValue: false },
  tokenConfirmacao: { type: DataTypes.STRING },
});

export default Usuario;