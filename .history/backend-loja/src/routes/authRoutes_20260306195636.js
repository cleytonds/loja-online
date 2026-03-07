import express from "express";
import {
  cadastro,
  verificarCodigo,
  login
} from "../controllers/authController.js";

const router = express.Router();

router.post("/cadastro", cadastro);

router.post("/verificar-codigo", verificarCodigo);

router.post("/login", login);

export default router;