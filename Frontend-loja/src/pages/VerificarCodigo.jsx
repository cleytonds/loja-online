import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";

export default function VerificarCodigo() {
  const { token } = useParams(); // token vindo do link do email (opcional)
  const navigate = useNavigate();

  const [codigo, setCodigo] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  const confirmar = async (e) => {
    e.preventDefault();
    setMensagem("");
    setErro("");
    setLoading(true);

    try {
      // se houver token no link, envia junto com o código
      const body = token ? { token, codigo } : { codigo };
      const res = await api.post("/auth/verificar-codigo", body);

      setMensagem(res.data.mensagem);

      // salva o JWT retornado para login automático
      if (res.data.token) localStorage.setItem("token", res.data.token);

      // redireciona para home/login após 2 segundos
      setTimeout(() => navigate("/"), 2000);
    } catch (err) {
      setErro(err.response?.data?.error || "Erro ao confirmar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md text-center">
        <h2 className="text-2xl font-bold mb-6">Confirmar Conta</h2>
        <p className="mb-4">
          Digite o código enviado no seu email para ativar sua conta.
        </p>

        <form onSubmit={confirmar} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Código"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
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

        {mensagem && <p className="mt-4 text-green-600 font-semibold">{mensagem}</p>}
        {erro && <p className="mt-4 text-red-600 font-semibold">{erro}</p>}
      </div>
    </div>
  );
}