import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "./Perfil.css";

export default function Perfil() {
  const [usuario, setUsuario] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function carregarUsuario() {
      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      try {
        const res = await api.get("/usuario", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setUsuario(res.data);
      } catch (err) {
        console.error(err);
        navigate("/login");
      }
    }

    carregarUsuario();
  }, []);

  function sair() {
    localStorage.removeItem("token");
    navigate("/login");
  }

  if (!usuario) {
    return <p className="loading">Carregando...</p>;
  }

  return (
    <div className="perfil-container">

      <div className="perfil-card">

        <div className="perfil-topo">
          <div className="avatar">👤</div>
          <h2>{usuario.nome}</h2>
          <p>{usuario.email}</p>
        </div>

        <div className="perfil-acoes">

          <button onClick={() => navigate("/meus-pedidos")}>
            📦 Meus pedidos
          </button>

          <button onClick={() => navigate("/favoritos")}>
            ❤️ Favoritos
          </button>

          <button onClick={sair} className="sair">
            🚪 Sair
          </button>

        </div>

      </div>

    </div>
  );
}