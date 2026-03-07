import { Router } from 'express'
import { db } from '../backend-loja/db.js'

const router = Router()

router.get('/products', async (req, res) => {
  const [rows] = await db.query('SELECT * FROM products')
  res.json(rows)
})

export default router