// src/pages/Admin.jsx

import { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

import { AuthContext } from '../context/AuthContext';

import './Admin.css';

const STATUS_CONFIG = {
  pendente: { label: 'Pendente', className: 'status-pendente' },
  aguardando_confirmacao: { label: 'Aguardando confirmação', className: 'status-aguardando' },
  pago: { label: 'Pago', className: 'status-pago' },
  enviado: { label: 'Enviado', className: 'status-enviado' },
  entregue: { label: 'Entregue', className: 'status-entregue' },
  cancelado: { label: 'Cancelado', className: 'status-cancelado' },
  expirado: { label: 'Expirado', className: 'status-expirado' },
};

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarData(data) {
  return data ? new Date(data).toLocaleString('pt-BR') : 'Não informado';
}

function formatarPagamento(pagamento) {
  const labels = {
    mercado_pago: 'Mercado Pago',
    pix: 'PIX',
    whatsapp: 'WhatsApp',
    cartao_credito: 'Cartão de crédito',
  };

  return labels[pagamento] || 'Não informado';
}

function montarUrlImagem(url) {
  if (!url) return '';
  return url.startsWith('http') ? url : `${api.defaults.baseURL}${url}`;
}

function ImagemItemPedido({ url, nome }) {
  const [falhouAoCarregar, setFalhouAoCarregar] = useState(false);
  const src = montarUrlImagem(url);

  if (!src || falhouAoCarregar) {
    return (
      <div className="pedido-modal-sem-imagem" role="img" aria-label={`Imagem indisponível de ${nome}`}>
        <span aria-hidden="true">▧</span>
        <span>Imagem indisponível</span>
      </div>
    );
  }

  return <img src={src} alt={nome} onError={() => setFalhouAoCarregar(true)} />;
}

export default function Admin() {
  const navigate = useNavigate();

  // =========================
  // ABAS
  // =========================

  const [tab, setTab] = useState('produtos');

  // =========================
  // PRODUTOS
  // =========================

  const [produtos, setProdutos] = useState([]);

  const [nome, setNome] = useState('');
  const [preco, setPreco] = useState('');
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState('');

  const [imagens, setImagens] = useState([]);

  const [categorias, setCategorias] = useState([]);

  // =========================
  // VARIAÇÕES
  // =========================

  const [variacoes, setVariacoes] = useState([]);

  const [tamanho, setTamanho] = useState('');
  const [cor, setCor] = useState('');

  const [precoVariacao, setPrecoVariacao] = useState('');

  const [estoqueVariacao, setEstoqueVariacao] = useState('');

  // =========================
  // DASHBOARD
  // =========================

  const [vendas, setVendas] = useState([]);
  const [carregandoVendas, setCarregandoVendas] = useState(false);
  const [erroVendas, setErroVendas] = useState('');

  const [estoque, setEstoque] = useState([]);
  const [carregandoEstoque, setCarregandoEstoque] = useState(false);
  const [erroEstoque, setErroEstoque] = useState('');

  const [pedidosAtuais, setPedidosAtuais] = useState([]);
  const [historicoPedidos, setHistoricoPedidos] = useState([]);
  const [carregandoPedidos, setCarregandoPedidos] = useState(false);
  const [erroPedidos, setErroPedidos] = useState('');
  const [pedidoDetalhes, setPedidoDetalhes] = useState(null);
  const [carregandoDetalhes, setCarregandoDetalhes] = useState(false);
  const [erroDetalhes, setErroDetalhes] = useState('');

  const { logout } = useContext(AuthContext);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  // =========================
  // CARREGAR TUDO
  // =========================

  useEffect(() => {
    carregarProdutos();
    carregarCategorias();
    carregarPedidos('atuais');
    carregarVendas();
    carregarEstoque();
  }, []);

  // =========================
  // IMAGENS
  // =========================

  function handleImagens(e) {
    setImagens(Array.from(e.target.files));
  }

  // =========================
  // CATEGORIAS
  // =========================

  async function carregarCategorias() {
    try {
      const res = await api.get('/produtos/categorias');

      setCategorias(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.log('Erro categorias', err);

      setCategorias([]);
    }
  }

  // =========================
  // PRODUTOS
  // =========================

  async function carregarProdutos() {
    try {
      const res = await api.get('/produtos');

      setProdutos(res.data);
    } catch (err) {
      console.log('Erro produtos', err);
    }
  }

  // =========================
  // VENDAS
  // =========================

  async function carregarVendas() {
    setCarregandoVendas(true);
    setErroVendas('');

    try {
      const res = await api.get('/pedidos/vendas');

      setVendas(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.log('Erro vendas', err);
      setErroVendas('Não foi possível carregar as vendas.');
      setVendas([]);
    } finally {
      setCarregandoVendas(false);
    }
  }

  // =========================
  // ESTOQUE
  // CORRIGIDO
  // =========================

  async function carregarEstoque() {
    setCarregandoEstoque(true);
    setErroEstoque('');

    try {
      const res = await api.get('/produtos');

      let lista = [];

      res.data.forEach((produto) => {
        if (produto.variacoes) {
          produto.variacoes.forEach((v) => {
            lista.push({
              nome: `${produto.nome} - ${v.cor}`,

              qtd: v.estoque,
            });
          });
        }
      });

      setEstoque(lista);
    } catch (err) {
      console.log('Erro estoque', err);
      setErroEstoque('Não foi possível carregar o estoque.');
      setEstoque([]);
    } finally {
      setCarregandoEstoque(false);
    }
  }

  // =========================
  // PEDIDOS
  // =========================

  async function carregarPedidos(tipo = 'atuais') {
    setCarregandoPedidos(true);
    setErroPedidos('');

    try {
      const res = await api.get(`/pedidos?tipo=${tipo}`);
      const lista = Array.isArray(res.data) ? res.data : res.data?.data || [];

      if (tipo === 'historico') {
        setHistoricoPedidos(lista);
      } else {
        setPedidosAtuais(lista);
      }
    } catch (err) {
      console.log(err);
      setErroPedidos('Não foi possível carregar os pedidos.');
      if (tipo === 'historico') {
        setHistoricoPedidos([]);
      } else {
        setPedidosAtuais([]);
      }
    } finally {
      setCarregandoPedidos(false);
    }
  }

  // =========================
  // VARIAÇÕES
  // =========================

  function adicionarVariacao() {
    if (!tamanho || !cor || !precoVariacao || !estoqueVariacao) {
      alert('Preencha todos os campos');

      return;
    }

    setVariacoes([
      ...variacoes,

      {
        tamanho,

        cor,

        preco: Number(precoVariacao),

        estoque: Number(estoqueVariacao),
      },
    ]);

    setTamanho('');
    setCor('');
    setPrecoVariacao('');
    setEstoqueVariacao('');
  }

  // =========================
  // ATUALIZAR STATUS PEDIDO
  // =========================

  async function atualizarStatus(id, status) {
    try {
      const token = localStorage.getItem('token');

      await api.put(
        `/pedidos/${id}/status`,
        { status },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      await Promise.all([carregarPedidos('atuais'), carregarPedidos('historico')]);
      await carregarEstoque();

      setPedidoDetalhes((pedido) => (
        pedido?.id === id ? { ...pedido, status } : pedido
      ));

      alert('Status atualizado!');
    } catch (err) {
      console.error(err.response?.data);
      alert(JSON.stringify(err.response?.data));
    }
  }

  // =========================
  // CRIAR PRODUTO
  // =========================

  async function criarProduto(e) {
    e.preventDefault();

    const formData = new FormData();

    formData.append('nome', nome);

    formData.append('preco', preco);

    formData.append('descricao', descricao);

    formData.append('categoria', categoria);

    formData.append('variacoes', JSON.stringify(variacoes));

    imagens.forEach((img) => {
      formData.append('imagens', img);
    });

    try {
      await api.post('/produtos', formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,

          'Content-Type': 'multipart/form-data',
        },
      });

      alert('Produto criado com sucesso');

      setNome('');
      setPreco('');
      setDescricao('');
      setCategoria('');

      setImagens([]);

      setVariacoes([]);

      carregarProdutos();

      setTab('produtos');
    } catch (err) {
      console.log('Erro criar produto', err);

      alert('Erro ao criar produto');
    }
  }

  async function deletar(id) {
    await api.delete(`/produtos/${id}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    });

    carregarProdutos();
  }

  function editar(id) {
    navigate(`/admin/produto/${id}`);
  }

  async function abrirDetalhes(id) {
    setCarregandoDetalhes(true);
    setErroDetalhes('');
    setPedidoDetalhes(null);

    try {
      const res = await api.get(`/pedidos/${id}/detalhes`);
      setPedidoDetalhes(res.data);
    } catch (err) {
      setErroDetalhes(err.response?.data?.erro || 'Não foi possível carregar os detalhes do pedido.');
    } finally {
      setCarregandoDetalhes(false);
    }
  }

  function fecharDetalhes() {
    setPedidoDetalhes(null);
    setErroDetalhes('');
  }

  function renderizarBadgeStatus(status) {
    const config = STATUS_CONFIG[status] || { label: status || 'Não informado', className: 'status-desconhecido' };
    return <span className={`pedido-status ${config.className}`}>{config.label}</span>;
  }

  function renderizarAcoesPedido(pedido) {
    if (pedido.pagamento === 'mercado_pago' && pedido.status === 'pendente') {
      return null;
    }

    if (pedido.status === 'pendente' || pedido.status === 'aguardando_confirmacao') {
      return (
        <>
          <button className="pedido-acao pedido-acao-confirmar" onClick={() => atualizarStatus(pedido.id, 'pago')}>
            Aprovar pagamento
          </button>
          {pedido.status === 'aguardando_confirmacao' && (
            <button className="pedido-acao pedido-acao-reprovar" onClick={() => atualizarStatus(pedido.id, 'cancelado')}>
              Cancelar pedido
            </button>
          )}
        </>
      );
    }

    if (pedido.status === 'pago') {
      return <button className="pedido-acao" onClick={() => atualizarStatus(pedido.id, 'enviado')}>Marcar como enviado</button>;
    }

    if (pedido.status === 'enviado') {
      return <button className="pedido-acao" onClick={() => atualizarStatus(pedido.id, 'entregue')}>Marcar como entregue</button>;
    }

    return null;
  }

  function renderizarCardPedido(pedido, somenteLeitura = false) {
    return (
      <article key={pedido.id} className={`pedido-card-horizontal${somenteLeitura ? ' pedido-card-readonly' : ''}`}>
        <div className="pedido-card-cabecalho">
          <strong>Pedido #{pedido.id}</strong>
          {renderizarBadgeStatus(pedido.status)}
        </div>

        <div className="pedido-card-resumo">
          <p><span>Cliente</span>{pedido.usuario_nome || 'Não informado'}</p>
          <p><span>Valor total</span>{formatarMoeda(pedido.total)}</p>
          <p><span>Forma de pagamento</span>{formatarPagamento(pedido.pagamento)}</p>
          <p><span>Produtos</span>{Number(pedido.quantidade_produtos || pedido.itens?.length || 0)}</p>
          <p><span>Peças</span>{Number(pedido.quantidade_pecas || pedido.itens?.reduce((total, item) => total + Number(item.quantidade || 0), 0) || 0)}</p>
          <p><span>Data do pedido</span>{formatarData(pedido.created_at)}</p>
        </div>

        <div className="pedido-card-acoes">
          <button className="pedido-acao pedido-acao-detalhes" onClick={() => abrirDetalhes(pedido.id)}>Ver detalhes</button>
          {!somenteLeitura && renderizarAcoesPedido(pedido)}
        </div>
      </article>
    );
  }

  return (
    <div className="admin-container">
      <h1>Painel Administrativo</h1>

      {/* =========================
          MENU ABAS
      ========================= */}

      <div className="admin-tabs">
        <button className={tab === 'produtos' ? 'active' : ''} onClick={() => setTab('produtos')}>
          Produtos
        </button>

        <button className={tab === 'criar' ? 'active' : ''} onClick={() => setTab('criar')}>
          Adicionar Produto
        </button>

        <button className={tab === 'vendas' ? 'active' : ''} onClick={() => setTab('vendas')}>
          Vendas
        </button>

        <button className={tab === 'estoque' ? 'active' : ''} onClick={() => setTab('estoque')}>
          Estoque
        </button>

        <button
          className={tab === 'pedidos' ? 'active' : ''}
          onClick={() => {
            setTab('pedidos');
            carregarPedidos('atuais');
          }}
        >
          Pedidos
        </button>

        <button
          className={tab === 'historico' ? 'active' : ''}
          onClick={() => {
            setTab('historico');
            carregarPedidos('historico');
          }}
        >
          Histórico de pedidos
        </button>
      </div>

      {/* =========================
          PRODUTOS
      ========================= */}

      {tab === 'produtos' && (
        <div className="admin-produtos">
          <h2>Produtos cadastrados</h2>

          <div className="admin-produtos-grid">
            {produtos.map((p) => (
              <div key={p.id} className="produto-admin-item">
                <strong>{p.nome}</strong>

                <p>R$ {p.variacoes?.length ? p.variacoes[0].preco : p.preco}</p>

                {p.variacoes?.map((v) => (
                  <p key={v.id}>
                    {v.tamanho}
                    {' | '}
                    {v.cor}

                    {' | R$ '}
                    {v.preco}

                    {' | Estoque '}
                    {v.estoque}
                  </p>
                ))}

                <button onClick={() => editar(p.id)}>Editar</button>

                <button onClick={() => deletar(p.id)}>Excluir</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================
          CRIAR PRODUTO
      ========================= */}

      {tab === 'criar' && (
        <div className="admin-criar-produto">
          <h2>Adicionar Produto</h2>

          <form onSubmit={criarProduto}>
            <input
              placeholder="Nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
            />

            <input type="file" multiple accept="image/*" onChange={handleImagens} required />

            <div className="preview">
              {imagens.map((img, i) => (
                <img key={i} src={URL.createObjectURL(img)} alt="preview" />
              ))}
            </div>

            <input
              type="number"
              placeholder="Preço"
              value={preco}
              onChange={(e) => setPreco(e.target.value)}
              required
            />

            <input
              placeholder="Descrição"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />

            <select value={categoria} onChange={(e) => setCategoria(e.target.value)} required>
              <option value="">Categoria</option>

              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>

            <h3>Variações</h3>

            <input
              placeholder="Tamanho"
              value={tamanho}
              onChange={(e) => setTamanho(e.target.value)}
            />

            <input placeholder="Cor" value={cor} onChange={(e) => setCor(e.target.value)} />

            <input
              type="number"
              placeholder="Preço variação"
              value={precoVariacao}
              onChange={(e) => setPrecoVariacao(e.target.value)}
            />

            <input
              type="number"
              placeholder="Estoque"
              value={estoqueVariacao}
              onChange={(e) => setEstoqueVariacao(e.target.value)}
            />

            <button type="button" onClick={adicionarVariacao}>
              + Adicionar variação
            </button>

            {variacoes.map((v, i) => (
              <p key={i}>
                {v.tamanho}

                {' | '}

                {v.cor}

                {' | R$ '}

                {v.preco}

                {' | Estoque '}

                {v.estoque}
              </p>
            ))}

            <button type="submit">Criar Produto</button>
          </form>
        </div>
      )}

      {/* =========================
          VENDAS
      ========================= */}

      {tab === 'vendas' && (
        <div className="admin-graficos">
          <h2>Vendas por mês</h2>

          {erroVendas ? <p>{erroVendas}</p> : null}
          {carregandoVendas ? <p>Carregando vendas...</p> : null}

          {!carregandoVendas && !erroVendas && vendas.length === 0 ? (
            <p>Nenhuma venda confirmada até o momento.</p>
          ) : null}

          {!carregandoVendas && vendas.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={vendas}>
                <XAxis dataKey="mes" />

                <YAxis />

                <Tooltip />

                <Bar dataKey="total" fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          ) : null}
        </div>
      )}
      {/* =========================
          ESTOQUE
      ========================= */}

      {tab === 'estoque' && (
        <div className="admin-graficos">
          <h2>Controle de Estoque</h2>

          {erroEstoque ? <p>{erroEstoque}</p> : null}
          {carregandoEstoque ? <p>Carregando estoque...</p> : null}

          {!carregandoEstoque && !erroEstoque && estoque.length === 0 ? (
            <p>Nenhuma variação com estoque cadastrado.</p>
          ) : null}

          {!carregandoEstoque && estoque.length > 0 ? (
            <>
              <div className="estoque-grafico-container">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={estoque}
                      dataKey="qtd"
                      nameKey="nome"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={false}
                    >
                      {estoque.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>

                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="estoque-lista-mobile" aria-label="Lista de estoque por variação">
                {estoque.map((variacao, index) => (
                  <div className="estoque-linha-mobile" key={`${variacao.nome}-${index}`}>
                    <span className="estoque-variacao-nome">{variacao.nome}</span>
                    <strong className="estoque-variacao-quantidade">{Number(variacao.qtd || 0)}</strong>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* =========================
          PEDIDOS
      ========================= */}

      {tab === 'pedidos' && (
        <div className="admin-pedidos">
          <h2>Pedidos</h2>

          {erroPedidos ? <p>{erroPedidos}</p> : null}
          {carregandoPedidos ? <p>Carregando pedidos...</p> : null}

          {!carregandoPedidos && !erroPedidos && pedidosAtuais.length === 0 ? (
            <p>Nenhum pedido encontrado.</p>
          ) : null}

          <div className="admin-pedidos-grid">
            {pedidosAtuais.map((pedido) => renderizarCardPedido(pedido))}
          </div>
        </div>
      )}

      {tab === 'historico' && (
        <div className="admin-pedidos">
          <h2>Histórico de pedidos</h2>

          {erroPedidos ? <p>{erroPedidos}</p> : null}
          {carregandoPedidos ? <p>Carregando pedidos...</p> : null}

          {!carregandoPedidos && !erroPedidos && historicoPedidos.length === 0 ? (
            <p>Nenhum pedido finalizado encontrado.</p>
          ) : null}

          <div className="admin-pedidos-grid">
            {historicoPedidos.map((pedido) => renderizarCardPedido(pedido, true))}
          </div>
        </div>
      )}

      {(carregandoDetalhes || erroDetalhes || pedidoDetalhes) && (
        <div className="pedido-modal-backdrop" role="presentation" onMouseDown={fecharDetalhes}>
          <section
            className="pedido-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pedido-modal-titulo"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button className="pedido-modal-fechar" onClick={fecharDetalhes} aria-label="Fechar detalhes">×</button>
            {carregandoDetalhes && <p>Carregando detalhes do pedido...</p>}
            {erroDetalhes && <p className="pedido-modal-erro">{erroDetalhes}</p>}
            {pedidoDetalhes && (
              <>
                <header className="pedido-modal-cabecalho">
                  <div>
                    <h2 id="pedido-modal-titulo">Pedido #{pedidoDetalhes.id}</h2>
                    <p>{formatarData(pedidoDetalhes.created_at)}</p>
                  </div>
                  {renderizarBadgeStatus(pedidoDetalhes.status)}
                </header>

                <div className="pedido-modal-secoes">
                  <section>
                    <h3>Cliente</h3>
                    <p><strong>Nome:</strong> {pedidoDetalhes.usuario_nome || 'Não informado'}</p>
                    <p><strong>Telefone:</strong> {pedidoDetalhes.usuario_celular || 'Não informado'}</p>
                    <p><strong>E-mail:</strong> {pedidoDetalhes.usuario_email || 'Não informado'}</p>
                  </section>
                  <section>
                    <h3>Endereço</h3>
                    <p><strong>Rua:</strong> {pedidoDetalhes.endereco_rua || 'Não informado'}</p>
                    <p><strong>Número:</strong> {pedidoDetalhes.endereco_numero || 'Não informado'}</p>
                    <p><strong>Bairro:</strong> {pedidoDetalhes.endereco_bairro || 'Não informado'}</p>
                    <p><strong>Cidade:</strong> {[pedidoDetalhes.endereco_cidade, pedidoDetalhes.endereco_estado].filter(Boolean).join(' - ') || 'Não informado'}</p>
                    <p><strong>CEP:</strong> {pedidoDetalhes.endereco_cep || 'Não informado'}</p>
                  </section>
                </div>

                <section className="pedido-modal-itens">
                  <h3>Itens</h3>
                  {pedidoDetalhes.itens.map((item, index) => (
                    <article className="pedido-modal-item" key={`${item.produto_id}-${item.variacao_id}-${index}`}>
                      <ImagemItemPedido url={item.imagem_principal} nome={item.nome} />
                      <div>
                        <strong>{item.nome}</strong>
                        <p>Cor: {item.cor || 'Não informada'}</p>
                        <p>Tamanho: {item.tamanho || 'Não informado'}</p>
                        <p>Quantidade: {item.quantidade}</p>
                        <p>Preço unitário: {formatarMoeda(item.preco)}</p>
                        <p>Subtotal: {formatarMoeda(Number(item.preco) * Number(item.quantidade))}</p>
                      </div>
                    </article>
                  ))}
                </section>

                <footer className="pedido-modal-rodape">
                  <p><strong>Valor total:</strong> {formatarMoeda(pedidoDetalhes.total)}</p>
                  <p><strong>Forma de pagamento:</strong> {formatarPagamento(pedidoDetalhes.pagamento)}</p>
                  <p><strong>Status:</strong> {STATUS_CONFIG[pedidoDetalhes.status]?.label || pedidoDetalhes.status}</p>
                  <p><strong>Data do pagamento:</strong> {formatarData(pedidoDetalhes.pagamento_confirmado_em)}</p>
                  {pedidoDetalhes.mp_payment_id && <p><strong>Código Mercado Pago:</strong> {pedidoDetalhes.mp_payment_id}</p>}
                  <div className="pedido-modal-acoes">
                    {['entregue', 'cancelado', 'expirado'].includes(pedidoDetalhes.status)
                      ? <p className="pedido-modal-sem-acoes">Pedido finalizado — nenhuma ação disponível.</p>
                      : renderizarAcoesPedido(pedidoDetalhes)}
                  </div>
                </footer>
              </>
            )}
          </section>
        </div>
      )}

      {/* =========================
          SAIR
      ========================= */}

      <button className="btn-sair" onClick={logout}>
        Sair
      </button>
    </div>
  );
}
