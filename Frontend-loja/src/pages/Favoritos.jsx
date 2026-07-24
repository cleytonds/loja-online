import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import ImagemProduto from '../components/ImagemProduto.jsx';
import './Favoritos.css';

export default function Favoritos() {
  const [favoritos, setFavoritos] = useState([]);
  const [removendoId, setRemovendoId] = useState(null);
  const [erro, setErro] = useState('');
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

  async function remover(produtoId) {
    if (removendoId !== null) return;
    const token = localStorage.getItem('token');

    try {
      setRemovendoId(produtoId);
      setErro('');
      await api.post(`/favoritos/${produtoId}`, {}, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setFavoritos((prev) => prev.filter((item) => item.id !== produtoId));
    } catch (err) {
      console.error(err);
      setErro('Não foi possível remover dos favoritos. Tente novamente.');
    } finally {
      setRemovendoId(null);
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
      {erro && <p role="alert">{erro}</p>}

      <div className="grid">
        {favoritos.map((item) => (
          <div key={item.id} className="card">
            <div className="img-box">
              <ImagemProduto url={item.imagem_principal} alt={item.nome} />

              <button
                className="fav-remove"
                type="button"
                aria-label="Remover dos favoritos"
                disabled={removendoId === item.id}
                onClick={() => remover(item.id)}
              >
                {removendoId === item.id ? '…' : '♥'}
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
