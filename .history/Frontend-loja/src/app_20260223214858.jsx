import { useEffect, useState } from 'react'
import { getProdutos } from './services/api'
import Produtos from './pages/Produtos'

export default function App() {
  return <Produtos />
}

export default function App() {
  const [produtos, setProdutos] = useState([])

  useEffect(() => {
    getProdutos().then(data => setProdutos(data))
  }, [])

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">Produtos</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {produtos.map(produto => (
          <div
            key={produto.id}
            className="border rounded-lg p-4 shadow"
          >
            <h2 className="font-semibold">{produto.nome}</h2>
            <p className="text-gray-600">R$ {produto.preco}</p>
            <p className="text-sm">Estoque: {produto.estoque}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
