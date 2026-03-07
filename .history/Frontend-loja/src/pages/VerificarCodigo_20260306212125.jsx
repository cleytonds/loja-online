// src/pages/VerificarCodigo.jsx
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api"; // seu axios já configurado

export default function VerificarCodigo() {
  const { token } = useParams(); // pega token da URL
  const navigate = useNavigate();

  const [codigo, setCodigo] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");

  const confirmar = async (e) => {
    e.preventDefault();
    setMensagem("");
    setErro("");

    try {
      const res = await api.post("/auth/verificar-codigo", { token, codigo });
      setMensagem(res.data.mensagem);

      // redireciona para login após 2s
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err) {
      setErro(err.response?.data?.error || "Erro ao confirmar");
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">Confirmar Conta</h2>

        <p className="mb-4 text-center">
          Digite o código enviado no seu email para ativar sua conta.
        </p>

        <form onSubmit={confirmar} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Código"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            className="border p-2 rounded"
            required
          />

          <button
            type="submit"
            className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-2 rounded"
          >
            Confirmar
          </button>
        </form>

        {mensagem && <p className="mt-4 text-green-600 text-center">{mensagem}</p>}
        {erro && <p className="mt-4 text-red-600 text-center">{erro}</p>}
      </div>
    </div>
  );
}