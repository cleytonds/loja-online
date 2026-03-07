import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

export default function VerificarCodigo() {
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [tipoMensagem, setTipoMensagem] = useState(""); // sucesso ou erro

  async function verificar(e) {
    e.preventDefault();
    try {
      const res = await api.post("/auth/verificar-codigo", { email, codigo });
      setMensagem(res.data.mensagem);
      setTipoMensagem("sucesso");

      // Redireciona para login depois de 2s
      setTimeout(() => window.location.href = "/login", 2000);
    } catch (err) {
      setMensagem(err.response?.data?.mensagem || "Erro ao verificar o código.");
      setTipoMensagem("erro");
    }
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold text-center text-yellow-500 mb-6">Verificar Código</h2>

        <form onSubmit={verificar} className="space-y-4">
          <div>
            <label className="block mb-1 font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>

          <div>
            <label className="block mb-1 font-medium text-gray-700">Código</label>
            <input
              type="text"
              value={codigo}
              onChange={e => setCodigo(e.target.value)}
              required
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-white font-bold py-2 px-4 rounded transition-colors"
          >
            Verificar
          </button>
        </form>

        {mensagem && (
          <p
            className={`mt-4 text-center font-medium ${
              tipoMensagem === "sucesso" ? "text-green-600" : "text-red-600"
            }`}
          >
            {mensagem}
          </p>
        )}

        <div className="mt-6 text-center">
          <Link to="/login" className="text-yellow-500 hover:underline">
            Voltar para login
          </Link>
        </div>
      </div>
    </div>
  );
}