// src/pages/Admin.jsx
import { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { AuthContext } from "../context/AuthContext";
import "./Admin.css";


export default function Admin() {
  const [produtos, setProdutos] = useState([]);
  const [nome, setNome] = useState("");
  const [preco, setPreco] = useState("");
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState("");

  const [categorias, setCategorias] = useState([]);

  const [vendas, setVendas] = useState([]);
  const [estoque, setEstoque] = useState([]);

  // 🔥 UPLOAD MÚLTIPLO
  const [imagens, setImagens] = useState([]);

  const { user, logout } = useContext(AuthContext);

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

  useEffect(() => {
    async function carregarDados() {
      await carregarProdutos();
      await carregarVendas();
      await carregarEstoque();
      await carregarCategorias();
    }

    carregarDados();
  }, [user]);

  // 🔥 IMAGENS
  function handleImagens(e) {
    setImagens([...e.target.files]);
  }

  async function carregarCategorias() {
    try {
      const res = await api.get("/produtos/categorias");
      setCategorias(res.data);
    } catch (err) {
      console.error("Erro categorias:", err);
    }
  }

  async function carregarProdutos() {
    try {
      const res = await api.get("/produtos");
      setProdutos(res.data);
    } catch (err) {
      console.error("Erro produtos:", err);
    }
  }

  async function carregarVendas() {
    try {
      const res = await api.get("/vendas", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setVendas(res.data);
    } catch (err) {
      console.error("Erro vendas:", err);
    }
  }

  async function carregarEstoque() {
    try {
      const res = await api.get("/estoque", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setEstoque(res.data);
    } catch (err) {
      console.error("Erro estoque:", err);
    }
  }

  // 🔥 CRIAR PRODUTO (PROFISSIONAL)
  async function criarProduto(e) {
    e.preventDefault();

    const formData = new FormData();

    formData.append("nome", nome);
    formData.append("preco", preco);
    formData.append("descricao", descricao);
    formData.append("categoria", categoria);
    formData.append("estoque", estoque); // 🔥 NOVO

    imagens.forEach((img) => {
        formData.append("imagens", img);
    });

    try {
        await api.post("/produtos", formData, {
        headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "multipart/form-data",
        },
        });

        setNome("");
        setPreco("");
        setDescricao("");
        setCategoria("");
        setEstoque(""); // 🔥 NOVO
        setImagens([]);

        carregarProdutos();
    } catch (err) {
        console.error("Erro criar produto:", err);
    }
    }

  async function deletar(id) {
    try {
      await api.delete(`/produtos/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      carregarProdutos();
      carregarEstoque();
    } catch (err) {
      console.error("Erro deletar:", err);
    }
  }

  return (
    <div className="admin-container">
      <h1>Painel Administrativo</h1>

      {/* FORM */}
      <div className="admin-criar-produto">
        <h2>Adicionar Produto</h2>

        <form onSubmit={criarProduto}>
          <input
            type="text"
            placeholder="Nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
          />
          <input
            type="number"
            placeholder="Quantidade em estoque"
            value={estoque}
            onChange={(e) => setEstoque(e.target.value)}
            required
            />

          {/* UPLOAD MÚLTIPLO */}
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleImagens}
            required
          />

          {/* PREVIEW */}
          <div className="preview">
            {imagens.map((img, i) => (
              <img
                key={i}
                src={URL.createObjectURL(img)}
                alt="preview"
                width="70"
              />
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
            type="text"
            placeholder="Descrição"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
          />

          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            required
          >
            <option value="">Selecione a categoria</option>

            {categorias.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.nome}
              </option>
            ))}
          </select>

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
              {estoque.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* PRODUTOS */}
      <div className="admin-produtos">
        <h2>Produtos</h2>

        <ul>
          {produtos.map((p) => (
            <li key={p.id}>
              {p.nome} - R$ {p.preco}
              <button onClick={() => deletar(p.id)}>Excluir</button>
            </li>
          ))}
        </ul>
      </div>

      <button onClick={logout}>🚪 Sair</button>
    </div>
  );
}