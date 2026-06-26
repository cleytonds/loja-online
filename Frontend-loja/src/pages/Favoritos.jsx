import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './Favoritos.css';

export default function Favoritos() {
  const [favoritos, setFavoritos] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    async function carregarFavoritos() {
      const token = localStorage.getItem('token');

      if (!token) {
        navigate('/login');
        return;
      }

      try {
        const res = await api.get('/favoritos', {
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

  async function remover(id) {
    const token = localStorage.getItem('token');

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
        <h2>Sua lista está vazia </h2>
        <button onClick={() => navigate('/produtos')}>Ver produtos</button>
      </div>
    );
  }

  return (
    <div className="favoritos-container">
      <h1 className="titulo">Meus Favoritos</h1>

      <div className="grid">
        {favoritos.map((item) => (
          <div key={item.id} className="card">
            <div className="img-box">
              <img src={`${api.defaults.baseURL}${item.imagem_principal}`} alt={item.nome} />

              <button className="fav-remove" onClick={() => remover(item.id)}>
                ♡
              </button>
            </div>

            <div className="info">
              <h3>{item.nome}</h3>

              <strong>
                R$ {Number(item.variacoes?.[0]?.preco || item.preco_base || 0).toFixed(2)}
              </strong>
            </div>

            <div className="acoes">
              <button onClick={() => navigate(`/produto/${item.id}`)}>Ver produto</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
