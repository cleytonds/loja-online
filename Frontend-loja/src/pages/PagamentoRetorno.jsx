import { Link, useContext, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { FaWhatsapp } from 'react-icons/fa';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { montarLinkWhatsApp, montarMensagemEntregaPedido } from '../utils/whatsapp.js';
import {
  classificarResultadoReconciliacao,
  dadosRetornoSaoValidos,
  extrairParametrosRetornoPagamento,
  mensagemErroReconciliacao,
  reconciliarRetornoPagamento,
} from '../utils/paymentReturn.js';
import './PagamentoRetorno.css';

const mensagens = {
  sucesso: {
    titulo: 'Confirmando seu pagamento...',
    texto: 'Estamos validando a confirmação diretamente com o Mercado Pago.',
  },
  pendente: {
    titulo: 'Pagamento pendente',
    texto: 'O Mercado Pago ainda está processando este pagamento.',
  },
  falhou: {
    titulo: 'Pagamento não concluído',
    texto: 'O pagamento não foi concluído. Nenhuma confirmação é feita por esta tela.',
  },
};

function obterListaPedidos(resposta) {
  return Array.isArray(resposta?.data) ? resposta.data : resposta?.data?.data || [];
}

export default function PagamentoRetorno() {
  const location = useLocation();
  const { user } = useContext(AuthContext);
  const etapa = location.pathname.split('/').pop();
  const mensagemInicial = mensagens[etapa] || mensagens.pendente;
  const [mensagemAtual, setMensagemAtual] = useState(mensagemInicial);
  const [estado, setEstado] = useState('inicial');
  const [pedidoConfirmado, setPedidoConfirmado] = useState(null);
  const [tentativa, setTentativa] = useState(0);
  const reconciliacoesIniciadas = useRef(new Set());

  useEffect(() => {
    const parametros = extrairParametrosRetornoPagamento({
      search: location.search,
      hash: window.location.hash,
    });
    const { paymentId, pedidoId } = parametros;

    setMensagemAtual(mensagemInicial);
    setPedidoConfirmado(null);

    if (!dadosRetornoSaoValidos(parametros)) {
      setEstado(etapa === 'falhou' ? 'recusado' : 'inicial');
      return undefined;
    }

    const chaveReconciliacao = `${pedidoId}:${paymentId}`;
    if (reconciliacoesIniciadas.current.has(chaveReconciliacao)) return undefined;
    reconciliacoesIniciadas.current.add(chaveReconciliacao);
    setEstado('confirmando');

    let ativo = true;

    reconciliarRetornoPagamento(api, {
      pedidoId,
      paymentId,
      token: localStorage.getItem('token'),
    })
      .then(async (resposta) => {
        const pedidosResposta = await api.get('/pedidos/meus');
        const pedido = obterListaPedidos(pedidosResposta)
          .find((item) => Number(item.id) === Number(pedidoId));

        if (!ativo) return;

        const resultado = resposta.data;
        const novoEstado = classificarResultadoReconciliacao({ pedido, resultado });
        setEstado(novoEstado);

        if (novoEstado === 'aprovado' && pedido) {
          setPedidoConfirmado(pedido);
          setMensagemAtual({
            titulo: 'Pagamento aprovado!',
            texto: 'Recebemos a confirmação do seu pagamento. Agora combine a entrega do pedido pelo WhatsApp da loja.',
          });
        } else if (novoEstado === 'processando') {
          setMensagemAtual({
            titulo: 'Pagamento em processamento',
            texto: 'Seu pagamento ainda está sendo processado. Aguarde alguns instantes e acompanhe seus pedidos.',
          });
        } else {
          setMensagemAtual({
            titulo: 'Pagamento não aprovado',
            texto: 'O Mercado Pago informou que este pagamento não foi aprovado. Você pode tentar novamente conforme as regras do pedido.',
          });
        }
      })
      .catch((erro) => {
        reconciliacoesIniciadas.current.delete(chaveReconciliacao);
        if (!ativo) return;
        setEstado('erro');
        setMensagemAtual(mensagemErroReconciliacao());

        if (import.meta.env.DEV) {
          console.warn('Reconciliação Mercado Pago rejeitada:', {
            status: erro?.response?.status || null,
            mensagem: erro?.response?.data?.erro || erro?.message || null,
          });
        }
      });

    return () => { ativo = false; };
  }, [etapa, location.search, location.hash, mensagemInicial, tentativa]);

  const mensagemEntrega = pedidoConfirmado
    ? montarMensagemEntregaPedido({ pedido: pedidoConfirmado, nomeCliente: user?.nome })
    : null;
  let linkWhatsApp = null;

  if (pedidoConfirmado?.whatsapp_number && mensagemEntrega) {
    try {
      linkWhatsApp = montarLinkWhatsApp({
        numero: pedidoConfirmado.whatsapp_number,
        mensagem: mensagemEntrega,
      });
    } catch {
      linkWhatsApp = null;
    }
  }

  return (
    <section className="pagamento-retorno" aria-live="polite">
      <div className="pagamento-retorno-card">
        <h1>{mensagemAtual.titulo}</h1>
        <p>{mensagemAtual.texto}</p>

        {estado === 'confirmando' && <span className="pagamento-retorno-carregando">Confirmando seu pagamento...</span>}

        {estado === 'aprovado' && pedidoConfirmado && (
          <>
            <dl className="pagamento-retorno-resumo">
              <div><dt>Pedido</dt><dd>#{pedidoConfirmado.id}</dd></div>
              <div><dt>Valor</dt><dd>{Number(pedidoConfirmado.total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</dd></div>
              <div><dt>Pagamento</dt><dd>Mercado Pago</dd></div>
              <div><dt>Status</dt><dd>Pago</dd></div>
            </dl>

            {linkWhatsApp ? (
              <a className="btn-whatsapp-entrega" href={linkWhatsApp} target="_blank" rel="noopener noreferrer">
                <FaWhatsapp aria-hidden="true" /> Combinar entrega pelo WhatsApp
              </a>
            ) : (
              <p className="pagamento-retorno-indisponivel">O atendimento via WhatsApp está temporariamente indisponível.</p>
            )}
          </>
        )}

        {estado === 'erro' && (
          <button type="button" className="btn-tentar-confirmacao" onClick={() => setTentativa((valor) => valor + 1)}>
            Tentar confirmar novamente
          </button>
        )}

        <Link className="btn-primary" to="/perfil">Ver meus pedidos</Link>
      </div>
    </section>
  );
}
