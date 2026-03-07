// src/pages/MeusPedidos.jsx
import React, { useEffect, useState } from "react";
import "./MeusPedidos.css";
import api from "../services/api"; // sua instância axios

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

    if (usuario_id) {
      carregarPedidos();
    }
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
          </div>
        ))
      )}
    </div>
  );
}