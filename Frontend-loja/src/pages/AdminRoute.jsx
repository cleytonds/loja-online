// src/pages/Admin.jsx
import { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from "recharts";
import { AuthContext } from "../context/AuthContext"; // Importa o AuthContext
import "./Admin.css";

export default function Admin() {
  const [produtos, setProdutos] = useState([]); // Lista de produtos
  const [nome, setNome] = useState("");         // Nome do produto novo
  const [preco, setPreco] = useState("");       // Preço do produto novo
  const [descricao, setDescricao] = useState(""); // Descrição do produto novo
  const [vendas, setVendas] = useState([]);     // Dados de vendas
  const [estoque, setEstoque] = useState([]);   // Dados de estoque

  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext); // Pega dados do usuário logado

  // Cores dos gráficos
  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

  // UseEffect inicial para carregar dados do admin
  useEffect(() => {
    async function carregarDados() {
      if (!user) { // Se não estiver logado, redireciona para login
        navigate("/login");
        return;
      }

      if (user.tipo !== "admin") { // Se não for admin, redireciona para home
        navigate("/");
        return;
      }

      await carregarProdutos();
      await carregarVendas();
      await carregarEstoque();
    }

    carregarDados();
  }, [user]);

  // Função para carregar produtos
  async function carregarProdutos() {
    try {
      const res = await api.get("/produtos");
      setProdutos(res.data);
    } catch (err) {
      console.error("Erro ao carregar produtos:", err);
    }
  }

  // Função para carregar vendas
  async function carregarVendas() {
    try {
      const res = await api.get("/vendas", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setVendas(res.data);
    } catch (err) {
      console.error("Erro ao carregar vendas:", err);
    }
  }

  // Função para carregar estoque
  async function carregarEstoque() {
    try {
      const res = await api.get("/estoque", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setEstoque(res.data);
    } catch (err) {
      console.error("Erro ao carregar estoque:", err);
    }
  }

  // Função para criar produto
  async function criarProduto(e) {
    e.preventDefault();
    try {
      await api.post(
        "/produtos",
        { nome, preco, descricao },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      setNome("");
      setPreco("");
      setDescricao("");
      carregarProdutos();
      carregarEstoque();
    } catch (err) {
      console.error("Erro ao criar produto:", err);
    }
  }

  // Função para deletar produto
  async function deletar(id) {
    try {
      await api.delete(`/produtos/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      carregarProdutos();
      carregarEstoque();
    } catch (err) {
      console.error("Erro ao deletar produto:", err);
    }
  }

  return (
    <div className="admin-container">
      <h1>Painel Administrativo</h1>

      {/* Formulário de criação de produto */}
      <div className="admin-criar-produto">
        <h2>Adicionar Produto</h2>
        <form onSubmit={criarProduto}>
          <input type="text" placeholder="Nome" value={nome} onChange={e => setNome(e.target.value)} required />
          <input type="number" placeholder="Preço" value={preco} onChange={e => setPreco(e.target.value)} required />
          <input type="text" placeholder="Descrição" value={descricao} onChange={e => setDescricao(e.target.value)} />
          <button type="submit">Criar Produto</button>
        </form>
      </div>

      {/* Gráficos de vendas */}
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

        <h2>Estoque de produtos</h2>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie data={estoque} dataKey="qtd" nameKey="nome" cx="50%" cy="50%" outerRadius={100} label>
              {estoque.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Lista de produtos */}
      <div className="admin-produtos">
        <h2>Produtos</h2>
        <ul>
          {produtos.map(p => (
            <li key={p.id}>
              <span>{p.nome} - R$ {p.preco}</span>
              <button onClick={() => deletar(p.id)}>Excluir</button>
            </li>
          ))}
        </ul>
      </div>

      {/* Botão de logout */}
      <button className="sair" onClick={logout}>🚪 Sair</button>
    </div>
  );
}