import "./produtos.css";
import { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { CarrinhoContext } from "../context/CarrinhoContext";

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
  const [animando, setAnimando] = useState(false);

  const navigate = useNavigate();

  // ✅ PEGA DO CONTEXTO (CORRETO)
  const { adicionarAoCarrinho } = useContext(CarrinhoContext);

  useEffect(() => {
  async function fetchProdutos() {
    try {
      const res = await api.get("/produtos");

      if (Array.isArray(res.data)) {
        const dadosCorrigidos = res.data.map(p => ({
          ...p,
          id: Number(p.id),        // ✅ força número
          preco: Number(p.preco)  // ✅ garante cálculo correto
        }));

        setProdutos(dadosCorrigidos);
      } else {
        setProdutos([]);
      }

    } catch (err) {
      console.error("Erro ao buscar produtos:", err);
      setProdutos([]);
    } finally {
      setLoading(false);
    }
  }

  fetchProdutos();
}, []);

  // ✅ ANIMAÇÃO + ADD
  function handleAdicionar(produto) {
    adicionarAoCarrinho(produto);

    setAnimando(true);
    setTimeout(() => setAnimando(false), 300);
  }

  function comprarAgora(produto) {
    adicionarAoCarrinho(produto);
    navigate("/carrinho");
  }

  // LOADING
  if (loading) {
    return (
      <div className="grid-produtos">
        {[1,2,3,4,5,6].map((i) => (
          <div key={i} className="skeleton"></div>
        ))}
      </div>
    );
  }

  // FILTRO
  const produtosFiltrados = produtos.filter(p => {
    if (categoriaSelecionada === "Todas") return true;
    return p.categoria === categoriaSelecionada;
  });

  return (
    <div className="loja-container">

      {/* MENU */}
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
              R$ {Number(produto.preco).toFixed(2)}
            </p>

            <div className="produto-botoes">

              <button
                onClick={() => handleAdicionar(produto)}
                className={`btn-carrinho ${animando ? "animar" : ""}`}
              >
                🛒
              </button>

              <button
                onClick={() => comprarAgora(produto)}
                className="btn-comprar"
              >
                COMPRAR
              </button>

            </div>

          </div>

        ))}

      </div>

    </div>
  );
}

export default Produtos;