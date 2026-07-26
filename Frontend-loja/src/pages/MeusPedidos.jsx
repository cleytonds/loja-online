import React, { useContext, useEffect, useState } from 'react';
import './MeusPedidos.css';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import BotaoAtendimentoWhatsApp from '../components/BotaoAtendimentoWhatsApp.jsx';
import { CarrinhoContext } from '../context/CarrinhoContext';
import { AuthContext } from '../context/AuthContext';
import { montarMensagemEntregaPedido, pedidoPodeCombinarEntregaMercadoPago } from '../utils/whatsapp.js';

function formatarTempoRestante(expiresAt, agora) {
  const totalSegundos = Math.max(0, Math.ceil((new Date(expiresAt).getTime() - agora) / 1000));
  return `${String(Math.floor(totalSegundos / 60)).padStart(2, '0')}:${String(totalSegundos % 60).padStart(2, '0')}`;
}

export default function MeusPedidos({ usuario_id }) {
  const [pedidos, setPedidos] = useState([]);
  const [modalPedido, setModalPedido] = useState(null);
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [ordenarData, setOrdenarData] = useState('desc');
  const [continuandoPedidoId, setContinuandoPedidoId] = useState(null);
  const [agora, setAgora] = useState(Date.now());
  const { restaurarPedidoExpirado } = useContext(CarrinhoContext);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    async function carregarPedidos() {
      try {
        const res = await api.get('/pedidos/meus');
        setPedidos(res.data);
      } catch (err) {
        console.error(err);
      }
    }

    carregarPedidos();
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => setAgora(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  let pedidosArray = pedidos.map((pedido) => ({
    pedido_id: pedido.id,
    total: Number(pedido.total),
    status: pedido.status,
    pagamento: pedido.pagamento,
    mp_status: pedido.mp_status,
    pagamento_confirmado_em: pedido.pagamento_confirmado_em,
    criado_em: pedido.created_at,
    expires_at: pedido.expires_at,
    itens: pedido.itens || [],
    whatsapp_number: pedido.whatsapp_number,
  }));

  // Filtro por status
  if (filtroStatus !== 'todos') {
    pedidosArray = pedidosArray.filter((p) => p.status === filtroStatus);
  }

  // Ordenar por data
  pedidosArray.sort((a, b) => {
    const dateA = new Date(a.criado_em).getTime();
    const dateB = new Date(b.criado_em).getTime();
    return ordenarData === 'asc' ? dateA - dateB : dateB - dateA;
  });

  const abrirModal = (pedido) => setModalPedido(pedido);
  const fecharModal = () => setModalPedido(null);

  const continuarPagamentoMercadoPago = async (pedido) => {
    try {
      setContinuandoPedidoId(pedido.pedido_id);
      const resposta = await api.post(`/pagamentos/mercado-pago/preferencia/${pedido.pedido_id}`);
      const checkoutUrl = resposta.data?.checkoutUrl;

      if (typeof checkoutUrl !== 'string' || !checkoutUrl.trim()) {
        throw new Error('Link de pagamento indisponível');
      }

      window.location.assign(checkoutUrl);
    } catch (err) {
      alert(err.message);
    } finally {
      setContinuandoPedidoId(null);
    }
  };

  const voltarAoCarrinho = (pedido) => {
    const resultado = restaurarPedidoExpirado(pedido.pedido_id, pedido.itens);
    if (resultado.jaRestaurado) {
      alert('Os itens deste pedido já foram restaurados no carrinho.');
    } else if (resultado.indisponiveis > 0) {
      alert('Parte dos itens não pôde ser restaurada por falta de estoque.');
    }
    navigate('/carrinho');
  };

  return (
    <div className="meus-pedidos-container">
      <h1>Meus Pedidos</h1>

      {/* Filtros e ordenação */}
      <div className="filtros">
        <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
          <option value="todos">Todos</option>
          <option value="pendente">Pendente</option>
          <option value="aguardando_confirmacao">Aguardando confirmação</option>
          <option value="pago">Pago</option>
          <option value="enviado">Enviado</option>
          <option value="entregue">Entregue</option>
          <option value="cancelado">Cancelado</option>
        </select>

        <select value={ordenarData} onChange={(e) => setOrdenarData(e.target.value)}>
          <option value="desc">Mais recentes</option>
          <option value="asc">Mais antigos</option>
        </select>
      </div>

      {pedidosArray.length === 0 ? (
        <p>Você ainda não realizou nenhum pedido.</p>
      ) : (
        pedidosArray.map((pedido) => (
          <div key={pedido.pedido_id} className="pedido-card">
            <h2>Pedido #{pedido.pedido_id}</h2>
            <p>
              Total: R${' '}
              {pedido.itens.reduce((sum, i) => sum + i.preco * i.quantidade, 0).toFixed(2)}
            </p>
            <p>
              Status: <span className={`status-${pedido.status}`}>{pedido.status}</span>
            </p>
            <p>Criado em: {new Date(pedido.criado_em).toLocaleString()}</p>
            <p>Total de itens: {pedido.itens.length}</p>

            <div className="pedido-itens">
              <h4>Itens:</h4>
              {pedido.itens.map((item, i) => (
                <div key={i} className="pedido-item">
                  <span>
                    {item.nome} (x{item.quantidade})
                  </span>
                  <span>R$ {item.preco.toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="pedido-acoes">
              <button className="btn-detalhes" onClick={() => abrirModal(pedido)}>
                Detalhes
              </button>

              {pedido.status === 'pendente' && pedido.pagamento === 'mercado_pago'
                && String(pedido.mp_status || '').toLowerCase() !== 'approved'
                && !pedido.pagamento_confirmado_em
                && !(pedido.expires_at && new Date(pedido.expires_at).getTime() <= agora) && (
                <>
                  <p>Pedido expira em {formatarTempoRestante(pedido.expires_at, agora)}</p>
                  <button
                    className="btn-pagamento"
                    onClick={() => continuarPagamentoMercadoPago(pedido)}
                    disabled={continuandoPedidoId === pedido.pedido_id}
                  >
                    {continuandoPedidoId === pedido.pedido_id ? 'Abrindo pagamento...' : 'Continuar pagamento'}
                  </button>
                  <BotaoAtendimentoWhatsApp
                    numero={pedido.whatsapp_number}
                    mensagem={`Olá! Estou com uma dúvida sobre o pedido #${pedido.pedido_id}.`}
                  />
                </>
              )}

              {pedido.pagamento === 'mercado_pago'
                && (pedido.status === 'expirado'
                  || (pedido.status === 'pendente'
                    && String(pedido.mp_status || '').toLowerCase() !== 'approved'
                    && !pedido.pagamento_confirmado_em
                    && pedido.expires_at
                    && new Date(pedido.expires_at).getTime() <= agora)) && (
                <>
                  <p className="pedido-somente-leitura">Pedido expirado</p>
                  <p className="pedido-somente-leitura">
                    {pedido.status === 'expirado'
                      ? 'O tempo para pagamento expirou. Os itens foram devolvidos ao seu carrinho.'
                      : 'O tempo para pagamento expirou. Aguardando a devolução do estoque.'}
                  </p>
                  {pedido.status === 'expirado' && (
                    <button className="btn-pagamento" onClick={() => voltarAoCarrinho(pedido)}>
                      Voltar ao carrinho
                    </button>
                  )}
                  <BotaoAtendimentoWhatsApp
                    numero={pedido.whatsapp_number}
                    mensagem={`Olá! Estou com uma dúvida sobre o pedido #${pedido.pedido_id}.`}
                  />
                </>
              )}

              {pedidoPodeCombinarEntregaMercadoPago(pedido) && (
                <>
                  <p className="pedido-entrega-confirmada">Pagamento confirmado. Combine a entrega com a loja.</p>
                  <BotaoAtendimentoWhatsApp
                    numero={pedido.whatsapp_number}
                    texto="Combinar entrega pelo WhatsApp"
                    mensagem={montarMensagemEntregaPedido({ pedido, nomeCliente: user?.nome })}
                  />
                </>
              )}
            </div>
          </div>
        ))
      )}

      {/* Modal de detalhes */}
      {modalPedido && (
        <div className="modal-overlay" onClick={fecharModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Detalhes do Pedido #{modalPedido.pedido_id}</h2>
            <p>
              Total: R${' '}
              {modalPedido.itens.reduce((sum, i) => sum + i.preco * i.quantidade, 0).toFixed(2)}
            </p>
            <p>
              Status: <span className={`status-${modalPedido.status}`}>{modalPedido.status}</span>
            </p>
            <p>Criado em: {new Date(modalPedido.criado_em).toLocaleString()}</p>
            <p>Total de itens: {modalPedido.itens.length}</p>

            <h3>Itens do pedido:</h3>
            {modalPedido.itens.map((item, i) => (
              <div key={i} className="pedido-item">
                <span>
                  {item.nome} (x{item.quantidade})
                </span>
                <span>R$ {item.preco.toFixed(2)}</span>
              </div>
            ))}

            <button className="btn-fechar" onClick={fecharModal}>
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
