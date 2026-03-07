import express from 'express'
import cors from 'cors'

const app = express()

app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
  res.send('Backend da loja rodando 🚀')
})

app.listen(3333, () => {
  console.log('Servidor rodando na porta 3333')
})