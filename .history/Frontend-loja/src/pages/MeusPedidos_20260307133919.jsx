import React, { useEffect, useState } from "react";
import "./MeusPedidos.css";
import api from "../services/api"; // axios ou instância configurada

export default function MeusPedidos({ usuario_id }) {
  const [pedidos, setPedidos] = useState([]);

  useEffect(() => {
    async function carregarPedidos() {
      try {
        const res = await api.get(`/pedidos/meus/${usuario_id}`);
        setPedidos(res.data);
      } catch (err) {
        console.error(err);
      }
    }
    if (usuario_id) carregarPedidos();
  }, [usuario_id]);

  // Agrupar itens por pedido_id
  const pedidosAgrupados = pedidos.reduce((acc, item) => {
    if (!acc[item.pedido_id]) acc[item.pedido_id] = { pedido_id: item.pedido_id, total: item.total, status: item.status, criado_em: item.criado_em, itens: [] };
    acc[item.pedido_id].itens.push({ nome: item.nome, preco: item.preco, quantidade: item.quantidade });
    return acc;
  }, {});

  const pedidosArray = Object.values(pedidosAgrupados);

  const cancelarPedido = async (pedido_id) => {
    try {
      await api.put(`/pedidos/cancelar/${pedido_id}`);
      alert(`Pedido #${pedido_id} cancelado`);
      setPedidos(prev => prev.map(p => p.pedido_id === pedido_id ? { ...p, status: 'cancelado' } : p));
    } catch { alert("Erro ao cancelar pedido"); }
  };

  const repetirPedido = async (pedido_id) => {
    try {
      const res = await api.post(`/pedidos/repetir/${pedido_id}`);
      alert(res.data.mensagem);
      const resPedidos = await api.get(`/pedidos/meus/${usuario_id}`);
      setPedidos(resPedidos.data);
    } catch { alert("Erro ao repetir pedido"); }
  };

  const verDetalhes = (pedido_id) => alert(`Detalhes do pedido #${pedido_id}`);

  return (
    <div className="meus-pedidos-container">
      <h1>Meus Pedidos</h1>
      {pedidosArray.length === 0 ? <p>Você ainda não realizou nenhum pedido.</p> :
        pedidosArray.map(pedido => (
          <div key={pedido.pedido_id} className="pedido-card">
            <h2>Pedido #{pedido.pedido_id}</h2>
            <p>Total: R$ {pedido.total.toFixed(2)}</p>
            <p>Status: <span className={`status-${pedido.status}`}>{pedido.status}</span></p>
            <p>Criado em: {new Date(pedido.criado_em).toLocaleString()}</p>

            <div className="pedido-itens">
              <h4>Itens:</h4>
              {pedido.itens.map((item, i) => (
                <div key={i} className="pedido-item">
                  <span>{item.nome} (x{item.quantidade})</span>
                  <span>R$ {item.preco.toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="pedido-acoes">
              <button className="btn-detalhes" onClick={() => verDetalhes(pedido.pedido_id)}>Detalhes</button>
              <button className="btn-repetir" onClick={() => repetirPedido(pedido.pedido_id)}>Repetir</button>
              <button className="btn-cancelar" onClick={() => cancelarPedido(pedido.pedido_id)}>Cancelar</button>
            </div>
          </div>
        ))
      }
    </div>
  );
}