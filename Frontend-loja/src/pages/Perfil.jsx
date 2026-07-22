import { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';

import api from '../services/api';
import ImagemProduto from '../components/ImagemProduto.jsx';
import { AuthContext } from '../context/AuthContext';
import { CarrinhoContext } from '../context/CarrinhoContext';
import { getErrorMessage } from '../utils/frontendState.js';
import BotaoAtendimentoWhatsApp from '../components/BotaoAtendimentoWhatsApp.jsx';
import { montarMensagemEntregaPedido, pedidoPodeTratarEntrega } from '../utils/whatsapp.js';

import './Perfil.css';

function formatarTempoRestante(expiresAt, agora) {
  const totalSegundos = Math.max(0, Math.ceil((new Date(expiresAt).getTime() - agora) / 1000));
  return `${String(Math.floor(totalSegundos / 60)).padStart(2, '0')}:${String(totalSegundos % 60).padStart(2, '0')}`;
}

function formatarFormaPagamento(pagamento) {
  const nomes = {
    mercado_pago: 'Mercado Pago',
    pix: 'PIX',
    cartao_credito: 'Cartão de Crédito',
    credit_card: 'Cartão de Crédito',
    whatsapp: 'WhatsApp',
  };

  return nomes[String(pagamento || '').trim().toLowerCase()] || 'Não informado';
}

export default function Perfil() {
  const navigate = useNavigate();
  const { user, logout, atualizarUsuario } = useContext(AuthContext);
  const { restaurarPedidoExpirado } = useContext(CarrinhoContext);

  const [tab, setTab] = useState('perfil');

  const [pedidos, setPedidos] = useState([]);
  const [carregandoPedidos, setCarregandoPedidos] = useState(false);
  const [continuandoPedidoId, setContinuandoPedidoId] = useState(null);
  const [agora, setAgora] = useState(Date.now());

  const [editar, setEditar] = useState(false);
  const [senha, setSenha] = useState(false);
  const [errosCadastro, setErrosCadastro] = useState({});
  const [mensagemCadastro, setMensagemCadastro] = useState('');

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

  function validarCampoCadastro(campo, valor) {
    const texto = String(valor || '').trim();

    if (campo === 'email' && texto && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(texto)) {
      return 'E-mail inválido';
    }

    if (campo === 'celular' && texto && !/^\d{10,11}$/.test(texto.replace(/\D/g, ''))) {
      return 'Celular inválido';
    }

    if (campo === 'cep' && texto && !/^\d{8}$/.test(texto.replace(/\D/g, ''))) {
      return 'CEP inválido';
    }

    return '';
  }

  function validarAoSairDoCampo(campo, valor) {
    setErrosCadastro((anterior) => ({
      ...anterior,
      [campo]: validarCampoCadastro(campo, valor),
    }));
  }

  function abrirEdicao() {
    setErrosCadastro({});
    setMensagemCadastro('');
    setEditar(true);
  }

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

  useEffect(() => {
    const interval = window.setInterval(() => setAgora(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

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
      alert(getErrorMessage(err, 'Erro ao carregar pedidos'));
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
    } catch (err) {
      console.log(err);
      const mensagem = getErrorMessage(err, 'Erro ao atualizar');
      setMensagemCadastro(mensagem);

      if (/e-?mail/i.test(mensagem)) {
        setErrosCadastro((anterior) => ({ ...anterior, email: mensagem }));
      }
    }
  }

  async function continuarPagamentoMercadoPago(pedido) {
    try {
      setContinuandoPedidoId(pedido.id);

      const resposta = await api.post(
        `/pagamentos/mercado-pago/preferencia/${pedido.id}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        },
      );
      const checkoutUrl = resposta.data?.checkoutUrl;

      if (typeof checkoutUrl !== 'string' || !checkoutUrl.trim()) {
        throw new Error('Link de pagamento indisponível');
      }

      window.location.assign(checkoutUrl);
    } catch (err) {
      alert(getErrorMessage(err, 'Não foi possível continuar o pagamento'));
    } finally {
      setContinuandoPedidoId(null);
    }
  }

  function voltarAoCarrinho(pedido) {
    const resultado = restaurarPedidoExpirado(pedido.id, pedido.itens);
    if (resultado.jaRestaurado) {
      alert('Os itens deste pedido já foram restaurados no carrinho.');
    } else if (resultado.indisponiveis > 0) {
      alert('Parte dos itens não pôde ser restaurada por falta de estoque.');
    }
    navigate('/carrinho');
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
      alert(getErrorMessage(err, 'Erro ao alterar senha'));
    }
  }

  if (!user) return <p role="status">Carregando...</p>;

  const pedidosEmAndamento = pedidos.filter((pedido) =>
    ['pendente', 'aguardando_confirmacao'].includes(String(pedido.status || '').trim().toLowerCase()),
  );
  const pedidosHistorico = pedidos.filter((pedido) =>
    ['pago', 'enviado', 'entregue', 'cancelado', 'expirado'].includes(
      String(pedido.status || '').trim().toLowerCase(),
    ),
  );

  function renderPedido(pedido, permitirAcoes) {
    const status = String(pedido.status || '').trim().toLowerCase();
    const pagamentoMercadoPago = pedido.pagamento === 'mercado_pago';
    const prazoVencido = pagamentoMercadoPago && pedido.expires_at
      && new Date(pedido.expires_at).getTime() <= agora;
    const pedidoExpirado = status === 'expirado' || prazoVencido;

    return (
      <div className={`order-card ${permitirAcoes ? '' : 'order-card-readonly'}`} key={pedido.id}>
        <div className="order-header">
          <strong>Pedido #{pedido.id}</strong>
          <span className={`status ${status}`}>{status}</span>
        </div>

        {permitirAcoes && status === 'pendente' && pagamentoMercadoPago && !pedidoExpirado && (
          <div className="acoes-pedido">
            <p>Pedido expira em {formatarTempoRestante(pedido.expires_at, agora)}</p>
            <button
              className="btn-pagamento"
              onClick={() => continuarPagamentoMercadoPago(pedido)}
              disabled={continuandoPedidoId === pedido.id}
            >
              {continuandoPedidoId === pedido.id ? 'Abrindo pagamento...' : 'Continuar pagamento'}
            </button>
            <BotaoAtendimentoWhatsApp
              numero={pedido.whatsapp_number}
              mensagem={`Olá! Estou com uma dúvida sobre o pedido #${pedido.id}.`}
            />
          </div>
        )}

        {permitirAcoes && pedidoExpirado && pagamentoMercadoPago && (
          <div className="acoes-pedido">
            <p className="pedido-somente-leitura">Pedido expirado</p>
            <p className="pedido-somente-leitura">
              {status === 'expirado'
                ? 'O tempo para pagamento expirou. Os itens foram devolvidos ao seu carrinho.'
                : 'O tempo para pagamento expirou. Aguardando a devolução do estoque.'}
            </p>
            {status === 'expirado' && (
              <button className="btn-pagamento" onClick={() => voltarAoCarrinho(pedido)}>
                Voltar ao carrinho
              </button>
            )}
            <BotaoAtendimentoWhatsApp
              numero={pedido.whatsapp_number}
              mensagem={`Olá! Estou com uma dúvida sobre o pedido #${pedido.id}.`}
            />
          </div>
        )}

        {permitirAcoes && status === 'pendente' && pedido.pagamento === 'pix' && (
          <div className="acoes-pedido">
            <button
              className="btn-pagamento"
              onClick={() =>
                navigate(`/pagamento/${pedido.id}`, {
                  state: pedido,
                })
              }
            >
              Pagar com PIX
            </button>
          </div>
        )}

        {pedidoPodeTratarEntrega(status) && (
          <div className="acoes-pedido">
            <BotaoAtendimentoWhatsApp
              numero={pedido.whatsapp_number}
              texto="Tratar entrega pelo WhatsApp"
              mensagem={montarMensagemEntregaPedido({ pedido, nomeCliente: user?.nome })}
            />
          </div>
        )}

        <div className={permitirAcoes ? '' : 'pedido-resumo-consulta'}>
          <p>Data: {new Date(pedido.created_at).toLocaleString('pt-BR')}</p>
          {permitirAcoes ? (
            <>
              <p>Pagamento: {formatarFormaPagamento(pedido.pagamento)}</p>
              <h3>R$ {Number(pedido.total || 0).toFixed(2)}</h3>
            </>
          ) : (
            <p className="pedido-total-consulta">Total: R$ {Number(pedido.total || 0).toFixed(2)}</p>
          )}
        </div>

        {!permitirAcoes && (
          <div className="pedido-itens-consulta">
            {(pedido.itens || []).map((item, index) => (
              <article className="pedido-item-consulta" key={`${pedido.id}-${item.variacao_id || index}`}>
                <ImagemProduto
                  url={item.imagem_principal}
                  alt={item.nome || 'Produto comprado'}
                />
                <div>
                  <strong>{item.nome}</strong>
                  <p>Quantidade: {item.quantidade}</p>
                  <p>Cor: {item.cor || 'Não informada'}</p>
                  <p>Tamanho: {item.tamanho || 'Não informado'}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    );
  }

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
          <button className={tab === 'perfil' ? 'ativo' : ''} onClick={() => setTab('perfil')}>Minha conta</button>

          <button
            className={tab === 'pedidos' ? 'ativo' : ''}
            onClick={() => {
              setTab('pedidos');
              setPedidos([]); // limpa até buscar
            }}
          >
            Pedidos
          </button>

          <button
            className={tab === 'historico' ? 'ativo' : ''}
            onClick={() => {
              setTab('historico');
              carregarPedidos();
            }}
          >
            Histórico de pedidos
          </button>

          <button onClick={() => navigate('/favoritos')}>Favoritos</button>

          <button className={tab === 'config' ? 'ativo' : ''} onClick={() => setTab('config')}>Configurações</button>
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
                <p>Pedidos que ainda exigem ação</p>
              </div>

              <button
                className="buscar-pedidos"
                onClick={carregarPedidos}
                disabled={carregandoPedidos}
              >
                {carregandoPedidos ? 'Buscando...' : 'Buscar pedidos'}
              </button>
            </div>

            {!carregandoPedidos && pedidosEmAndamento.length === 0 && (
              <div className="empty-orders">
                <h4>Nenhum pedido carregado</h4>
                <p>Clique em buscar para ver seus pedidos.</p>
              </div>
            )}

            <div className="meus-pedidos-grid">
              {pedidosEmAndamento.map((pedido) => renderPedido(pedido, true))}
            </div>
          </div>
        )}

        {tab === 'historico' && (
          <div className="pedidos-area">
            <div className="pedidos-header">
              <div>
                <h3>Histórico de pedidos</h3>
                <p>Pedidos finalizados para consulta</p>
              </div>

            </div>

            {!carregandoPedidos && pedidosHistorico.length === 0 && (
              <div className="empty-orders">
                <h4>Nenhum pedido no histórico</h4>
                <p>Nenhum pedido finalizado foi encontrado.</p>
              </div>
            )}

            <div className="meus-pedidos-grid">
              {pedidosHistorico.map((pedido) => renderPedido(pedido, false))}
            </div>
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

            <button onClick={abrirEdicao}>Editar dados</button>
            <button onClick={() => setSenha(true)}>Alterar senha</button>
          </div>
        )}
      </main>

      {/* ========================= MODAL EDITAR ========================= */}
      {editar && (
        <div className="modal-card modal-editar-cadastro" role="dialog" aria-modal="true" aria-labelledby="titulo-editar-cadastro">
          <h3 id="titulo-editar-cadastro">Editar cadastro</h3>

          <div className="campo-cadastro">
            <label htmlFor="cadastro-nome">Nome</label>
            <input id="cadastro-nome" value={nome} placeholder="Ex: João Silva" onChange={(e) => setNome(e.target.value)} />
          </div>

          <div className="campo-cadastro">
            <label htmlFor="cadastro-email">E-mail</label>
            <input id="cadastro-email" type="email" value={email} placeholder="Ex: joao@email.com" onChange={(e) => setEmail(e.target.value)} onBlur={(e) => validarAoSairDoCampo('email', e.target.value)} />
            {errosCadastro.email && <small className="erro-cadastro">{errosCadastro.email}</small>}
          </div>

          <div className="campo-cadastro">
            <label htmlFor="cadastro-celular">Celular</label>
            <input id="cadastro-celular" type="tel" value={celular} placeholder="Ex: (81) 99999-9999" onChange={(e) => setCelular(e.target.value)} onBlur={(e) => validarAoSairDoCampo('celular', e.target.value)} />
            {errosCadastro.celular && <small className="erro-cadastro">{errosCadastro.celular}</small>}
          </div>

          <div className="campo-cadastro">
            <label htmlFor="cadastro-cep">CEP</label>
            <input id="cadastro-cep" inputMode="numeric" value={cep} placeholder="Ex: 50000-000" onChange={(e) => setCep(e.target.value)} onBlur={(e) => validarAoSairDoCampo('cep', e.target.value)} />
            {errosCadastro.cep && <small className="erro-cadastro">{errosCadastro.cep}</small>}
          </div>

          <div className="campo-cadastro">
            <label htmlFor="cadastro-rua">Rua</label>
            <input id="cadastro-rua" value={rua} placeholder="Ex: Rua das Flores" onChange={(e) => setRua(e.target.value)} />
          </div>

          <div className="campo-cadastro">
            <label htmlFor="cadastro-numero">Número</label>
            <input id="cadastro-numero" value={numero} placeholder="Ex: 120" onChange={(e) => setNumero(e.target.value)} />
          </div>

          <div className="campo-cadastro">
            <label htmlFor="cadastro-bairro">Bairro</label>
            <input id="cadastro-bairro" value={bairro} placeholder="Ex: Boa Viagem" onChange={(e) => setBairro(e.target.value)} />
          </div>

          <div className="campo-cadastro">
            <label htmlFor="cadastro-cidade">Cidade</label>
            <input id="cadastro-cidade" value={cidade} placeholder="Ex: Recife" onChange={(e) => setCidade(e.target.value)} />
          </div>

          <div className="campo-cadastro">
            <label htmlFor="cadastro-estado">Estado</label>
            <input id="cadastro-estado" value={estado} placeholder="Ex: PE" onChange={(e) => setEstado(e.target.value)} />
          </div>

          {mensagemCadastro && <p className="mensagem-cadastro" role="alert">{mensagemCadastro}</p>}

          <div className="acoes-cadastro">
            <button onClick={salvarPerfil}>Salvar</button>
            <button onClick={() => setEditar(false)}>Cancelar</button>
          </div>
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
