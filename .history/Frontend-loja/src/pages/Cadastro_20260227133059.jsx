import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api"; // mantém seu import
import "./login.css"; // opcional, usa o mesmo CSS do Login

export default function Cadastro() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleCadastro(e) {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post("/auth/cadastro", { nome, email, senha });
      alert("Cadastro realizado com sucesso ✅");
      navigate("/login"); // redireciona para Login
    } catch (err) {
      alert(err.response?.data?.error || "Erro ao cadastrar ❌");
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
            className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black"
            required
          />

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black"
            required
          />

          <input
            type="password"
            placeholder="Senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black"
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-black text-white font-semibold hover:bg-gray-800 transition disabled:opacity-50"
          >
            {loading ? "Cadastrando..." : "Cadastrar"}
          </button>
        </form>

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