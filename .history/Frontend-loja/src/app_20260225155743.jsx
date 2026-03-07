import Produtos from "./pages/produtos";

function App() {
  return <Produtos />;
}


import { useEffect, useState } from "react"
import { buscarProdutos } from "./services/api"

export default function App() {
  const [produtos, setProdutos] = useState([])

  useEffect(() => {
    buscarProdutos().then(dados => {
      setProdutos(dados)
    })
  }, [])

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Produtos</h1>

      {produtos.map(produto => (
        <div key={produto.id} className="border p-2 mt-2">
          <h2>{produto.nome}</h2>
          <p>R$ {produto.preco}</p>
          <p>Estoque: {produto.estoque}</p>
        </div>
      ))}
    </div>
  )
}