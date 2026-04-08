import "./produtos.css";
import { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { CarrinhoContext } from "../context/CarrinhoContext";

// 🔥 IMAGENS DE TESTE
const imagensTeste = {
  1: "https://via.placeholder.com/300x350.png?text=Vestido",
  2: "https://via.placeholder.com/300x350.png?text=Blusa",
  3: "https://via.placeholder.com/300x350.png?text=Saia",
  4: "https://via.placeholder.com/300x350.png?text=Calca",
};

// 🔥 CATEGORIAS REAIS
const categorias = [
  "Todas",
  "Blusas e Cropped",
  "Short",
  "Saia e Short saia",
  "Macaquinho",
  "Body",
  "Conjuntos",
  "Calças",
  "Vestidos",
  "Sandália, bolsa e acessórios"
];

// 🔥 MAPEAMENTO (id conforme sua tabela)
const mapaCategorias = {
  "Blusas e Cropped": 1,
  "Short": 2,
  "Saia e Short saia": 3,
  "Macaquinho": 4,
  "Body": 5,
  "Conjuntos": 6,
  "Calças": 7,
  "Vestidos": 8,
  "Sandália, bolsa e acessórios": 9
};

function Produtos() {
  const [produtos, setProdutos] = useState([]);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState("Todas");
  const [busca, setBusca] = useState(""); // 🔎 busca automática
  const [menuAberto, setMenuAberto] = useState(false);
  const [loading, setLoading] = useState(true);
  const [animando, setAnimando] = useState(false);

  const navigate = useNavigate();
  const { adicionarAoCarrinho } = useContext(CarrinhoContext);

  // 🔥 BUSCAR PRODUTOS DO BACKEND
  useEffect(() => {
    async function fetchProdutos() {
      try {
        const res = await api.get("/produtos", { params: { nome: busca } });

        if (Array.isArray(res.data)) {
          const dadosCorrigidos = res.data.map(p => ({
            ...p,
            id: Number(p.id),
            preco: Number(p.preco)
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
  }, [busca]); // 🔄 busca automática ao digitar

  // 🔥 ADICIONAR AO CARRINHO
  function handleAdicionar(produto) {
    adicionarAoCarrinho(produto);
    setAnimando(true);
    setTimeout(() => setAnimando(false), 300);
  }

  function comprarAgora(produto) {
    adicionarAoCarrinho(produto);
    navigate("/carrinho");
  }

  // 🔥 LOADING
  if (loading) {
    return (
      <div className="grid-produtos">
        {[1,2,3,4,5,6].map((i) => (
          <div key={i} className="skeleton"></div>
        ))}
      </div>
    );
  }

  // 🔥 FILTRO POR CATEGORIA + BUSCA
  const produtosFiltrados = produtos.filter(p => {
    // Filtra por categoria
    if (categoriaSelecionada !== "Todas") {
      const categoriaId = mapaCategorias[categoriaSelecionada];
      if (p.categoria_id !== categoriaId) return false;
    }

    // Filtra por busca (nome)
    if (busca.trim() !== "") {
      return p.nome.toLowerCase().includes(busca.toLowerCase());
    }

    return true;
  });

  return (
    <div className="loja-container">

      {/* 🔎 BUSCA */}
      <div className="busca-container">
        <input
          type="text"
          placeholder="Buscar produtos..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="busca-input"
        />
      </div>

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
                className={`menu-item ${categoriaSelecionada === cat ? "ativo" : ""}`}
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

      {/* GRID DE PRODUTOS */}
      <div className="produtos-grid">
        {produtosFiltrados.map((produto) => (
          <div key={produto.id} className="produto-card">

            <img
              src={produto.imagem || imagensTeste[produto.id] || "https://picsum.photos/300/350"}
              alt={produto.nome}
              className="produto-img"
            />

            <h2 className="produto-nome">{produto.nome}</h2>
            <p className="produto-preco">R$ {produto.preco.toFixed(2)}</p>

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