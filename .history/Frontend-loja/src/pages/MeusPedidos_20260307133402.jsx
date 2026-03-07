import React, { useEffect, useState } from "react";
import "./MeusPedidos.css";
import api from "../services/api"; // instância axios

export default function MeusPedidos({ usuario_id }) {
  const [pedidos, setPedidos] = useState([]);

  useEffect(() => {
    async function carregarPedidos() {
      try {
        const res = await api.get(`/pedidos/meus/${usuario_id}`);
        setPedidos(res.data);
      } catch (err) {
        console.error("Erro ao buscar pedidos:", err);
      }
    }
    if (usuario_id) carregarPedidos();
  }, [usuario_id]);

  // Agrupar itens por pedido_id
  const pedidosAgrupados = pedidos.reduce((acc, item) => {
    if (!acc[item.pedido_id]) {
      acc[item.pedido_id] = {
        pedido_id: item.pedido_id,
        total: item.total,
        status: item.status,
        criado_em: item.criado_em,
        itens: []
      };
    }
    acc[item.pedido_id].itens.push({
      nome: item.nome,
      preco: item.preco,
      quantidade: item.quantidade
    });
    return acc;
  }, {});

  const pedidosArray = Object.values(pedidosAgrupados);

  // Funções de ação (apenas alert por enquanto, depois você conecta ao backend)
  const verDetalhes = (pedido_id) => {
    alert(`Ver detalhes do pedido #${pedido_id}`);
  };

  const repetirPedido = (pedido_id) => {
    alert(`Repetir pedido #${pedido_id}`);
  };

  const cancelarPedido = (pedido_id) => {
    alert(`Cancelar pedido #${pedido_id}`);
  };

  return (
    <div className="meus-pedidos-container">
      <h1>Meus Pedidos</h1>
      {pedidosArray.length === 0 ? (
        <p>Você ainda não realizou nenhum pedido.</p>
      ) : (
        pedidosArray.map((pedido) => (
          <div key={pedido.pedido_id} className="pedido-card">
            <h2>Pedido #{pedido.pedido_id}</h2>
            <p>Total: R$ {pedido.total.toFixed(2)}</p>
            <p>Status: <span className={`status-${pedido.status}`}>{pedido.status}</span></p>
            <p>Criado em: {new Date(pedido.criado_em).toLocaleString()}</p>

            <div className="pedido-itens">
              <h4>Itens:</h4>
              {pedido.itens.map((item, index) => (
                <div key={index} className="pedido-item">
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
      )}
    </div>
  );
}