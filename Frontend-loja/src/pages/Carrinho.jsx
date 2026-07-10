import { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { CarrinhoContext } from '../context/CarrinhoContext';
import api from '../services/api';

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

  async function finalizarCompra(metodo) {
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

    try {
      // snapshot seguro (evita mutação e bugs de estado)
      const itensSnapshot = carrinho.map((item) => ({
        produto_id: item.produto_id,
        variacao_id: item.variacao_id,
        quantidade: Number(item.quantidade),
        preco: Number(item.preco),
        nome: item.nome,
        cor: item.cor,
        tamanho: item.tamanho,
      }));

      const res = await api.post(
        '/pedidos',
        {
          itens: itensSnapshot,
          pagamento: metodo,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const pedidoId = res.data?.pedido_id;

      if (!pedidoId) {
        throw new Error('Pedido não retornou ID');
      }

      // =========================
      // PIX
      // =========================
      if (metodo === 'pix') {
        const pedidoPagamento = {
          id: pedidoId,
          pedido_id: pedidoId,
          total: Number(res.data.total),
          status: 'pendente',
        };

        sessionStorage.setItem('pedido_pagamento', JSON.stringify(pedidoPagamento));

        limparCarrinho();

        navigate(`/pagamento/${pedidoId}`, {
          state: pedidoPagamento,
        });

        return;
      }

      // =========================
      // WHATSAPP
      // =========================
      if (metodo === 'whatsapp') {
        const itensTexto = itensSnapshot
          .map(
            (i) =>
              `- ${i.nome} (${i.tamanho || '-'} / ${i.cor || '-'}) x${i.quantidade} = ${formatarPreco(
                i.preco * i.quantidade,
              )}`,
          )
          .join('\n');

        const mensagem =
          ` NOVO PEDIDO FINALIZAR WHATSAPP - DL MODAS\n\n` +
          `Pedido: #${pedidoId}\n\n` +
          `Valor:\n${formatarPreco(total)}\n\n` +
          ` PRODUTOS:\n${itensTexto}\n\n` +
          ` Status:\nAguardando confirmação\n\n` +
          `Cliente aguardando para finalizar o pagamento via WhatsApp.`;

        //  LIMPA PRIMEIRO
        limparCarrinho();

        //  DEPOIS ABRE WHATSAPP
        window.open(`https://wa.me/5581993563122?text=${encodeURIComponent(mensagem)}`, '_blank');

        return;
      }
    } catch (err) {
      console.error('ERRO CHECKOUT:', err);
      alert('Erro ao criar pedido');
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

      <div className="lista-carrinho">
        {carrinho.map((item) => (
          <div className="carrinho-item" key={item.variacao_id}>
            <div className="item-info">
              <img
                src={item.imagem ? `${api.defaults.baseURL}${item.imagem}` : '/placeholder.png'}
                alt={item.nome}
              />

              <div>
                <h2>{item.nome}</h2>

                <p>
                  {item.tamanho} • {item.cor}
                </p>

                <strong>{formatarPreco(item.preco)}</strong>
              </div>
            </div>

            <div className="item-quantidade">
              <button onClick={() => diminuirQuantidade(item.variacao_id)}>-</button>

              <span>{item.quantidade}</span>

              <button onClick={() => aumentarQuantidade(item.variacao_id)}>+</button>
            </div>

            <div className="item-acoes">
              <strong>{formatarPreco(item.preco * item.quantidade)}</strong>

              <button onClick={() => removerDoCarrinho(item.variacao_id)}>Remover</button>
            </div>
          </div>
        ))}
      </div>

      <div className="carrinho-resumo">
        <div className="resumo-linha">
          <span>Total</span>
          <span>{formatarPreco(total)}</span>
        </div>

        <button disabled={finalizando} onClick={() => finalizarCompra('pix')}>
          {finalizando ? 'Processando...' : 'Finalizar com PIX'}
        </button>

        <button disabled={finalizando} onClick={() => finalizarCompra('whatsapp')}>
          Finalizar no WhatsApp
        </button>
      </div>
    </div>
  );
}
