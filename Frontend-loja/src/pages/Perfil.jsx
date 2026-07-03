import { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';

import api from '../services/api';
import { AuthContext } from '../context/AuthContext';

import './Perfil.css';

export default function Perfil() {
  const navigate = useNavigate();
  const { user, logout, atualizarUsuario } = useContext(AuthContext);

  const [tab, setTab] = useState('perfil');

  const [pedidos, setPedidos] = useState([]);
  const [carregandoPedidos, setCarregandoPedidos] = useState(false);

  const [editar, setEditar] = useState(false);
  const [senha, setSenha] = useState(false);

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [celular, setCelular] = useState('');

  const [rua, setRua] = useState('');
  const [numero, setNumero] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [cep, setCep] = useState('');

  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');

  // =========================
  // CARREGA USUÁRIO
  // =========================
  useEffect(() => {
    if (!user) return;

    setNome(user.nome || '');
    setEmail(user.email || '');
    setCelular(user.celular || '');

    setRua(user.rua || '');
    setNumero(user.numero || '');
    setBairro(user.bairro || '');
    setCidade(user.cidade || '');
    setEstado(user.estado || '');
    setCep(user.cep || '');
  }, [user]);

  // =========================
  // BUSCAR PEDIDOS (MANUAL)
  // =========================
  async function carregarPedidos() {
    try {
      setCarregandoPedidos(true);

      const token = localStorage.getItem('token');

      const res = await api.get('/pedidos/meus', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setPedidos(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('ERRO PEDIDOS:', err);
      alert('Erro ao carregar pedidos');
      setPedidos([]);
    } finally {
      setCarregandoPedidos(false);
    }
  }

  // =========================
  // SALVAR PERFIL
  // =========================
  async function salvarPerfil() {
    try {
      const res = await api.put(
        '/usuarios/perfil',
        {
          nome,
          email,
          celular,
          rua,
          numero,
          bairro,
          cidade,
          estado,
          cep,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        },
      );

      atualizarUsuario(res.data);
      setEditar(false);

      alert('Perfil atualizado');
    } catch (err) {
      console.log(err);
      alert(err.response?.data?.erro || 'Erro ao atualizar');
    }
  }

  // =========================
  // ALTERAR SENHA
  // =========================
  async function alterarSenha() {
    try {
      await api.put(
        '/usuarios/senha',
        {
          senhaAtual,
          novaSenha,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        },
      );

      alert('Senha alterada');

      setSenha(false);
      setSenhaAtual('');
      setNovaSenha('');
    } catch (err) {
      alert(err.response?.data?.erro || 'Erro ao alterar senha');
    }
  }

  if (!user) return <p>Carregando...</p>;

  return (
    <div className="dashboard">
      {/* ========================= SIDEBAR ========================= */}
      <aside className="sidebar">
        <div className="user-box">
          <div className="avatar">
            {user.foto ? (
              <img
                src={
                  user.foto.startsWith('http') ? user.foto : `${api.defaults.baseURL}${user.foto}`
                }
                alt="perfil"
              />
            ) : (
              '👤'
            )}
          </div>

          <div>
            <strong>{user.nome}</strong>
            <p>{user.email}</p>
          </div>
        </div>

        <nav>
          <button onClick={() => setTab('perfil')}>Minha conta</button>

          <button
            className={tab === 'pedidos' ? 'ativo' : ''}
            onClick={() => {
              setTab('pedidos');
              setPedidos([]); // limpa até buscar
            }}
          >
            Pedidos
          </button>

          <button onClick={() => navigate('/favoritos')}>Favoritos</button>

          <button onClick={() => setTab('config')}>Configurações</button>
        </nav>

        <button className="logout" onClick={logout}>
          Sair
        </button>
      </aside>

      {/* ========================= CONTENT ========================= */}
      <main className="content">
        <h2>Minha Conta</h2>

        {/* PERFIL */}
        {tab === 'perfil' && (
          <div className="settings-card">
            <h3>Bem vindo, {user.nome}</h3>
            <p>Acompanhe seus pedidos e gerencie sua conta.</p>
          </div>
        )}

        {/* PEDIDOS */}
        {tab === 'pedidos' && (
          <div className="pedidos-area">
            <div className="pedidos-header">
              <div>
                <h3>Meus pedidos</h3>
                <p>Histórico de compras</p>
              </div>

              <button
                className="buscar-pedidos"
                onClick={carregarPedidos}
                disabled={carregandoPedidos}
              >
                {carregandoPedidos ? 'Buscando...' : 'Buscar pedidos'}
              </button>
            </div>

            {!carregandoPedidos && pedidos.length === 0 && (
              <div className="empty-orders">
                <h4>Nenhum pedido carregado</h4>
                <p>Clique em buscar para ver seus pedidos.</p>
              </div>
            )}

            {pedidos.map((p) => (
              <div className="order-card" key={p.id}>
                <div className="order-header">
                  <strong>Pedido #{p.id}</strong>
                  <span className={`status ${p.status}`}>{p.status}</span>
                </div>

                <p>Data: {new Date(p.created_at).toLocaleString('pt-BR')}</p>

                <p>Pagamento: {p.pagamento}</p>

                <h3>R$ {Number(p.total || 0).toFixed(2)}</h3>
              </div>
            ))}
          </div>
        )}

        {/* CONFIG */}
        {tab === 'config' && (
          <div className="settings-card">
            <h3>Dados pessoais</h3>

            <p>{user.nome}</p>
            <p>{user.email}</p>
            <p>{user.celular}</p>

            <p>
              {user.rua} {user.numero}
              <br />
              {user.bairro}
              <br />
              {user.cidade} - {user.estado}
              <br />
              CEP: {user.cep}
            </p>

            <button onClick={() => setEditar(true)}>Editar dados</button>
            <button onClick={() => setSenha(true)}>Alterar senha</button>
          </div>
        )}
      </main>

      {/* ========================= MODAL EDITAR ========================= */}
      {editar && (
        <div className="modal-card">
          <h3>Editar cadastro</h3>

          <input value={nome} onChange={(e) => setNome(e.target.value)} />
          <input value={email} onChange={(e) => setEmail(e.target.value)} />
          <input value={celular} onChange={(e) => setCelular(e.target.value)} />

          <input value={rua} onChange={(e) => setRua(e.target.value)} />
          <input value={numero} onChange={(e) => setNumero(e.target.value)} />
          <input value={bairro} onChange={(e) => setBairro(e.target.value)} />
          <input value={cidade} onChange={(e) => setCidade(e.target.value)} />
          <input value={estado} onChange={(e) => setEstado(e.target.value)} />
          <input value={cep} onChange={(e) => setCep(e.target.value)} />

          <button onClick={salvarPerfil}>Salvar</button>
          <button onClick={() => setEditar(false)}>Cancelar</button>
        </div>
      )}

      {/* ========================= MODAL SENHA ========================= */}
      {senha && (
        <div className="modal-card">
          <h3>Alterar senha</h3>

          <input
            type="password"
            placeholder="Senha atual"
            onChange={(e) => setSenhaAtual(e.target.value)}
          />

          <input
            type="password"
            placeholder="Nova senha"
            onChange={(e) => setNovaSenha(e.target.value)}
          />

          <button onClick={alterarSenha}>Salvar senha</button>
          <button onClick={() => setSenha(false)}>Cancelar</button>
        </div>
      )}
    </div>
  );
}
