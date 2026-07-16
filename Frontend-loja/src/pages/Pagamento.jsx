import { useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';
import './Pagamento.css';
import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { montarUrlWhatsApp } from '../utils/whatsapp.js';

export default function Pagamento() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const salvo = sessionStorage.getItem('pedido_pagamento');
  const pedido = location.state || (salvo ? JSON.parse(salvo) : null);
  const pedidoId = pedido?.pedido_id || pedido?.id;
  const [pixData, setPixData] = useState({ pix_key: '', whatsapp_number: '' });
  const [deadlineMs, setDeadlineMs] = useState(null);
  const [segundosRestantes, setSegundosRestantes] = useState(null);

  const pedidoExpirado = segundosRestantes === 0;

  function formatarTempoRestante(segundos) {
    if (segundos === null) return '--:--';

    const minutos = Math.floor(segundos / 60);
    const segundosFormatados = segundos % 60;
    return `${String(minutos).padStart(2, '0')}:${String(segundosFormatados).padStart(2, '0')}`;
  }

  useEffect(() => {
    async function carregarPix() {
      try {
        const token = localStorage.getItem('token');
        const res = await api.get(`/pedidos/${pedidoId}/pix`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setPixData({
          pix_key: res.data?.pix_key || '',
          whatsapp_number: res.data?.whatsapp_number || '',
        });

        const tempoRestante = Number(res.data?.tempo_restante);
        if (Number.isFinite(tempoRestante)) {
          const novoDeadline = Date.now() + Math.max(0, tempoRestante);
          setDeadlineMs(novoDeadline);
          setSegundosRestantes(Math.max(0, Math.ceil((novoDeadline - Date.now()) / 1000)));
        }
      } catch (err) {
        console.error('Erro ao carregar dados PIX', err);
        if (/expirado/i.test(err.response?.data?.erro || '')) {
          setSegundosRestantes(0);
        }
      }
    }

    if (pedidoId) {
      carregarPix();
    }
  }, [pedidoId]);

  useEffect(() => {
    if (deadlineMs === null) return undefined;

    const atualizarContador = () => {
      const proximoTempo = Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000));
      setSegundosRestantes(proximoTempo);
      return proximoTempo;
    };

    if (atualizarContador() === 0) return undefined;

    const interval = window.setInterval(() => {
      if (atualizarContador() === 0) {
        window.clearInterval(interval);
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [deadlineMs]);

  if (!pedido) {
    return (
      <div>
        <h2>Pedido não encontrado</h2>
        <button onClick={() => navigate('/')}>Voltar</button>
      </div>
    );
  }

  async function confirmarPix() {
    if (pedidoExpirado) return;

    try {
      const token = localStorage.getItem('token');

      // ==========================
      // BUSCA DADOS REAIS DO PEDIDO
      // ==========================
      const res = await api.get('/pedidos/meus', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const idPedido = Number(pedido.id || pedido.pedido_id);

      const pedidoAtual = res.data.find((p) => Number(p.id || p.pedido_id) === idPedido);

      if (!pedidoAtual) {
        alert('Pedido não encontrado');
        return;
      }

      if (pedidoAtual.status === 'expirado') {
        alert('Este pedido expirou. Faça um novo pedido.');

        sessionStorage.removeItem('pedido_pagamento');
        navigate('/');
        return;
      }

      //  REMOVIDO COMPLETAMENTE:
      // NÃO atualiza status aqui mais

      sessionStorage.removeItem('pedido_pagamento');

      const pedidoPayload = {
        id: pedidoAtual.id,
        pedido_id: pedidoAtual.id,
        total: Number(pedidoAtual.total),
        valor: Number(pedidoAtual.total),
        itens: pedidoAtual.itens || [],
      };

      montarUrlWhatsApp({
        pedido: pedidoPayload,
        itens: pedidoPayload.itens,
        numero: pixData.whatsapp_number,
      });

      navigate('/perfil');
    } catch (err) {
      console.error('ERRO PIX:', err);
      alert(err.message || 'Erro ao processar pagamento');
    }
  }

  return (
    <div className="pagamento-container">
      <h1>Pagamento PIX</h1>

      <div className="pix-box">
        <h3>Pedido #{pedido.pedido_id ?? pedido.id}</h3>

        <h2>
          {Number(pedido.total).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          })}
        </h2>

        <div
          className={`contador-expiracao ${
            pedidoExpirado
              ? 'contador-expirado'
              : (segundosRestantes ?? Infinity) <= 60
                ? 'contador-critico'
                : (segundosRestantes ?? Infinity) <= 120
                  ? 'contador-alerta'
                  : ''
          }`}
          aria-live="polite"
        >
          {pedidoExpirado ? (
            <>
              <span>Pedido expirado</span>
              <small>Este pedido expirou. Crie um novo pedido para continuar.</small>
            </>
          ) : (
            <>
              <span>Pedido expira em</span>
              <strong>{formatarTempoRestante(segundosRestantes)}</strong>
            </>
          )}
        </div>

        <p>Chave PIX:</p>
        <strong>{pixData.pix_key || 'Carregando...'}</strong>

        <button
          disabled={pedidoExpirado}
          onClick={() => navigator.clipboard.writeText(pixData.pix_key || '')}
        >
          Copiar chave PIX
        </button>

        {/*  AGORA SÓ FLUXO LIMPO */}
        <button disabled={pedidoExpirado} onClick={confirmarPix}>Já paguei - enviar comprovante</button>
      </div>
    </div>
  );
}
