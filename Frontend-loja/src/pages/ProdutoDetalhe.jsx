import { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import api from '../services/api';

import ImagemProduto from '../components/ImagemProduto';

import { CarrinhoContext } from '../context/CarrinhoContext';

import './ProdutoDetalhe.css';

export default function ProdutoDetalhe() {
  const { id } = useParams();

  const navigate = useNavigate();

  const { adicionarAoCarrinho } = useContext(CarrinhoContext);

  // =========================
  // ESTADOS
  // =========================

  const [produto, setProduto] = useState(null);

  const [imagem, setImagem] = useState('');

  const [quantidade, setQuantidade] = useState(1);

  const [corSelecionada, setCorSelecionada] = useState('');

  const [tamanhoSelecionado, setTamanhoSelecionado] = useState('');

  // =========================
  // CARREGAR PRODUTO
  // =========================

  useEffect(() => {
    async function carregarProduto() {
      try {
        const res = await api.get(`/produtos/${id}`);

        setProduto(res.data);

        if (res.data.imagens?.length) {
          setImagem(res.data.imagens[0].url);
        }

        if (res.data.variacoes?.length) {
          const primeira = res.data.variacoes[0];

          setCorSelecionada(primeira.cor);

          setTamanhoSelecionado(primeira.tamanho);
        }
      } catch (err) {
        console.log(err);
      }
    }

    carregarProduto();
  }, [id]);

  // =========================
  // VARIAÇÃO ATUAL
  // =========================

  const variacaoAtual =
    produto?.variacoes?.find((v) => v.cor === corSelecionada && v.tamanho === tamanhoSelecionado) ||
    produto?.variacoes?.find((v) => v.cor === corSelecionada);

  // =========================
  // ESTOQUE
  // =========================

  const estoque = variacaoAtual?.estoque ?? produto?.estoque ?? 0;

  // =========================
  // LISTAS
  // =========================

  const cores = [...new Set(produto?.variacoes?.map((v) => v.cor))];

  const tamanhos = [
    ...new Set(
      produto?.variacoes

        ?.filter((v) => v.cor === corSelecionada)

        .map((v) => v.tamanho),
    ),
  ];

  // =========================
  // TROCAR COR
  // =========================

  function escolherCor(cor) {
    setCorSelecionada(cor);

    const primeiroTamanho = produto?.variacoes?.find((v) => v.cor === cor)?.tamanho;

    setTamanhoSelecionado(primeiroTamanho || '');
  }

  // =========================
  // ADICIONAR AO CARRINHO
  // =========================

  function adicionar() {
    if (!variacaoAtual) {
      alert('Selecione tamanho e cor');
      return;
    }

    const produtoCarrinho = {
      ...produto,

      imagem_principal: produto.imagem_principal || produto.imagens?.[0]?.url || '',
    };

    adicionarAoCarrinho(produtoCarrinho, {
      ...variacaoAtual,
      quantidade,
    });
  }
  // =========================
  // COMPRAR AGORA
  // =========================

  function comprarAgora() {
    adicionar();

    setTimeout(() => {
      navigate('/carrinho');
    }, 100);
  }

  function aumentarQuantidade() {
    if (quantidade < estoque) {
      setQuantidade(quantidade + 1);
    }
  }

  if (!produto) {
    return <h2>Carregando...</h2>;
  }

  return (
    <div className="produto-detalhe-page">
      {/* GALERIA */}

      <div className="galeria">
        <ImagemProduto
          className="imagem-principal"
          url={imagem}
          alt={produto.nome}
          loading="lazy"
        />

        <div className="miniaturas">
          {produto.imagens?.map((img) => (
            <ImagemProduto
              key={img.id}
              url={img.url}
              onClick={() => setImagem(img.url)}
              alt=""
              loading="lazy"
            />
          ))}
        </div>
      </div>

      {/* INFORMAÇÕES */}

      <div className="produto-info">
        <h1>{produto.nome}</h1>

        <p className="descricao">{produto.descricao}</p>

        <h2 className="preco">
          <span className="currency">R$</span> {variacaoAtual?.preco || produto.preco_base}
        </h2>

        <h3>Cor</h3>

        <div className="opcoes">
          {cores.map((c) => (
            <button
              key={c}
              className={corSelecionada === c ? 'selecionado' : ''}
              onClick={() => escolherCor(c)}
            >
              {c}
            </button>
          ))}
        </div>

        <h3>Tamanho</h3>

        <div className="opcoes">
          {tamanhos.map((t) => (
            <button
              key={t}
              className={tamanhoSelecionado === t ? 'selecionado' : ''}
              onClick={() => setTamanhoSelecionado(t)}
            >
              {t}
            </button>
          ))}
        </div>

        <p>
          Últimas unidades: <strong>{estoque}</strong>
        </p>

        <div className="quantidade">
          <button
            onClick={() => {
              if (quantidade > 1) setQuantidade(quantidade - 1);
            }}
          >
            -
          </button>

          <span>{quantidade}</span>

          <button
            onClick={() => {
              if (quantidade < estoque) {
                setQuantidade(quantidade + 1);
              }
            }}
            disabled={quantidade >= estoque}
          >
            +
          </button>
        </div>

        <button className="btn-carrinho" onClick={adicionar}>
          Adicionar ao carrinho
        </button>

        <button className="btn-comprar" onClick={comprarAgora}>
          Comprar agora
        </button>
      </div>
    </div>
  );
}
