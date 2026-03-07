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

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 p-4">
        {produtos.map((produto) => (
          <div className="bg-white rounded-xl shadow p-4 flex flex-col">
            <h2 className="font-semibold text-lg mb-2">{produto.nome}</h2>

            <p className="text-green-600 font-bold text-xl mb-2">
            R$ {produto.preco}
            </p>

            <button className="mt-auto bg-blue-600 text-white py-2 rounded hover:bg-blue-700" onClick={() => adicionarAoCarrinho(produto.id)}>
            Adicionar ao carrinho
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Produtos;