// src/pages/RedefinirSenha.jsx
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api"; // seu Axios configurado
import "./login.css";

export default function RedefinirSenha() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [toast, setToast] = useState({ show: false, msg: "", tipo: "success" });

  const mostrarNotificacao = (msg, tipo = "success") => {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(msg, {
        body: tipo === "success" ? "✅ Sucesso" : "❌ Erro",
      });
    } else {
      setToast({ show: true, msg, tipo });
      setTimeout(() => setToast({ show: false, msg: "", tipo }), 4000);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMensagem("");

    try {
      const res = await api.post(`/auth/redefinir-senha/${token}`, { novaSenha: senha });
      setMensagem(res.data.mensagem || "Senha redefinida com sucesso!");
      mostrarNotificacao(res.data.mensagem || "Senha redefinida com sucesso!", "success");

      // redireciona para login após 2 segundos
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      const errorMsg = err.response?.data?.erro || "Token inválido ou expirado ❌";
      setMensagem(errorMsg);
      mostrarNotificacao(errorMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6 relative">
      <div className="bg-white p-10 rounded-2xl shadow-xl w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">
          Nova senha
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            placeholder="Digite a nova senha"
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
            {loading ? "Redefinindo..." : "Redefinir senha"}
          </button>
        </form>

        {mensagem && (
          <p className="mt-4 text-center text-gray-600">{mensagem}</p>
        )}
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