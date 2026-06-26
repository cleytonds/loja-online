import { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import './Perfil.css';

export default function Perfil() {
  const [pedidos, setPedidos] = useState([]);
  const [tab, setTab] = useState('pedidos');

  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    async function carregarPedidos() {
      try {
        const res = await api.get('/meus-pedidos', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        setPedidos(res.data);
      } catch (err) {
        console.error(err);
      }
    }

    if (user && user.tipo !== 'admin') {
      carregarPedidos();
    }
  }, [user]);

  if (!user) return <p className="loading">Carregando...</p>;

  return (
    <div className="dashboard">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="user-box">
          <div className="avatar">{user.foto ? <img src={user.foto} /> : '👤'}</div>

          <div>
            <strong>{user.nome}</strong>
            <p>{user.email}</p>
          </div>
        </div>

        <nav>
          <button onClick={() => setTab('pedidos')}>📦 Pedidos</button>
          <button onClick={() => navigate('/favoritos')}>❤️ Favoritos</button>
          <button onClick={() => setTab('config')}>⚙️ Configurações</button>
        </nav>

        <button className="logout" onClick={logout}>
          Sair
        </button>
      </aside>

      {/* CONTEÚDO */}
      <main className="content">
        {/* HEADER */}
        <header className="content-header">
          <h2>Minha Conta</h2>
        </header>

        {/* PEDIDOS */}
        {tab === 'pedidos' && (
          <div className="grid">
            {pedidos.length === 0 ? (
              <p>Nenhum pedido encontrado.</p>
            ) : (
              pedidos.map((p) => (
                <div className="order-card" key={p.id}>
                  <div className="order-top">
                    <strong>Pedido #{p.id}</strong>
                    <span className={`status ${p.status}`}>{p.status}</span>
                  </div>

                  <div className="order-bottom">
                    <span>{new Date(p.data).toLocaleDateString()}</span>
                    <strong>R$ {Number(p.total).toFixed(2)}</strong>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* CONFIGURAÇÕES (placeholder profissional) */}
        {tab === 'config' && (
          <div className="settings-card">
            <h3>Configurações da conta</h3>
            <p>Em breve: alterar senha, email e dados pessoais.</p>
          </div>
        )}
      </main>
    </div>
  );
}
