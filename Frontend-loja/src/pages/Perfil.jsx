// src/pages/Perfil.jsx
import { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { AuthContext } from "../context/AuthContext";
import "./Perfil.css";

export default function Perfil() {
  const [pedidos, setPedidos] = useState([]);
  const { user, logout } = useContext(AuthContext); // Pega usuário logado
  const navigate = useNavigate();

  // Carrega pedidos do usuário
  useEffect(() => {
    async function carregarPedidos() {
      if (!user) {
        navigate("/login");
        return;
      }

      if (user.tipo === "admin") {
        navigate("/admin");
        return;
      }

      try {
        const resPedidos = await api.get("/meus-pedidos", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        setPedidos(resPedidos.data);
      } catch (err) {
        console.error("Erro ao carregar pedidos:", err);
      }
    }

    carregarPedidos();
  }, [user]);

  if (!user) return <p className="loading">Carregando...</p>;

  return (
    <div className="perfil-container">
      <div className="perfil-card">
        <div className="perfil-topo">
          <div className="avatar">👤</div>
          <h2>{user.nome}</h2>
          <p>{user.email}</p>
        </div>

        <div className="perfil-acoes">
          <h3>Meus Pedidos</h3>
          {pedidos.length === 0 ? (
            <p>Nenhum pedido encontrado.</p>
          ) : (
            <ul className="pedidos-lista">
              {pedidos.map(p => (
                <li key={p.id}>
                  <span>Pedido #{p.id}</span>
                  <span>Status: {p.status}</span>
                  <span>Total: R$ {Number(p.total).toFixed(2)}</span>
                  <span>Data: {new Date(p.data).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          )}
          <button onClick={() => navigate("/favoritos")}>❤️ Meus Favoritos</button>
          <button onClick={logout} className="sair">🚪 Sair</button>
        </div>
      </div>
    </div>
  );
}