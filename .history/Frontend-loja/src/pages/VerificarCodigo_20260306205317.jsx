import { useState } from "react";
import api from "../services/api";

export default function VerificarCodigo() {
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");

  async function verificar(e) {
    e.preventDefault();

    try {
      // Chama o backend para verificar o código
      const res = await api.post("/auth/verificar-codigo", { email, codigo });

      // Mostra a mensagem e redireciona para login
      alert(res.data.mensagem);
      window.location.href = "/login";
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.mensagem || "Erro ao verificar o código.");
    }
  }

  return (
    <div style={{ maxWidth: "400px", margin: "50px auto", padding: "20px", background: "#fff", borderRadius: "8px" }}>
      <h2 style={{ textAlign: "center", marginBottom: "20px" }}>Verificar Código</h2>
      <form onSubmit={verificar}>
        <div style={{ marginBottom: "15px" }}>
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{ width: "100%", padding: "8px", marginTop: "5px" }}
          />
        </div>
        <div style={{ marginBottom: "15px" }}>
          <label>Código:</label>
          <input
            type="text"
            value={codigo}
            onChange={e => setCodigo(e.target.value)}
            required
            style={{ width: "100%", padding: "8px", marginTop: "5px" }}
          />
        </div>
        <button type="submit" style={{ width: "100%", padding: "10px", background: "#facc15", border: "none", borderRadius: "5px", fontWeight: "bold" }}>
          Verificar
        </button>
      </form>
    </div>
  );
}