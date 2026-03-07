import "./produtos.css"; // mantém seu CSS
import { useEffect, useState } from "react";
import api from "../services/api"; // mantém seu import

function Produtos() {
  // Lista de produtos
  const [produtos, setProdutos] = useState([]);

  // Controle de carregamento
  const [loading, setLoading] = useState(true);

  // Busca os produtos ao carregar a página
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

      // Atualiza produtos para refletir estoque
      const res = await api.get("/produtos");
      setProdutos(res.data);
    } catch (err) {
      alert(err.response?.data?.error || "Erro ao adicionar ao carrinho ❌");
    }
  }

  // Tela de carregamento
  if (loading) {
    return (
      <p className="p-10 text-center text-xl">
        Carregando produtos...
      </p>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-6 md:px-10">
      {/* Título */}
      <h1 className="text-2xl md:text-4xl font-bold text-center mb-8 text-gray-800">
        Moda Feminina 
      </h1>

      {/* Mensagem se não houver produtos */}
      {produtos.length === 0 && (
        <p className="text-center text-gray-600 text-xl">
          Nenhum produto disponível
        </p>
      )}

      {/* Grid responsivo */}
      <div
        className="
          grid
          grid-cols-1
          sm:grid-cols-2
          md:grid-cols-3
          lg:grid-cols-4
          gap-6
          max-w-7xl
          mx-auto
        "
      >
        {produtos.map((produto) => (
          <div
            key={produto.id}
            className="bg-white rounded-xl shadow-md p-4 flex flex-col"
          >
            {/* Nome */}
            <h2 className="font-semibold text-lg text-gray-800 mb-2">
              {produto.nome}
            </h2>

            {/* Preço */}
            <p className="text-pink-600 font-bold text-xl mb-3">
              R$ {produto.preco}
            </p>

            {/* Botão */}
            <button
              onClick={() => adicionarAoCarrinho(produto.id)}
              className="
                mt-auto
                bg-pink-600
                text-white
                py-3
                rounded-lg
                hover:bg-pink-700
                transition
                font-semibold
              "
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