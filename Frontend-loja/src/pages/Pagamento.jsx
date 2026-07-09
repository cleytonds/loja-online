import { useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';
import './Pagamento.css';
import { useParams } from 'react-router-dom';

export default function Pagamento() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const salvo = sessionStorage.getItem('pedido_pagamento');
  const pedido = location.state || (salvo ? JSON.parse(salvo) : null);
  const pedidoId = pedido?.pedido_id || pedido?.id;

  console.log('PEDIDO RECEBIDO:', pedido);

  if (!pedido) {
    return (
      <div>
        <h2>Pedido não encontrado</h2>
        <button onClick={() => navigate('/')}>Voltar</button>
      </div>
    );
  }

  async function confirmarPix() {
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

      // ==========================
      // MONTA ITENS
      // ==========================
      const itensTexto = (pedidoAtual.itens || [])
        .map(
          (i) =>
            `- ${i.nome} (${i.tamanho || '-'} / ${i.cor || '-'}) x${i.quantidade} = R$ ${(i.preco * i.quantidade).toFixed(2)}`,
        )
        .join('\n');

      // ==========================
      // WHATSAPP
      // ==========================
      const numeroWhats = '81993563122';

      const mensagem =
        ` NOVO PEDIDO FINALIZAR WHATSAPP - DL MODAS\n\n` +
        `Pedido: #${pedidoAtual.id}\n\n` +
        `Valor:\n${Number(pedidoAtual.total).toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        })}\n\n` +
        ` PRODUTOS:\n${itensTexto}\n\n` +
        ` Status:\nAguardando confirmação\n\n` +
        `Cliente aguardando para finalizar o pagamento via WhatsApp.`;

      const url = `https://wa.me/55${numeroWhats}?text=${encodeURIComponent(mensagem)}`;

      window.open(url, '_blank');

      navigate('/perfil');
    } catch (err) {
      console.error('ERRO PIX:', err);
      alert('Erro ao processar pagamento');
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

        <p>Chave PIX:</p>
        <strong>dayaneferreiral1905@gmail.com</strong>

        <button onClick={() => navigator.clipboard.writeText('dayaneferreiral1905@gmail.com')}>
          Copiar chave PIX
        </button>

        {/*  AGORA SÓ FLUXO LIMPO */}
        <button onClick={confirmarPix}>Já paguei - enviar comprovante</button>
      </div>
    </div>
  );
}
