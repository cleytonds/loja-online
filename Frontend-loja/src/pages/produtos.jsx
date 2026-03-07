import "./produtos.css";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

const imagensTeste = {
  1: "https://via.placeholder.com/300x350.png?text=Vestido",
  2: "https://via.placeholder.com/300x350.png?text=Blusa",
  3: "https://via.placeholder.com/300x350.png?text=Saia",
  4: "https://via.placeholder.com/300x350.png?text=Calca",
};

const categorias = [
  "Todas",
  "Blusas e Cropped",
  "Short",
  "Saia e Short saia",
  "Macaquinho",
  "Bory",
  "Conjuntos",
  "Calças",
  "Vestidos",
  "Sandália, bolsa e acessórios"
];

function Produtos() {

  const [produtos, setProdutos] = useState([]);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState("Todas");
  const [menuAberto, setMenuAberto] = useState(false);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

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

  if (loading) {
    return <p className="loading">Carregando produtos...</p>;
  }

  const produtosFiltrados =
    categoriaSelecionada === "Todas"
      ? produtos
      : produtos.filter(p => p.categoria === categoriaSelecionada);

  return (

    <div className="loja-container">

      <h1 className="titulo-loja"></h1>

      {/* MENU DE CATEGORIAS */}

      <div className="menu-categorias">

        <button
          className="menu-btn"
          onClick={() => setMenuAberto(!menuAberto)}
        >
          ☰ Categorias
        </button>

        {menuAberto && (

          <div className="menu-dropdown">

            {categorias.map((cat) => (

              <div
                key={cat}
                className="menu-item"
                onClick={() => {
                  setCategoriaSelecionada(cat);
                  setMenuAberto(false);
                }}
              >
                {cat}
              </div>

            ))}

          </div>

        )}

      </div>

      {/* PRODUTOS */}

      <div className="produtos-grid">

        {produtosFiltrados.map((produto) => (

          <div key={produto.id} className="produto-card">

            <img
              src={
                imagensTeste[produto.id] ||
                "https://via.placeholder.com/300x350"
              }
              alt={produto.nome}
              className="produto-img"
            />

            <h2 className="produto-nome">{produto.nome}</h2>

            <p className="produto-preco">
              R$ {produto.preco}
            </p>

            <div className="produto-botoes">

              <button
                onClick={() => adicionarAoCarrinho(produto)}
                className="btn-carrinho"
              >
                🛒 Carrinho
              </button>

              <button
                onClick={() => comprarAgora(produto)}
                className="btn-comprar"
              >
                Comprar
              </button>

            </div>

          </div>

        ))}

      </div>

    </div>

  );
}

export default Produtos;