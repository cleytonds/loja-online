import { useEffect, useState } from "react";
import api from "../services/api.js";

export default function Carrinho() {
  const [itens, setItens] = useState([]);
  const [loading, setLoading] = useState(true);

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

  async function removerItem(id) {
    alert("Função de remover item pode ser implementada no backend");
  }

  const total = itens.reduce(
    (acc, item) => acc + item.preco * item.quantidade,
    0
  );

  if (loading)
    return (
      <p className="p-10 text-center text-lg md:text-xl">
        Carregando carrinho...
      </p>
    );

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-6 md:p-10">
      <h1 className="text-2xl md:text-4xl font-bold text-center mb-6 md:mb-10 text-gray-800">
        🛒 Meu Carrinho
      </h1>

      {itens.length === 0 && (
        <p className="text-center text-gray-600 text-lg md:text-xl">
          Seu carrinho está vazio
        </p>
      )}

      <div className="max-w-4xl mx-auto space-y-4">
        {itens.map((item) => (
          <div
            key={item.id}
            className="bg-white p-4 md:p-6 rounded-xl shadow-lg flex flex-col md:flex-row md:justify-between md:items-center gap-4"
          >
            {/* Info do produto */}
            <div>
              <h2 className="text-lg md:text-xl font-semibold text-gray-800">
                {item.nome}
              </h2>
              <p className="text-gray-600 text-sm md:text-base">
                Quantidade: {item.quantidade}
              </p>
            </div>

            {/* Preço + botão */}
            <div className="flex justify-between md:flex-col md:text-right items-center md:items-end gap-3">
              <p className="text-green-600 font-bold text-lg">
                R$ {item.preco * item.quantidade}
              </p>
              <button
                onClick={() => removerItem(item.id)}
                className="bg-red-600 text-white py-1 px-4 rounded-lg hover:bg-red-700 transition text-sm md:text-base"
              >
                Remover
              </button>
            </div>
          </div>
        ))}

        {/* TOTAL */}
        {itens.length > 0 && (
          <div className="bg-white p-4 md:p-6 rounded-xl shadow-lg flex justify-between items-center font-bold text-lg md:text-xl">
            <span>Total:</span>
            <span className="text-green-600">R$ {total}</span>
          </div>
        )}
      </div>
    </div>
  );
}