import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import api from "../services/api";

export default function VerificarCodigo() {
  const { token } = useParams(); // vindo do botão do email
  const location = useLocation(); // vindo do cadastro
  const email = location.state?.email;

  const navigate = useNavigate();

  const [codigo, setCodigo] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const [reenviarLoading, setReenviarLoading] = useState(false); // ✅ estado para botão reenviar

  // 🔥 CONFIRMAÇÃO AUTOMÁTICA PELO TOKEN (BOTÃO DO EMAIL)
  useEffect(() => {
    if (token) {
      confirmarAutomatico();
    }
  }, [token]);

  async function confirmarAutomatico() {
    setLoading(true);
    setErro("");

    try {
      const res = await api.post("/auth/verificar-codigo", { token });
      setMensagem(res.data.mensagem || "Conta confirmada!");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setErro("Link inválido ou expirado");
    } finally {
      setLoading(false);
    }
  }

  // 🔐 CONFIRMAÇÃO MANUAL (CÓDIGO)
  const confirmar = async (e) => {
    e.preventDefault();
    setMensagem("");
    setErro("");

    if (codigo.length !== 6) {
      setErro("Código deve ter 6 dígitos");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/verificar-codigo", { email, codigo });
      setMensagem(res.data.mensagem);
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setErro(err.response?.data?.error || "Erro ao confirmar");
    } finally {
      setLoading(false);
    }
  };

  // 🔄 REENVIAR CÓDIGO
  const reenviarCodigo = async () => {
    if (!email) {
      setErro("Email não disponível para reenviar");
      return;
    }

    setReenviarLoading(true);
    setErro("");
    setMensagem("");

    try {
      const res = await api.post("/auth/reenviar-codigo", { email });
      setMensagem(res.data.mensagem || "Código reenviado com sucesso!");
    } catch (err) {
      setErro(err.response?.data?.error || "Erro ao reenviar código");
    } finally {
      setReenviarLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md text-center">
        <h2 className="text-2xl font-bold mb-6">Confirmar Conta</h2>

        {token ? (
          <p className="text-gray-600">
            {loading ? "Confirmando automaticamente..." : mensagem || erro}
          </p>
        ) : (
          <>
            <p className="mb-4">Digite o código enviado no seu email.</p>

            <form onSubmit={confirmar} className="flex flex-col gap-4">
              <input
                type="text"
                placeholder="Código"
                value={codigo}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "");
                  setCodigo(value.slice(0, 6));
                }}
                className="border p-2 rounded text-center"
                required
              />

              <button
                type="submit"
                disabled={loading}
                className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-2 rounded"
              >
                {loading ? "Confirmando..." : "Confirmar"}
              </button>
            </form>

            {/* 🔄 Botão reenviar código */}
            <div className="mt-4">
              <p>Não recebeu o código?</p>
              <button
                onClick={reenviarCodigo}
                disabled={reenviarLoading}
                className="px-4 py-2 mt-2 bg-gray-200 text-black rounded hover:bg-gray-300 transition"
              >
                {reenviarLoading ? "Enviando..." : "Reenviar código"}
              </button>
            </div>
          </>
        )}

        {mensagem && <p className="mt-4 text-green-600 font-semibold">{mensagem}</p>}
        {erro && <p className="mt-4 text-red-600 font-semibold">{erro}</p>}
      </div>
    </div>
  );
}