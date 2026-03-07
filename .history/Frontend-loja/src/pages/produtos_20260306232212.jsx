import "./produtos.css";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

// Imagens de teste ligadas ao ID do produto
const imagensTeste = {
  1: "https://via.placeholder.com/300x350.png?text=Vestido+Rosa",
  2: "https://via.placeholder.com/300x350.png?text=Blusa+Feminina",
  3: "https://via.placeholder.com/300x350.png?text=Saia+Elegante",
  4: "https://via.placeholder.com/300x350.png?text=Calca+Feminina",
};

function Produtos() {

  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  // Buscar produtos do backend
  useEffect(() => {
    async function fetchProdutos() {
      try {
        const res = await api.get("/produtos");
        console.log("PRODUTOS:", res.data);
        setProdutos(res.data);
      } catch (err) {
        console.error("Erro ao buscar produtos:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchProdutos();
  }, []);

  // ADICIONAR AO CARRINHO
  function adicionarAoCarrinho(produto) {

    let carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];

    const itemExistente = carrinho.find(p => p.id === produto.id);

    if (itemExistente) {
      itemExistente.quantidade += 1;
    } else {
      carrinho.push({
        id: produto.id,
        nome: produto.nome,
        preco: produto.preco,
        quantidade: 1
      });
    }

    localStorage.setItem("carrinho", JSON.stringify(carrinho));

    alert("Produto adicionado ao carrinho 🛒");
  }

  // COMPRAR AGORA
  function comprarAgora(produto) {

    let carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];

    carrinho.push({
      id: produto.id,
      nome: produto.nome,
      preco: produto.preco,
      quantidade: 1
    });

    localStorage.setItem("carrinho", JSON.stringify(carrinho));

    navigate("/carrinho");
  }

  // Loading
  if (loading) {
    return <p className="p-10 text-center text-xl">Carregando produtos...</p>;
  }

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-6 md:px-10">

      <h1 className="text-2xl md:text-4xl font-bold text-center mb-8 text-gray-800">
        Moda Feminina
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">

        {produtos.map((produto) => (

          <div
            key={produto.id}
            className="bg-white rounded-xl shadow-md p-4 flex flex-col"
          >

            <img
              src={
                imagensTeste[produto.id] ||
                "https://via.placeholder.com/300x350.png?text=Produto"
              }
              alt={produto.nome}
              className="rounded-lg mb-3 object-cover"
            />

            <h2 className="font-semibold text-lg text-gray-800 mb-1">
              {produto.nome}
            </h2>

            <p className="text-pink-600 font-bold text-xl mb-2">
              R$ {produto.preco}
            </p>

            <div className="mb-3">
              <p className="text-sm text-gray-600 mb-1">
                Cores disponíveis:
              </p>

              <div className="flex gap-2">
                <span className="w-5 h-5 rounded-full bg-black border"></span>
                <span className="w-5 h-5 rounded-full bg-pink-500 border"></span>
                <span className="w-5 h-5 rounded-full bg-white border"></span>
              </div>
            </div>

            {/* BOTÕES */}
            <div className="flex gap-2 mt-auto">

              <button
                onClick={() => adicionarAoCarrinho(produto)}
                className="flex-1 bg-gray-200 text-black py-2 text-sm rounded-md hover:bg-gray-300 transition"
              >
                🛒 Carrinho
              </button>

              <button
                onClick={() => comprarAgora(produto)}
                className="flex-1 bg-pink-600 text-white py-2 text-sm rounded-md hover:bg-pink-700 transition"
              >
                ⚡ Comprar
              </button>

            </div>

          </div>

        ))}

      </div>
    </div>
  );
}

export default Produtos;