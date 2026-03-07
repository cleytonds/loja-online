import { useEffect, useState } from "react"
import { buscarProdutos } from "./services/api"

export default function App() {
  const [produtos, setProdutos] = useState([])

  useEffect(() => {
    buscarProdutos()
      .then(dados => {
        setProdutos(dados)
      })
      .catch(err => {
        console.error("Erro ao buscar produtos:", err)
      })
  }, [])

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">Produtos</h1>

      {produtos.length === 0 && (
        <p>Nenhum produto carregado</p>
      )}

      {produtos.map(produto => (
        <div key={produto.id} className="border p-4 mb-3 rounded">
          <h2 className="font-semibold">{produto.nome}</h2>
          <p>R$ {produto.preco}</p>
          <p>Estoque: {produto.quantidade}</p>
        </div>
      ))}
    </div>
  )
}