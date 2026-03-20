import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "./Favoritos.css";

export default function Favoritos() {
  const [favoritos, setFavoritos] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    async function carregarFavoritos() {
      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      try {
        const res = await api.get("/favoritos", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setFavoritos(res.data);
      } catch (err) {
        console.error(err);
      }
    }

    carregarFavoritos();
  }, []);

  // remover favorito
  async function remover(id) {
    const token = localStorage.getItem("token");

    try {
      await api.delete(`/favoritos/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setFavoritos((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error(err);
    }
  }

  if (favoritos.length === 0) {
    return (
      <div className="favoritos-vazio">
        <h2>Sua lista está vazia ❤️</h2>

        <button onClick={() => navigate("/produtos")}>
          Ver produtos
        </button>
      </div>
    );
  }

  return (
    <div className="favoritos-container">

      <h1 className="titulo">Meus Favoritos</h1>

      <div className="grid">

        {favoritos.map((item) => (
          <div key={item.id} className="card">

            <img src={item.imagem} alt={item.nome} />

            <h3>{item.nome}</h3>

            <p>R$ {Number(item.preco).toFixed(2)}</p>

            <div className="acoes">

              <button onClick={() => navigate(`/produto/${item.id}`)}>
                Ver produto
              </button>

              <button onClick={() => remover(item.id)} className="remover">
                Remover
              </button>

            </div>

          </div>
        ))}

      </div>

    </div>
  );
}