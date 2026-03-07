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

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {produtos.map(produto => (
          <div
            key={produto.id}
            className="border rounded-lg p-4 shadow hover:shadow-lg transition"
          >
            <h2 className="font-semibold text-lg">{produto.nome}</h2>

            <p className="text-gray-600 mt-2">
              R$ {produto.preco}
            </p>

            <p className="text-sm text-gray-500">
              Estoque: {produto.estoque}
            </p>

            <button className="mt-4 w-full bg-black text-white py-2 rounded">
              Ver produto
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}