// src/pages/Login.jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import "./login.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, msg: "", tipo: "success" });

  const navigate = useNavigate();

  // Função para mostrar toast
  const mostrarNotificacao = (msg, tipo = "success") => {
    setToast({ show: true, msg, tipo });
    setTimeout(() => setToast({ show: false, msg: "", tipo }), 4000);
  };

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.post("/auth/login", {
        email: email.trim(),
        senha: senha.trim(),
      });

      localStorage.setItem("token", response.data.token);
      mostrarNotificacao("Login realizado com sucesso ✅", "success");

      navigate("/");
      window.location.reload(); // força reconhecimento do token
    } catch (err) {
      mostrarNotificacao(err.response?.data?.error || "Email ou senha inválidos ❌", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6 relative">
      <div className="bg-white p-10 rounded-2xl shadow-xl w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">Login</h1>

        <form onSubmit={handleLogin} className="space-y-4">
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
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        {/* Link para redefinição de senha */}
        <p className="mt-2 text-center text-gray-600">
          Esqueceu a senha?{" "}
          <Link
            to="/esqueci-senha"
            className="text-black font-semibold hover:underline"
          >
            Redefinir senha
          </Link>
        </p>

        <p className="mt-4 text-center text-gray-600">
          Não tem conta?{" "}
          <Link to="/cadastro" className="text-black font-semibold hover:underline">
            Cadastre-se
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

      {/* CSS para animação do toast */}
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