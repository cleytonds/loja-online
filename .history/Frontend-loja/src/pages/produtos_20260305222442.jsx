import "./produtos.css";
import { useEffect, useState } from "react";
import api from "../services/api";

// Imagens de teste ligadas ao ID do produto
// A chave (1, 2, 3...) deve ser o ID que vem do banco
const imagensTeste = {
  1: "https://via.placeholder.com/300x350.png?text=Vestido+Rosa",
  2: "https://via.placeholder.com/300x350.png?text=Blusa+Feminina",
  3: "https://via.placeholder.com/300x350.png?text=Saia+Elegante",
  4: "https://via.placeholder.com/300x350.png?text=Calca+Feminina",
};

function Produtos() {
  // Lista de produtos
  const [produtos, setProdutos] = useState([]);

  // Controle de carregamento
  const [loading, setLoading] = useState(true);

  // Busca produtos do backend
  useEffect(() => {
    async function fetchProdutos() {
      try {
        const res = await api.get("/produtos");
        console.log("PRODUTOS DO BACKEND:", res.data);
        setProdutos(res.data);
      } catch (err) {
        console.error("Erro ao buscar produtos:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchProdutos();
  }, []);

  // Adiciona produto ao carrinho
  async function adicionarAoCarrinho(produtoId) {
    const token = localStorage.getItem("token");

    if (!token) {
      alert("Faça login para comprar 🛒");
      return;
    }

    try {
      await api.post(
        "/carrinho",
        { produto_id: produtoId, quantidade: 1 },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert("Produto adicionado ao carrinho ✅");
    } catch (err) {
      alert(err.response?.data?.error || "Erro ao adicionar ao carrinho ❌");
    }
  }

  // Tela de carregamento
  if (loading) {
    return <p className="p-10 text-center text-xl">Carregando produtos...</p>;
  }

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-6 md:px-10">
      {/* Título */}
      <h1 className="text-2xl md:text-4xl font-bold text-center mb-8 text-gray-800">
        Moda Feminina
      </h1>

      {/* Grid de produtos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
        {produtos.map((produto, index) => (
          <div
            key={produto.id}
            className="bg-white rounded-xl shadow-md p-4 flex flex-col"
          >
            {/* Imagem do produto */}
            <img
              src={
                imagensTeste[produto.id] ||
                "https://via.placeholder.com/300x350.png?text=Produto"
              }
              alt={produto.nome}
              className="rounded-lg mb-3 object-cover"
            />

            {/* Nome */}
            <h2 className="font-semibold text-lg text-gray-800 mb-1">
              {produto.nome}
            </h2>

            {/* Preço */}
            <p className="text-pink-600 font-bold text-xl mb-2">
              R$ {produto.preco}
            </p>

            {/* Cores disponíveis (simulação) */}
            <div className="mb-3">
              <p className="text-sm text-gray-600 mb-1">Cores disponíveis:</p>
              <div className="flex gap-2">
                <span className="w-5 h-5 rounded-full bg-black border"></span>
                <span className="w-5 h-5 rounded-full bg-pink-500 border"></span>
                <span className="w-5 h-5 rounded-full bg-white border"></span>
              </div>
            </div>

            {/* Botão comprar (menor) */}
            <button
              onClick={() => adicionarAoCarrinho(produto.id)}
              className="mt-auto bg-pink-600 text-white py-2 text-sm rounded-md hover:bg-pink-700 transition"
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