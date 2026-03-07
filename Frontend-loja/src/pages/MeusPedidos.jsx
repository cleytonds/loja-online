import React, { useEffect, useState } from "react";
import "./MeusPedidos.css";
import api from "../services/api";

export default function MeusPedidos({ usuario_id }) {
  const [pedidos, setPedidos] = useState([]);
  const [modalPedido, setModalPedido] = useState(null);
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [ordenarData, setOrdenarData] = useState("desc");

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

  const pedidosAgrupados = pedidos.reduce((acc, item) => {
    if (!acc[item.pedido_id])
      acc[item.pedido_id] = {
        pedido_id: item.pedido_id,
        total: item.total,
        status: item.status,
        criado_em: item.criado_em,
        itens: [],
      };
    acc[item.pedido_id].itens.push({
      nome: item.nome,
      preco: item.preco,
      quantidade: item.quantidade,
    });
    return acc;
  }, {});

  let pedidosArray = Object.values(pedidosAgrupados);

  // Filtro por status
  if (filtroStatus !== "todos") {
    pedidosArray = pedidosArray.filter((p) => p.status === filtroStatus);
  }

  // Ordenar por data
  pedidosArray.sort((a, b) => {
    const dateA = new Date(a.criado_em).getTime();
    const dateB = new Date(b.criado_em).getTime();
    return ordenarData === "asc" ? dateA - dateB : dateB - dateA;
  });

  const cancelarPedido = async (pedido_id) => {
    try {
      await api.put(`/pedidos/cancelar/${pedido_id}`);
      setPedidos((prev) =>
        prev.map((p) =>
          p.pedido_id === pedido_id ? { ...p, status: "cancelado" } : p
        )
      );
    } catch {
      alert("Erro ao cancelar pedido");
    }
  };

  const repetirPedido = async (pedido_id) => {
    try {
      const res = await api.post(`/pedidos/repetir/${pedido_id}`);
      alert(res.data.mensagem);
      const resPedidos = await api.get(`/pedidos/meus/${usuario_id}`);
      setPedidos(resPedidos.data);
    } catch {
      alert("Erro ao repetir pedido");
    }
  };

  const abrirModal = (pedido) => setModalPedido(pedido);
  const fecharModal = () => setModalPedido(null);

  return (
    <div className="meus-pedidos-container">
      <h1>Meus Pedidos</h1>

      {/* Filtros e ordenação */}
      <div className="filtros">
        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
        >
          <option value="todos">Todos</option>
          <option value="pendente">Pendente</option>
          <option value="concluido">Concluído</option>
          <option value="cancelado">Cancelado</option>
        </select>

        <select
          value={ordenarData}
          onChange={(e) => setOrdenarData(e.target.value)}
        >
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
              Total: R${" "}
              {pedido.itens
                .reduce((sum, i) => sum + i.preco * i.quantidade, 0)
                .toFixed(2)}
            </p>
            <p>
              Status:{" "}
              <span className={`status-${pedido.status}`}>{pedido.status}</span>
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
              <button
                className="btn-detalhes"
                onClick={() => abrirModal(pedido)}
              >
                Detalhes
              </button>
              <button
                className="btn-repetir"
                onClick={() => repetirPedido(pedido.pedido_id)}
              >
                Repetir
              </button>
              <button
                className="btn-cancelar"
                onClick={() => cancelarPedido(pedido.pedido_id)}
              >
                Cancelar
              </button>
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
              Total: R${" "}
              {modalPedido.itens
                .reduce((sum, i) => sum + i.preco * i.quantidade, 0)
                .toFixed(2)}
            </p>
            <p>
              Status:{" "}
              <span className={`status-${modalPedido.status}`}>
                {modalPedido.status}
              </span>
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