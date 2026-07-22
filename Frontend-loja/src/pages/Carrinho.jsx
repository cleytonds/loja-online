import { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiTrash2 } from 'react-icons/fi';

import { CarrinhoContext } from '../context/CarrinhoContext';
import api from '../services/api';
import ImagemProduto from '../components/ImagemProduto.jsx';
import { getErrorMessage } from '../utils/frontendState.js';
import BotaoAtendimentoWhatsApp from '../components/BotaoAtendimentoWhatsApp.jsx';

import './Carrinho.css';

export default function Carrinho() {
  const { carrinho, removerDoCarrinho, aumentarQuantidade, diminuirQuantidade, limparCarrinho } =
    useContext(CarrinhoContext);

  const navigate = useNavigate();
  const [finalizando, setFinalizando] = useState(false);

  const formatarPreco = (valor) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(Number(valor || 0));

  const total = carrinho.reduce(
    (acc, item) => acc + Number(item.preco || 0) * Number(item.quantidade || 0),
    0,
  );

  async function finalizarCompra() {
    if (finalizando) return;

    if (!carrinho.length) {
      alert('Carrinho vazio');
      return;
    }

    const token = localStorage.getItem('token');

    if (!token) {
      navigate('/login');
      return;
    }

    setFinalizando(true);

    let etapa = 'criação do pedido';

    try {
      const itensSnapshot = carrinho.map((item) => ({
        produto_id: item.produto_id,
        variacao_id: item.variacao_id,
        quantidade: Number(item.quantidade),
        preco: Number(item.preco),
        nome: item.nome,
        cor: item.cor,
        tamanho: item.tamanho,
      }));

      const idempotencyKey = crypto.randomUUID();

      const res = await api.post(
        '/pedidos',
        {
          itens: itensSnapshot,
          pagamento: 'mercado_pago',
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Idempotency-Key': idempotencyKey,
          },
        },
      );

      const pedidoId = res.data?.pedido_id;

      if (!pedidoId) {
        throw new Error('Pedido não retornou ID');
      }

      etapa = 'criação da preferência do Mercado Pago';

      const preferencia = await api.post(
        `/pagamentos/mercado-pago/preferencia/${pedidoId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const checkoutUrl = preferencia.data?.checkoutUrl;

      if (typeof checkoutUrl !== 'string' || !checkoutUrl.trim()) {
        throw new Error('Checkout Mercado Pago indisponível');
      }

      limparCarrinho();
      window.location.assign(checkoutUrl);
    } catch (err) {
      console.error('ERRO CHECKOUT:', {
        etapa,
        status: err.response?.status,
        resposta: err.response?.data,
        url: err.config?.url,
        metodo: err.config?.method,
        mensagem: err.message,
      });

      const mensagemBackend =
        err.response?.data?.erro ||
        err.response?.data?.message ||
        getErrorMessage(err, 'Erro ao iniciar pagamento');

      alert(`${etapa}: ${mensagemBackend}`);
    } finally {
      setFinalizando(false);
    }
  }

  if (!carrinho.length) {
    return (
      <div className="carrinho-vazio">
        <h2>Carrinho vazio</h2>
        <button onClick={() => navigate('/')}>Continuar comprando</button>
      </div>
    );
  }

  return (
    <div className="carrinho-container">
      <h1 className="carrinho-titulo">Carrinho de compras</h1>

      <div className="carrinho-layout">
      <div className="lista-carrinho">
        {carrinho.map((item) => (
          <div className="carrinho-item" key={item.variacao_id}>
            <div className="item-info">
              <ImagemProduto url={item.imagem} alt={item.nome} />

              <div className="item-detalhes">
                <h2>{item.nome}</h2>

                <p>
                  {item.tamanho} • {item.cor}
                </p>

                <strong className="item-preco-unitario">{formatarPreco(item.preco)}</strong>
              </div>
            </div>

            <div className="item-quantidade" aria-label={`Quantidade de ${item.nome}`}>
              <button type="button" onClick={() => diminuirQuantidade(item.variacao_id)} aria-label="Diminuir quantidade">−</button>

              <span>{item.quantidade}</span>

              <button type="button" onClick={() => aumentarQuantidade(item.variacao_id)} aria-label="Aumentar quantidade">+</button>
            </div>

            <div className="item-acoes">
              <strong>{formatarPreco(item.preco * item.quantidade)}</strong>

              <button type="button" onClick={() => removerDoCarrinho(item.variacao_id)}>
                <FiTrash2 aria-hidden="true" />
                Remover
              </button>
            </div>
          </div>
        ))}
      </div>

      <aside className="carrinho-resumo">
        <h2>Resumo do pedido</h2>
        <div className="resumo-linha">
          <span>Subtotal</span>
          <span>{formatarPreco(total)}</span>
        </div>

        <div className="resumo-linha resumo-total">
          <span>Total</span>
          <span>{formatarPreco(total)}</span>
        </div>

        <button className="btn-finalizar" disabled={finalizando} onClick={finalizarCompra}>
          {finalizando ? 'Processando...' : 'Pagar com PIX ou cartão'}
        </button>

        <BotaoAtendimentoWhatsApp mensagem="Olá! Tenho uma dúvida sobre uma compra na DL Modas." />
      </aside>
      </div>
    </div>
  );
}
