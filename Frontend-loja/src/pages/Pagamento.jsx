import { useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';
import './Pagamento.css';

export default function Pagamento() {
  const location = useLocation();
  const navigate = useNavigate();

  const salvo = sessionStorage.getItem('pedido_pagamento');

  const pedido = location.state || (salvo ? JSON.parse(salvo) : null);

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
      // BUSCA PEDIDO COMPLETO
      // ==========================
      const res = await api.get('/pedidos/meus', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const pedidoAtual = res.data.find((p) => Number(p.id) === Number(pedido.id));

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

      // ==========================
      // ATUALIZA STATUS
      // ==========================
      await api.put(
        `/pedidos/${pedido.id}/status`,
        { status: 'Pendente' },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      sessionStorage.removeItem('pedido_pagamento');

      // ==========================
      // MONTA ITENS DO PEDIDO
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
        `💰 NOVO COMPROVANTE PIX - DL MODAS\n\n` +
        `Pedido: #${pedidoAtual.id}\n\n` +
        `Valor:\n${Number(pedidoAtual.total).toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        })}\n\n` +
        ` PRODUTOS:\n${itensTexto}\n\n` +
        `Status:\nAguardando confirmação\n\n` +
        `Cliente enviará o comprovante PIX.`;

      const url = `https://wa.me/55${numeroWhats}?text=${encodeURIComponent(mensagem)}`;

      window.open(url, '_blank');

      navigate('/perfil');
    } catch (err) {
      console.error('ERRO PIX:', err);
      alert('Erro ao enviar comprovante');
    }
  }

  return (
    <div className="pagamento-container">
      <h1>Pagamento PIX</h1>

      <div className="pix-box">
        <h3>Pedido #{pedido.id}</h3>

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

        <button onClick={confirmarPix}>Já paguei - enviar comprovante</button>
      </div>
    </div>
  );
}
