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

      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {itens.map((item) => (
            <div
                key={item.id}
                className="bg-white rounded-lg shadow p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4"
            >
                <div>
                    <h2 className="font-semibold">{item.nome}</h2>
                    <p className="text-gray-600">Qtd: {item.quantidade}</p>
                </div>

                <div className="flex justify-between sm:flex-col sm:items-end gap-2">
                    <span className="font-bold text-green-600">
                        R$ {item.preco * item.quantidade}
                    </span>

                    <button
                        className="bg-red-600 text-white px-3 py-1 rounded"
                        onClick={() => removerItem(item.id)}
                    >
                        Remover
                    </button>
                </div>
            </div>
        ))}

        {/* TOTAL */}
        {itens.length > 0 && (
            <div className="bg-white p-4 rounded-lg shadow flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>R$ {total}</span>
            </div>
        )}
      </div>
    </div>
  );
}