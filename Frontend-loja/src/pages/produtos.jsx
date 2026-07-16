// src/pages/Produtos.jsx

import './produtos.css';

import { useEffect, useState, useContext, useMemo } from 'react';

import { useNavigate } from 'react-router-dom';

import api from '../services/api';

import { CarrinhoContext } from '../context/CarrinhoContext';

function Produtos() {
  const [produtos, setProdutos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [favoritos, setFavoritos] = useState([]);

  const [categoriaSelecionada, setCategoriaSelecionada] = useState('Todas');

  const [busca, setBusca] = useState('');

  const [loading, setLoading] = useState(true);
  const [buscaDebounced, setBuscaDebounced] = useState('');

  const navigate = useNavigate();

  const { adicionarAoCarrinho } = useContext(CarrinhoContext);

  // =========================
  // VERIFICAR FAVORITO
  // =========================

  const favoritosIds = useMemo(() => new Set(favoritos.map((favorito) => favorito.id)), [favoritos]);
  const isFavorito = (produtoId) => favoritosIds.has(produtoId);

  useEffect(() => {
    const timer = setTimeout(() => setBuscaDebounced(busca), 300);
    return () => clearTimeout(timer);
  }, [busca]);

  // =========================
  // CARREGAR PRODUTOS
  // =========================
  useEffect(() => {
    async function carregarProdutos() {
      try {
        const res = await api.get('/produtos', {
          params: {
            nome: buscaDebounced,
          },
        });

        setProdutos(res.data?.data || res.data || []);
      } catch (err) {
        console.log(err);
      } finally {
        setLoading(false);
      }
    }

    carregarProdutos();
  }, [buscaDebounced]);

  // =========================
  // FAVORITOS
  // =========================

  useEffect(() => {
    async function carregarFavoritos() {
      const token = localStorage.getItem('token');

      if (!token) return;

      try {
        const res = await api.get('/favoritos', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setFavoritos(res.data || []);
      } catch (err) {
        console.log(err);
      }
    }

    carregarFavoritos();
  }, []);

  // =========================
  // CATEGORIAS
  // =========================

  useEffect(() => {
    async function carregarCategorias() {
      try {
        const res = await api.get('/produtos/categorias');

        setCategorias(res.data || []);
      } catch (err) {
        console.log(err);
      }
    }

    carregarCategorias();
  }, []);

  // =========================
  // FILTRO
  // =========================

  const produtosFiltrados = produtos.filter((p) => {
    const nome = p.nome?.toLowerCase().includes(busca.toLowerCase());

    const categoria = categoriaSelecionada === 'Todas' || p.categoria_nome === categoriaSelecionada;

    return nome && categoria;
  });

  // =========================
  // FUNÇÕES FAVORITOS
  // =========================
  async function toggleFavorito(produtoId) {
    const token = localStorage.getItem('token');

    try {
      await api.post(
        `/favoritos/${produtoId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setFavoritos((prev) => {
        const existe = prev.some((p) => p.id === produtoId);

        if (existe) {
          return prev.filter((p) => p.id !== produtoId);
        }

        const produto = produtos.find((p) => p.id === produtoId);
        return [...prev, produto];
      });
    } catch (err) {
      console.log(err);
    }
  }

  // =========================
  // CARRINHO
  // =========================

  function adicionar(produto) {
    const variacao = produto.variacoes?.[0];

    if (!variacao) {
      alert('Produto sem variação');

      return;
    }

    adicionarAoCarrinho(produto, {
      ...variacao,
      estoque: Number(variacao.estoque || produto.estoque || 0),
    });
  }

  function abrirProduto(produto) {
    navigate(`/produto/${produto.id}`);
  }

  if (loading) {
    return <h2>Carregando...</h2>;
  }

  return (
    <div className="loja-container">
      {/* BUSCA */}

      <input
        className="busca-produto"
        placeholder="Buscar produtos..."
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
      />

      {/* CATEGORIAS */}

      <section className="categorias-produtos">
        <button
          className={categoriaSelecionada === 'Todas' ? 'ativa' : ''}
          onClick={() => setCategoriaSelecionada('Todas')}
        >
          Todos
        </button>

        {categorias.map((cat) => (
          <button
            key={cat.id}
            className={categoriaSelecionada === cat.nome ? 'ativa' : ''}
            onClick={() => setCategoriaSelecionada(cat.nome)}
          >
            {cat.nome}
          </button>
        ))}
      </section>

      {/* PRODUTOS */}

      <div className="produtos-grid">
        {produtosFiltrados.map((produto) => (
          <div key={produto.id} className="produto-card">
            {/* IMAGEM */}
            <div className="img-box" onClick={() => abrirProduto(produto)}>
              <img loading="lazy" src={`${api.defaults.baseURL}${produto.imagem_principal}`} alt={produto.nome} />

              <button
                className={`fav-btn ${isFavorito(produto.id) ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorito(produto.id);
                }}
              >
                {isFavorito(produto.id) ? '♥' : '♡'}
              </button>
            </div>

            {/* INFORMAÇÃO */}
            <div className="produto-info-card">
              <h3>{produto.nome}</h3>

              <div className="preco-area">
                <strong>R$ {produto.variacoes?.[0]?.preco || produto.preco || 0}</strong>
              </div>

              <div className="produto-acoes">
                <button className="btn-carrinho-mini" onClick={() => adicionar(produto)}>
                  🛒
                </button>

                <button className="btn-comprar-mini" onClick={() => abrirProduto(produto)}>
                  Comprar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Produtos;
