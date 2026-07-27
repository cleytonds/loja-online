import { useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiTrash2 } from 'react-icons/fi';
import { CarrinhoContext } from '../context/CarrinhoContext';
import api from '../services/api';
import ImagemProduto from '../components/ImagemProduto.jsx';
import { getErrorMessage } from '../utils/frontendState.js';
import BotaoAtendimentoWhatsApp from '../components/BotaoAtendimentoWhatsApp.jsx';
import {
  iniciarCheckoutMercadoPago,
  recuperarTentativaCheckout,
} from '../utils/mercadoPagoCheckout.js';
import './Carrinho.css';

export default function Carrinho() {
  const { carrinho, removerDoCarrinho, aumentarQuantidade, diminuirQuantidade } = useContext(CarrinhoContext);
  const navigate = useNavigate();
  const [finalizando, setFinalizando] = useState(false);
  const [checkoutPendente, setCheckoutPendente] = useState(null);
  const checkoutEmAndamento = useRef(false);

  useEffect(() => {
    if (carrinho.length) setCheckoutPendente(recuperarTentativaCheckout());
  }, [carrinho]);

  const formatarPreco = (valor) => new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL',
  }).format(Number(valor || 0));
  const total = carrinho.reduce((acc, item) => acc + Number(item.preco || 0) * Number(item.quantidade || 0), 0);

  async function finalizarCompra() {
    if (finalizando || checkoutEmAndamento.current) return;
    if (!carrinho.length) return alert('Carrinho vazio');
    const token = localStorage.getItem('token');
    if (!token) return navigate('/login');

    checkoutEmAndamento.current = true;
    setFinalizando(true);
    try {
      await iniciarCheckoutMercadoPago({
        apiClient: api,
        carrinho,
        token,
        redirect: (url) => window.location.assign(url),
      });
    } catch (err) {
      console.error('ERRO CHECKOUT:', {
        status: err.response?.status,
        resposta: err.response?.data,
        url: err.config?.url,
        metodo: err.config?.method,
        mensagem: err.message,
      });
      setCheckoutPendente(recuperarTentativaCheckout());
      const mensagemBackend = err.response?.data?.erro
        || err.response?.data?.message
        || getErrorMessage(err, 'Erro ao iniciar pagamento');
      alert(`Não foi possível continuar o pagamento: ${mensagemBackend}`);
    } finally {
      checkoutEmAndamento.current = false;
      setFinalizando(false);
    }
  }

  if (!carrinho.length) {
    return <div className="carrinho-vazio"><h2>Carrinho vazio</h2><button onClick={() => navigate('/')}>Continuar comprando</button></div>;
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
                <div className="item-detalhes"><h2>{item.nome}</h2><p>{item.tamanho} • {item.cor}</p><strong className="item-preco-unitario">{formatarPreco(item.preco)}</strong></div>
              </div>
              <div className="item-quantidade" aria-label={`Quantidade de ${item.nome}`}>
                <button type="button" onClick={() => diminuirQuantidade(item.variacao_id)} aria-label="Diminuir quantidade">−</button>
                <span>{item.quantidade}</span>
                <button type="button" onClick={() => aumentarQuantidade(item.variacao_id)} aria-label="Aumentar quantidade">+</button>
              </div>
              <div className="item-acoes">
                <strong>{formatarPreco(item.preco * item.quantidade)}</strong>
                <button type="button" onClick={() => removerDoCarrinho(item.variacao_id)}><FiTrash2 aria-hidden="true" />Remover</button>
              </div>
            </div>
          ))}
        </div>
        <aside className="carrinho-resumo">
          <h2>Resumo do pedido</h2>
          <div className="resumo-linha"><span>Subtotal</span><span>{formatarPreco(total)}</span></div>
          <div className="resumo-linha resumo-total"><span>Total</span><span>{formatarPreco(total)}</span></div>
          <button className="btn-finalizar" disabled={finalizando} onClick={finalizarCompra}>
            {finalizando ? 'Preparando pagamento...' : checkoutPendente?.pedidoId ? 'Continuar pagamento' : 'Pagar com PIX ou cartão'}
          </button>
          {checkoutPendente?.pedidoId && <p className="checkout-pendente-aviso">Há um pagamento preparado para este carrinho. Você pode continuar sem criar outro pedido.</p>}
          <BotaoAtendimentoWhatsApp mensagem="Olá! Tenho uma dúvida sobre uma compra na DL Modas." />
        </aside>
      </div>
    </div>
  );
}
