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
  const [produtos, setProdutos] = useState([]);
  const [nome, setNome] = useState('');
  const [preco, setPreco] = useState('');
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState('');
  const [imagens, setImagens] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [variacoes, setVariacoes] = useState([]);
  const [tamanho, setTamanho] = useState('');
  const [cor, setCor] = useState('');
  const [precoVariacao, setPrecoVariacao] = useState('');
  const [estoqueVariacao, setEstoqueVariacao] = useState('');
  const [vendas, setVendas] = useState([]);
  const [estoque, setEstoque] = useState([]);

  //  UPLOAD MÚLTIPLO
  const [quantidade, setQuantidade] = useState(0);

  const { user, logout } = useContext(AuthContext);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  useEffect(() => {
    async function carregarDados() {
      await carregarProdutos();
      await carregarVendas();
      await carregarEstoque();
      await carregarCategorias();
    }

    carregarDados();
  }, [user]);

  //  IMAGENS
  function handleImagens(e) {
    setImagens([...e.target.files]);
  }

  async function carregarCategorias() {
    try {
      const res = await api.get('/produtos/categorias');
      setCategorias(res.data);
    } catch (err) {
      console.error('Erro categorias:', err);
    }
  }

  async function carregarProdutos() {
    try {
      const res = await api.get('/produtos');
      setProdutos(res.data);
    } catch (err) {
      console.error('Erro produtos:', err);
    }
  }

  async function carregarVendas() {
    try {
      const res = await api.get('/vendas', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setVendas(res.data);
    } catch (err) {
      console.error('Erro vendas:', err);
    }
  }

  async function carregarEstoque() {
    try {
      const res = await api.get('/estoque', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setEstoque(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Erro estoque:', err);
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

    const nova = {
      tamanho,
      cor,
      preco: Number(precoVariacao),
      estoque: Number(estoqueVariacao),
    };

    setVariacoes([...variacoes, nova]);

    setTamanho('');
    setCor('');
    setPrecoVariacao('');
    setEstoqueVariacao('');
  }

  //  CRIAR PRODUTO (PROFISSIONAL)
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

      setNome('');
      setPreco('');
      setDescricao('');
      setCategoria('');
      setQuantidade(0); // ✅ correto
      setImagens([]);
      setVariacoes([]); // 🔥 importante também limpar variações

      carregarProdutos();
    } catch (err) {
      console.error('Erro criar produto:', err);
    }
  }

  async function deletar(id) {
    try {
      await api.delete(`/produtos/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      carregarProdutos();
      carregarEstoque();
    } catch (err) {
      console.error('Erro deletar:', err);
    }
  }

  // =========================
  // EDITAR
  // =========================

  function editar(id) {
    navigate(`/admin/produto/${id}`);
  }

  return (
    <div className="admin-container">
      <h1>Painel Administrativo</h1>

      <div className="admin-criar-produto">
        <h2>Adicionar Produto</h2>

        <form onSubmit={criarProduto}>
          {/* NOME */}
          <input
            type="text"
            placeholder="Nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
          />

          {/* UPLOAD */}
          <input type="file" multiple accept="image/*" onChange={handleImagens} required />

          {/* PREVIEW */}
          <div className="preview">
            {Array.isArray(imagens) &&
              imagens.map((img, i) => (
                <img key={i} src={URL.createObjectURL(img)} alt="preview" width="70" />
              ))}
          </div>

          {/* PREÇO */}
          <input
            type="number"
            placeholder="Preço base"
            value={preco}
            onChange={(e) => setPreco(e.target.value)}
            required
          />

          {/* DESCRIÇÃO */}
          <input
            type="text"
            placeholder="Descrição"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
          />

          {/* CATEGORIA */}
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)} required>
            <option value="">Selecione a categoria</option>

            {Array.isArray(categorias) &&
              categorias.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.nome}
                </option>
              ))}
          </select>

          {/* =========================
          VARIAÇÕES DO PRODUTO
      ========================= */}

          <h3>Variações do Produto</h3>

          <div className="variacao-form">
            <input
              type="text"
              placeholder="Tamanho (P, M, G)"
              value={tamanho}
              onChange={(e) => setTamanho(e.target.value)}
            />

            <input
              type="text"
              placeholder="Cor"
              value={cor}
              onChange={(e) => setCor(e.target.value)}
            />

            <input
              type="number"
              placeholder="Preço"
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
          </div>

          {/* =========================
        VARIAÇÕES CADASTRADAS
    ========================= */}

          <div className="lista-variacoes">
            {variacoes.map((v, index) => (
              <div key={index} className="variacao-item">
                <p>
                  <strong>Tamanho:</strong> {v.tamanho}
                </p>

                <p>
                  <strong>Cor:</strong> {v.cor}
                </p>

                <p>
                  <strong>Preço:</strong> R$ {v.preco}
                </p>

                <p>
                  <strong>Estoque:</strong> {v.estoque}
                </p>
              </div>
            ))}
          </div>

          {/* LISTA DAS VARIAÇÕES */}
          <div>
            {variacoes.map((v, i) => (
              <p key={i}>
                {v.tamanho} | {v.cor} | R$ {v.preco} | Estoque: {v.estoque}
              </p>
            ))}
          </div>

          {/* BOTÃO FINAL */}
          <button type="submit">Criar Produto</button>
        </form>
      </div>

      {/* GRÁFICOS */}
      <div className="admin-graficos">
        <h2>Vendas por mês</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={vendas}>
            <XAxis dataKey="mes" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="total" fill="#0088FE" />
          </BarChart>
        </ResponsiveContainer>

        <h2>Estoque</h2>
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
              {Array.isArray(estoque) &&
                estoque.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* PRODUTOS */}
      <div className="admin-produtos">
        <h2>Produtos</h2>

        <ul>
          {Array.isArray(produtos) &&
            produtos.map((p) => (
              <li key={p.id} className="produto-admin-item">
                <strong>{p.nome}</strong>

                {/* PREÇO */}
                <p>Preço: R$ {p.variacoes?.length > 0 ? p.variacoes[0].preco : p.preco || 0}</p>

                {/* VARIAÇÕES */}
                {p.variacoes && p.variacoes.length > 0 && (
                  <div className="variacoes-admin">
                    <strong>Variações:</strong>

                    {p.variacoes.map((v) => (
                      <p key={v.id}>
                        {v.tamanho} | {v.cor} | R$ {v.preco} | Estoque: {v.estoque}
                      </p>
                    ))}
                  </div>
                )}

                {/* BOTÃO */}
                <div>
                  <button onClick={() => editar(p.id)}>Editar</button>

                  <button onClick={() => deletar(p.id)}>Excluir</button>
                </div>
              </li>
            ))}
        </ul>
      </div>

      <button onClick={logout}> Sair</button>
    </div>
  );
}
