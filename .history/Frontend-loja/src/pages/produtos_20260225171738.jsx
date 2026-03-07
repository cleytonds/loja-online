import "./produtos.css";
import { useEffect, useState } from "react";
import api from "../services/api";
import api from "../services/api.js";

function adicionarAoCarrinho(produtoId) {
  const token = localStorage.getItem("token");
  api.post(
    "/carrinho",
    { produto_id: produtoId, quantidade: 1 },
    { headers: { Authorization: `Bearer ${token}` } }
  )
  .then(() => alert("Produto adicionado ao carrinho"))
  .catch(() => alert("Erro ao adicionar ao carrinho"));
}

function Produtos() {
  const [produtos, setProdutos] = useState([]);

  useEffect(() => {
    api.get("/produtos").then(res => setProdutos(res.data));
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-10">
      <h1 className="text-3xl font-bold text-center mb-10">
        🛍️ Nossos Produtos
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {produtos.map(produto => (
          <div
            key={produto.id}
            className="bg-white rounded-xl shadow-md p-6 flex flex-col"
          >
            <h2 className="text-xl font-semibold mb-2">
              {produto.nome}
            </h2>

            <p className="text-green-600 text-2xl font-bold mb-2">
              R$ {produto.preco}
            </p>

            <p className="text-gray-600 mb-4">
              Estoque: {produto.quantidade}
            </p>

            <button
              onClick={() => adicionarAoCarrinho(produto.id)}
              className="mt-auto bg-black text-white py-2 rounded-lg hover:bg-gray-800 transition"
              >
              
              Comprar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Produtos;