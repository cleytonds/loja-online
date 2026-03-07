import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api"; 
import "./login.css";

export default function Cadastro() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [erroEmail, setErroEmail] = useState(""); // estado só para erro de email
  const [mensagem, setMensagem] = useState(""); // estado para sucesso/erro geral
  const navigate = useNavigate();

  async function handleCadastro(e) {
    e.preventDefault();
    setLoading(true);
    setErroEmail(""); // limpa erro antigo

    // Validação instantânea de email
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regex.test(email)) {
      setErroEmail("Por favor, insira um email válido!");
      setLoading(false);
      return; // não envia para o backend
    }

    try {
      const res = await api.post("/auth/cadastro", { nome, email, senha });
      
      setMensagem(res.data.success || "Cadastro realizado! Verifique seu email...");
      setTimeout(() => setMensagem(""), 5000); // some após 5s

      setTimeout(() => navigate("/login"), 2000); // redireciona para login
    } catch (err) {
      const errorMsg = err.response?.data?.error;
      setMensagem(errorMsg || "Erro ao cadastrar ❌");
      setTimeout(() => setMensagem(""), 5000);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
      <div className="bg-white p-10 rounded-2xl shadow-xl w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">Cadastro</h1>

        <form onSubmit={handleCadastro} className="space-y-4">
          <input
            type="text"
            placeholder="Nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
            className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black"
          />

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={`w-full p-3 rounded-lg border ${
              erroEmail ? "border-red-500" : "border-gray-300"
            } focus:outline-none focus:ring-2 focus:ring-black`}
          />
          {/* Mensagem de erro do email */}
          {erroEmail && <p className="text-red-600 text-sm">{erroEmail}</p>}

          <input
            type="password"
            placeholder="Senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
            className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-black text-white font-semibold hover:bg-gray-800 transition disabled:opacity-50"
          >
            {loading ? "Cadastrando..." : "Cadastrar"}
          </button>
        </form>

        {/* Mensagem geral */}
        {mensagem && <p className="mt-4 text-center text-red-600 font-semibold">{mensagem}</p>}

        <p className="mt-4 text-center text-gray-600">
          Já tem conta?{" "}
          <Link to="/login" className="text-black font-semibold hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}