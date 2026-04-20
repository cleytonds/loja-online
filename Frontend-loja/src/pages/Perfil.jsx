// src/pages/Perfil.jsx
import { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { AuthContext } from "../context/AuthContext";
import "./Perfil.css";

export default function Perfil() {
  const [pedidos, setPedidos] = useState([]);
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState("");
  const [foto, setFoto] = useState("");

  const { user, setUser, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      setNome(user.nome);
      setFoto(user.foto || "");
    }

    async function carregarPedidos() {
      try {
        const res = await api.get("/meus-pedidos", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        setPedidos(res.data);
      } catch (err) {
        console.error(err);
      }
    }

    if (user && user.tipo !== "admin") {
      carregarPedidos();
    }
  }, [user]);

  async function salvarPerfil() {
    try {
      const res = await api.put(
        "/usuarios/perfil",
        { nome, foto },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      setUser(res.data);
      setEditando(false);
    } catch (err) {
      console.error("Erro ao salvar:", err);
    }
  }

  if (!user) return <p>Carregando...</p>;

  return (
    <div className="perfil-container">
      <div className="perfil-card">

        {/* HEADER */}
        <div className="perfil-header">

          <div className="avatar">
            {foto ? (
              <img src={foto} alt="avatar" />
            ) : (
              "👤"
            )}
          </div>

          {editando ? (
            <>
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="input"
              />

              <input
                placeholder="URL da foto"
                value={foto}
                onChange={(e) => setFoto(e.target.value)}
                className="input"
              />

              <button className="btn salvar" onClick={salvarPerfil}>
                Salvar
              </button>
            </>
          ) : (
            <>
              <h2>{user.nome}</h2>
              <p>{user.email}</p>

              <button
                className="btn editar"
                onClick={() => setEditando(true)}
              >
                ✏️ Editar Perfil
              </button>
            </>
          )}
        </div>

        <div className="divider"></div>

        {/* PEDIDOS */}
        <div className="perfil-section">
          <h3>📦 Meus Pedidos</h3>

          {pedidos.length === 0 ? (
            <p className="vazio">Nenhum pedido encontrado.</p>
          ) : (
            <ul className="pedidos-lista">
              {pedidos.map((p) => (
                <li key={p.id} className="pedido-card">
                  <div>
                    <strong>Pedido #{p.id}</strong>
                    <span>{new Date(p.data).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span>{p.status}</span>
                    <strong>R$ {Number(p.total).toFixed(2)}</strong>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* AÇÕES */}
        <div className="perfil-acoes">
          <button
            className="btn favorito"
            onClick={() => navigate("/favoritos")}
          >
            ❤️ Favoritos
          </button>

          <button className="btn sair" onClick={logout}>
            🚪 Sair
          </button>
        </div>

      </div>
    </div>
  );
}