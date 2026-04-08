// src/pages/Login.jsx
import { useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import { AuthContext } from "../context/AuthContext";
import "./login.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, msg: "", tipo: "success" });

  const navigate = useNavigate();
  const { login } = useContext(AuthContext); // 🔥 agora usa login()

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

      console.log("RESPOSTA LOGIN:", response.data);

      const token = response.data.token;
      const usuario = response.data.usuario;

      if (!usuario) {
        throw new Error("Usuário não veio do backend");
      }

      const tipo = usuario.tipo;

      // 🔥 LOGIN CENTRALIZADO (AuthContext faz tudo)
      login(usuario, token);

      mostrarNotificacao("Login realizado com sucesso ✅", "success");

      // 🔀 redirecionamento
      if (tipo === "admin") {
        navigate("/admin");
      } else {
        navigate("/perfil");
      }

    } catch (err) {
      const mensagemErro =
        err.response?.data?.error || err.message || "Erro no login";

      console.log("ERRO COMPLETO:", err);
      console.log("RESPOSTA BACKEND:", err.response?.data);

      if (mensagemErro === "Conta não confirmada") {
        mostrarNotificacao(
          "Conta não ativada! Verifique seu email ou reenvie o código.",
          "error"
        );
        navigate("/verificar", { state: { email } });
      } else {
        mostrarNotificacao(mensagemErro, "error");
      }

    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6 relative">
      <div className="bg-white p-10 rounded-2xl shadow-xl w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">
          Login
        </h1>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 rounded-lg border border-gray-300"
            required
          />

          <input
            type="password"
            placeholder="Senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="w-full p-3 rounded-lg border border-gray-300"
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-black text-white"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="mt-4 text-center">
          Não tem conta? <Link to="/cadastro">Cadastre-se</Link>
        </p>
      </div>

      {toast.show && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 bg-black text-white px-6 py-3 rounded">
          {toast.msg}
        </div>
      )}
    </div>
  );
}