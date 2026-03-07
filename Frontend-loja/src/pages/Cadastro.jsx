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
  const [toast, setToast] = useState({ show: false, msg: "", tipo: "success" });
  const navigate = useNavigate();

  const validarEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // Função para mostrar notificação ou toast
  const mostrarNotificacao = (msg, tipo = "success") => {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(msg, {
        body: tipo === "success" ? "✅ Sucesso" : "❌ Erro",
      });
    } else if ("Notification" in window && Notification.permission !== "denied") {
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
          new Notification(msg, {
            body: tipo === "success" ? "✅ Sucesso" : "❌ Erro",
          });
        } else {
          // Toast interno para fallback
          setToast({ show: true, msg, tipo });
          setTimeout(() => setToast({ show: false, msg: "", tipo }), 4000);
        }
      });
    } else {
      // Toast interno fallback
      setToast({ show: true, msg, tipo });
      setTimeout(() => setToast({ show: false, msg: "", tipo }), 4000);
    }
  };

  async function handleCadastro(e) {
    e.preventDefault();

    // Validação frontend do email
    if (!validarEmail(email)) {
      setErroEmail("Email inválido!");
      mostrarNotificacao("Email inválido! Por favor, use um email válido.", "error");
      return; // não envia ao backend
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

      {/* Toast interno animado */}
      {toast.show && (
        <div
          className={`fixed top-6 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg z-50 flex items-center space-x-2
          ${toast.tipo === "success" ? "bg-green-500" : "bg-red-500"} text-white font-semibold animate-fadeInOut`}
        >
          <span className="text-lg">{toast.tipo === "success" ? "✅" : "❌"}</span>
          <span>{toast.msg}</span>
        </div>
      )}

      {/* CSS para animação */}
      <style>{`
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateY(-20px); }
          10% { opacity: 1; transform: translateY(0); }
          90% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-20px); }
        }
        .animate-fadeInOut {
          animation: fadeInOut 4s ease forwards;
        }
      `}</style>
    </div>
  );
}