import { useEffect, useState } from 'react'
import { getProdutos } from '../services/api'

export default function Produtos() {
  const [produtos, setProdutos] = useState([])

  useEffect(() => {
    getProdutos().then(data => setProdutos(data))
  }, [])

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Produtos</h1>

      {produtos.map(produto => (
        <div key={produto.id}>
          {produto.nome}
        </div>
      ))}
    </div>
  )
}