// src/routes/authRoutes.js
import { Router } from "express";
import { cadastro, login, confirmarEmail } from "../controllers/authController.js";

const router = Router();

// Rotas de autenticação
router.post("/cadastro", cadastro);
router.post("/login", login);
router.get("/confirmar/:token", confirmarEmail);

export default router;