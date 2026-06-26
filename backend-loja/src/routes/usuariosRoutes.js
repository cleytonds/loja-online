import express from 'express';
import { verificarToken } from '../middlewares/auth.js';
import {
  getPerfil,
  putPerfil,
  putSenha,
  getFavoritos,
} from '../controllers/usuarioPerfilController.js';

const router = express.Router();

// ✅ PERFIL (único endpoint /perfil, substitui implementação antiga sem duplicar rota)
router.get('/perfil', verificarToken, getPerfil);
router.put('/perfil', verificarToken, putPerfil);

// ✅ SENHA
router.put('/senha', verificarToken, putSenha);

// ✅ FAVORITOS (leitura simples)
router.get('/favoritos', verificarToken, getFavoritos);

export default router;
