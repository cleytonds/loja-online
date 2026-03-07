// src/routes/authRoutes.js
import express from "express";
import { cadastro, login, confirmarEmail } from "../controllers/authController.js";

const router = express.Router();

// Rota de cadastro
router.post("/cadastro", cadastro);

// Rota de login
router.post("/login", login);

// Rota de confirmação de email
router.get("/confirmar/:token", confirmarEmail);

export default router;