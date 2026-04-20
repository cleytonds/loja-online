import express from "express";
import Usuario from "../models/Usuario.js";
import { verificarToken } from "../middlewares/auth.js";

const router = express.Router();

router.put("/perfil", verificarToken, (req, res) => {
  const { nome, foto } = req.body;
  const userId = req.user.id;

  if (!nome) {
    return res.status(400).json({ error: "Nome obrigatório" });
  }

  Usuario.atualizarPerfil(userId, nome, foto, (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Erro ao atualizar perfil" });
    }

    res.json({ id: userId, nome, foto });
  });
});

export default router;