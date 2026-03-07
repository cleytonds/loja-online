import express from "express";

import {
  cadastro,
  verificarCodigo,
  login
} from "../controllers/authController.js";

const router = express.Router();


// rota de cadastro
router.post("/cadastro", cadastro);


// rota para verificar código enviado por email
router.post("/verificar-codigo", verificarCodigo);


// rota de login
router.post("/login", login);


export default router;