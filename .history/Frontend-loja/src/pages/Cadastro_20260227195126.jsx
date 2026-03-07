import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api"; 
import "./login.css";

export default function Cadastro() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [erroEmail, setErroEmail] = useState(""); 
  const navigate = useNavigate();

  const validarEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // Função para mostrar notificação profissional
  const mostrarNotificacao = (msg, tipo = "success") => {
    // Tenta solicitar permissão caso ainda não tenha
    if (!("Notification" in window)) {
      alert(msg); // fallback simples
      return;
    }

    if (Notification.permission === "granted") {
      new Notification(msg, {
        body: tipo === "success" ? "✅ Sucesso" : "❌ Erro",
        icon: tipo === "success" ? "/icons/success.png" : "/icons/error.png"
      });
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
          new Notification(msg, {
            body: tipo === "success" ? "✅ Sucesso" : "❌ Erro",
            icon: tipo === "success" ? "/icons/success.png" : "/icons/error.png"
          });
        } else {
          alert(msg); // fallback se o usuário negar
        }
      });
    } else {
      alert(msg); // fallback se negou anteriormente
    }
  };

  async function handleCadastro(e) {
    e.preventDefault();

    // Validação de email antes de enviar ao backend
    if (!validarEmail(email)) {
      setErroEmail("Email inválido!");
      mostrarNotificacao("Email inválido! Por favor, use um email válido.", "error");
      return;
    } else {
      setErroEmail("");
    }

    setLoading(true);

    try {
      const res = await api.post("/auth/cadastro", { nome, email, senha });
      mostrarNotificacao(res.data.success || "Cadastro realizado! Verifique seu email.", "success");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      const errorMsg = err.response?.data?.error;
      mostrarNotificacao(errorMsg || "Erro ao cadastrar ❌", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6 relative">
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