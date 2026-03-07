import express from 'express'
import cors from 'cors'
import productsRoutes from './routes/products.routes.js'

const app = express()

app.use(cors())
app.use(express.json())

app.use('/api', productsRoutes)

app.listen(3333, () => {
  console.log('🚀 Backend rodando em http://localhost:3333')
})