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
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={estoque}
                  dataKey="qtd"
                  nameKey="nome"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {estoque.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>

                <Legend />
              </PieChart>
            </ResponsiveContainer>
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
            {pedidosAtuais.map((p) => (
              <div key={p.id} className="pedido-card">
                <p>
                  <strong>Pedido:</strong>#{p.id}
                </p>

                <p>
                  <strong>Cliente:</strong>

                  {p.usuario_nome}
                </p>

                <p>
                  <strong>Email:</strong>

                  {p.usuario_email}
                </p>

                <p>
                  <strong>Total:</strong>
                  R$ {p.total}
                </p>

                <p>
                  <strong>Status:</strong>

                  {p.status}
                </p>

                {(p.status === 'pendente' || p.status === 'aguardando_confirmacao') && (
                  <>
                    <button
                      onClick={() => {
                        atualizarStatus(p.id, 'pago');
                      }}
                    >
                      Confirmar pagamento
                    </button>

                    {p.status === 'aguardando_confirmacao' && (
                      <button
                        onClick={() => {
                          atualizarStatus(p.id, 'cancelado');
                        }}
                      >
                        Reprovar pagamento PIX
                      </button>
                    )}
                  </>
                )}

                {p.status === 'pago' && (
                  <button
                    onClick={() => {
                      atualizarStatus(p.id, 'enviado');
                    }}
                  >
                    Enviado
                  </button>
                )}

                {p.status === 'enviado' && (
                  <button
                    onClick={() => {
                      atualizarStatus(p.id, 'entregue');
                    }}
                  >
                    Marcar como entregue
                  </button>
                )}
              </div>
            ))}
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
            {historicoPedidos.map((p) => (
              <div key={p.id} className="pedido-card pedido-card-readonly">
                <p>
                  <strong>Pedido:</strong>#{p.id}
                </p>

                <p>
                  <strong>Cliente:</strong>

                  {p.usuario_nome}
                </p>

                <p>
                  <strong>Email:</strong>

                  {p.usuario_email}
                </p>

                <p>
                  <strong>Total:</strong>
                  R$ {p.total}
                </p>

                <p>
                  <strong>Status:</strong>

                  {p.status}
                </p>

                <p className="pedido-somente-leitura">Pedido finalizado — somente leitura</p>
              </div>
            ))}
          </div>
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
