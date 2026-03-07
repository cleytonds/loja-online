import "./produtos.css"; // mantém seu CSS atual
import { useEffect, useState } from "react";
import api from "../services/api"; // mantém seu import existente

export default function Carrinho() {
  const [itens, setItens] = useState([]);
  const [loading, setLoading] = useState(true);

  // Buscar carrinho do usuário
  async function fetchCarrinho() {
    const token = localStorage.getItem("token");
    try {
      const res = await api.get("/carrinho", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setItens(res.data);
    } catch (err) {
      console.error("Erro ao buscar carrinho:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCarrinho();
  }, []);

  // Função para remover item do carrinho
  async function removerItem(id) {
    const token = localStorage.getItem("token");
    try {
      await api.delete(`/carrinho/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Atualiza a lista após remover
      setItens(itens.filter((item) => item.id !== id));
    } catch (err) {
      alert("Erro ao remover item");
    }
  }

  // Calcula total
  const total = itens.reduce((acc, item) => acc + item.preco * item.quantidade, 0);

  if (loading) return <p className="p-10 text-center text-xl">Carregando carrinho...</p>;

  return (
    <div className="min-h-screen bg-gray-100 p-10">
      <h1 className="text-4xl font-bold text-center mb-10 text-gray-800">🛒 Meu Carrinho</h1>

      {itens.length === 0 && (
        <p className="text-center text-gray-600 text-xl">Seu carrinho está vazio</p>
      )}

      <div className="max-w-4xl mx-auto space-y-4">
        {itens.map((item) => (
          <div
            key={item.id}
            className="bg-white p-6 rounded-2xl shadow-lg flex justify-between items-center hover:scale-105 transform transition duration-300"
          >
            <div>
              <h2 className="text-xl font-semibold text-gray-800">{item.nome}</h2>
              <p className="text-gray-600">Quantidade: {item.quantidade}</p>
            </div>
            <div className="text-right">
              <p className="text-green-600 font-bold text-lg">R$ {item.preco * item.quantidade}</p>
              <button
                onClick={() => removerItem(item.id)}
                className="mt-2 bg-red-600 text-white py-1 px-3 rounded-lg hover:bg-red-700 transition"
              >
                Remover
              </button>
            </div>
          </div>
        ))}

        {itens.length > 0 && (
          <div className="bg-white p-6 rounded-2xl shadow-lg flex justify-between items-center font-bold text-xl">
            <span>Total:</span>
            <span>R$ {total}</span>
          </div>
        )}
      </div>
    </div>
  );
}