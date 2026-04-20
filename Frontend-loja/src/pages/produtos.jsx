import "./produtos.css";
import { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { CarrinhoContext } from "../context/CarrinhoContext";

function Produtos() {
  const [produtos, setProdutos] = useState([]);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState("Todas");
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);

  // 🔥 controle de variação selecionada por produto
  const [variacaoSelecionada, setVariacaoSelecionada] = useState({});

  const navigate = useNavigate();
  const { adicionarAoCarrinho } = useContext(CarrinhoContext);

  // =========================
  // CARREGAR PRODUTOS
  // =========================
  useEffect(() => {
    async function fetchProdutos() {
      try {
        const res = await api.get("/produtos", {
          params: { nome: busca }
        });

        setProdutos(res.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchProdutos();
  }, [busca]);

  // =========================
  // ESCOLHER VARIAÇÃO
  // =========================
  function selecionarVariacao(produtoId, variacao) {
    setVariacaoSelecionada(prev => ({
      ...prev,
      [produtoId]: variacao
    }));
  }

  // =========================
  // ADICIONAR AO CARRINHO
  // =========================
  function handleAdicionar(produto) {
    const variacao = variacaoSelecionada[produto.id];

    if (!variacao) {
      alert("Selecione tamanho/cor primeiro");
      return;
    }

    adicionarAoCarrinho(produto, variacao);
  }

  function comprarAgora(produto) {
    const variacao = variacaoSelecionada[produto.id];

    if (!variacao) {
      alert("Selecione tamanho/cor primeiro");
      return;
    }

    adicionarAoCarrinho(produto, variacao);
    navigate("/carrinho");
  }

  // =========================
  // LOADING
  // =========================
  if (loading) {
    return <h2>Carregando...</h2>;
  }

  return (
    <div className="loja-container">

      {/* BUSCA */}
      <input
        placeholder="Buscar produtos..."
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
      />

      {/* GRID */}
      <div className="produtos-grid">

        {produtos.map(produto => (
          <div key={produto.id} className="produto-card">

            {/* IMAGEM */}
            <img
              src={produto.imagem}
              alt={produto.nome}
            />

            <h2>{produto.nome}</h2>

            {/* =========================
                VARIAÇÕES
            ========================= */}
            <div className="variacoes">

              {produto.variacoes?.map(v => (
                <button
                  key={v.id}
                  onClick={() => selecionarVariacao(produto.id, v)}
                  className={
                    variacaoSelecionada[produto.id]?.id === v.id
                      ? "variacao ativo"
                      : "variacao"
                  }
                >
                  {v.tamanho} | {v.cor} | R$ {v.preco}
                </button>
              ))}

            </div>

            {/* PREÇO DINÂMICO */}
            <p className="preco">
              R$ {
                variacaoSelecionada[produto.id]?.preco ||
                produto.variacoes?.[0]?.preco ||
                0
              }
            </p>

            {/* BOTÕES */}
            <button onClick={() => handleAdicionar(produto)}>
              🛒 Carrinho
            </button>

            <button onClick={() => comprarAgora(produto)}>
              Comprar
            </button>

          </div>
        ))}

      </div>
    </div>
  );
}

export default Produtos;