import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api"; // seu serviço Axios já configurado
import "./login.css"; // pode usar o mesmo estilo do login/cadastro

export default function EsqueciSenha() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [toast, setToast] = useState({ show: false, msg: "", tipo: "success" });
  const navigate = useNavigate();

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
      const res = await api.post("/auth/solicitar-recuperacao", { email });
      setMensagem(res.data.mensagem || "Email de redefinição enviado!");
      mostrarNotificacao(res.data.mensagem || "Email de redefinição enviado!", "success");

      // opcional: redireciona para login após alguns segundos
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      const errorMsg = err.response?.data?.erro || "Erro ao enviar email ❌";
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
          Redefinir senha
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Digite seu email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-black text-white font-semibold hover:bg-gray-800 transition disabled:opacity-50"
          >
            {loading ? "Enviando..." : "Enviar email"}
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