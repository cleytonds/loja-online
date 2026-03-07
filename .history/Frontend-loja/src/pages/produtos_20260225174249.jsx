import "./produtos.css";
import { useEffect, useState } from "react";
import api from "../services/api"; // mantém seu import existente

function Produtos() {
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProdutos() {
      try {
        const res = await api.get("/produtos");
        setProdutos(res.data);
      } catch (err) {
        console.error("Erro ao buscar produtos:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchProdutos();
  }, []);

  async function adicionarAoCarrinho(produtoId) {
    const token = localStorage.getItem("token");
    try {
      await api.post(
        "/carrinho",
        { produto_id: produtoId, quantidade: 1 },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Produto adicionado ao carrinho ✅");
      // Atualiza produtos para refletir estoque
      const res = await api.get("/produtos");
      setProdutos(res.data);
    } catch (err) {
      alert(err.response?.data?.error || "Erro ao adicionar ao carrinho ❌");
    }
  }

  if (loading) return <p className="p-10 text-center text-xl">Carregando produtos...</p>;

  return (
    <div className="min-h-screen bg-gray-100 p-10">
      <h1 className="text-4xl font-bold text-center mb-10 text-gray-800">
        🛍️ Nossos Produtos
      </h1>

      {produtos.length === 0 && (
        <p className="text-center text-gray-600 text-xl">Nenhum produto disponível</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
        {produtos.map((produto) => (
          <div
            key={produto.id}
            className="bg-white rounded-2xl shadow-lg p-6 flex flex-col hover:scale-105 transform transition duration-300"
          >
            <h2 className="text-xl font-semibold text-gray-800 mb-4">{produto.nome}</h2>
            <p className="text-green-600 text-2xl font-bold mb-4">R$ {produto.preco}</p>

            {produto.quantidade === 0 && (
              <p className="text-red-600 font-semibold mb-4">Produto Esgotado</p>
            )}

            <button
              onClick={() => adicionarAoCarrinho(produto.id)}
              disabled={produto.quantidade === 0}
              className={`mt-auto py-2 rounded-lg text-white font-semibold transition
                ${produto.quantidade === 0
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-black hover:bg-gray-800"}`}
            >
              {produto.quantidade === 0 ? "Indisponível" : "Comprar"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Produtos;