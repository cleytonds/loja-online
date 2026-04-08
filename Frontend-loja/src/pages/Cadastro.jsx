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
  const [reenviarEmail, setReenviarEmail] = useState(false); // ✅ estado para botão reenviar
  const navigate = useNavigate();

  const validarEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const mostrarNotificacao = (msg, tipo = "success") => {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(msg, { body: tipo === "success" ? "✅ Sucesso" : "❌ Erro" });
    } else if ("Notification" in window && Notification.permission !== "denied") {
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
          new Notification(msg, { body: tipo === "success" ? "✅ Sucesso" : "❌ Erro" });
        } else {
          setToast({ show: true, msg, tipo });
          setTimeout(() => setToast({ show: false, msg: "", tipo }), 4000);
        }
      });
    } else {
      setToast({ show: true, msg, tipo });
      setTimeout(() => setToast({ show: false, msg: "", tipo }), 4000);
    }
  };

  // -------------------- CADASTRO --------------------
  async function handleCadastro(e) {
    e.preventDefault();

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
      mostrarNotificacao(res.data.mensagem || "Cadastro realizado! Verifique seu email.","success");

      // ✅ Mostra botão de reenviar email após cadastro
      setReenviarEmail(true);

      setTimeout(() => { navigate("/verificar", { state: { email } }); }, 2000);
    } catch (err) {
      const errorMsg = err.response?.data?.error;
      mostrarNotificacao(errorMsg || "Erro ao cadastrar ❌", "error");
    } finally {
      setLoading(false);
    }
  }

  // -------------------- REENVIAR EMAIL --------------------
  async function handleReenviarEmail() {
    if (!validarEmail(email)) {
      mostrarNotificacao("Email inválido para reenviar!", "error");
      return;
    }

    try {
      const res = await api.post("/auth/reenviar-codigo", { email });
      mostrarNotificacao(res.data.mensagem || "Email reenviado com sucesso!", "success");
    } catch (err) {
      const errorMsg = err.response?.data?.error || "Erro ao reenviar email";
      mostrarNotificacao(errorMsg, "error");
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

        {/* ✅ Botão de reenviar email */}
        {reenviarEmail && (
          <div className="mt-4 text-center">
            <p>Não recebeu o email?</p>
            <button
              onClick={handleReenviarEmail}
              className="px-4 py-2 mt-2 bg-yellow-400 text-black rounded-lg hover:bg-yellow-500 transition"
            >
              Reenviar email de confirmação
            </button>
          </div>
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