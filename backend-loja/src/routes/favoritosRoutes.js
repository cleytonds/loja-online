import express from 'express';
import db from '../config/database.js';
import { verificarToken } from '../middlewares/auth.js';

const router = express.Router();

// TOGGLE FAVORITO
router.post('/:produtoId', verificarToken, async (req, res) => {
  try {

    const userId = req.user.id;
    const { produtoId } = req.params;

    const [existente] = await db.query(
      'SELECT id FROM favoritos WHERE usuario_id = ? AND produto_id = ?',
      [userId, produtoId],
    );

    if (existente.length > 0) {
      await db.query('DELETE FROM favoritos WHERE usuario_id = ? AND produto_id = ?', [
        userId,
        produtoId,
      ]);

      return res.json({ message: 'removido' });
    }

    await db.query('INSERT INTO favoritos (usuario_id, produto_id) VALUES (?, ?)', [
      userId,
      produtoId,
    ]);

    return res.json({ message: 'adicionado' });
  } catch {
    return res.status(500).json({ error: 'erro favoritos' });
  }
});

// LISTAR FAVORITOS
router.get('/', verificarToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await db.query(
      `
      SELECT 
        p.*,
        pi.url AS imagem_principal

      FROM favoritos f

      JOIN produtos p
      ON p.id = f.produto_id

      LEFT JOIN produto_imagens pi
      ON pi.produto_id = p.id
      AND pi.is_principal = 1

      WHERE f.usuario_id = ?

      `,
      [userId],
    );

    res.json(rows);
  } catch {
    res.status(500).json({
      error: 'erro favoritos',
    });
  }
});

export default router;
