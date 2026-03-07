import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api"; 
import "./login.css";

export default function Cadastro() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [erroEmail, setErroEmail] = useState(""); 
  const [mensagem, setMensagem] = useState(""); 
  const [tipoMensagem, setTipoMensagem] = useState("success"); // success ou error
  const [showToast, setShowToast] = useState(false);
  const navigate = useNavigate();

  const validarEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // Função para mostrar toast animado
  const exibirToast = (msg, tipo = "success") => {
    setMensagem(msg);
    setTipoMensagem(tipo);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 4000); // some após 4s
  };

  async function handleCadastro(e) {
    e.preventDefault();

    if (!validarEmail(email)) {
      setErroEmail("Email inválido! Por favor, use um email válido.");
      exibirToast("Email inválido! Por favor, use um email válido.", "error");
      return;
    } else {
      setErroEmail("");
    }

    setLoading(true);

    try {
      const res = await api.post("/auth/cadastro", { nome, email, senha });
      exibirToast(res.data.success || "Cadastro realizado! Verifique seu email.", "success");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      const errorMsg = err.response?.data?.error;
      exibirToast(errorMsg || "Erro ao cadastrar ❌", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6 relative">
      
      {/* Toast animado */}
      <div
        className={`fixed top-5 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg text-white font-semibold z-50
          transition-all duration-500 ease-in-out
          ${showToast ? "opacity-100 translate-y-0" : "-translate-y-10 opacity-0"}
          ${tipoMensagem === "success" ? "bg-green-500" : "bg-red-600"}
        `}
      >
        {mensagem}
      </div>

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