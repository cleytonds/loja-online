import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

export default function VerificarCodigo() {
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [mensagem, setMensagem] = useState("");

  async function verificar(e) {
    e.preventDefault();
    try {
      const res = await api.post("/auth/verificar-codigo", { email, codigo });
      setMensagem(res.data.mensagem);
      setTimeout(() => window.location.href = "/login", 2000);
    } catch (err) {
      setMensagem(err.response?.data?.mensagem || "Erro ao verificar o código.");
    }
  }

  return (
    <div style={{
      maxWidth: "400px",
      margin: "100px auto", // deixa centralizado na tela
      padding: "30px",
      background: "#fff",
      borderRadius: "10px",
      boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
      textAlign: "center"
    }}>
      <h2 style={{ marginBottom: "20px", color: "#f59e0b" }}>Verificar Código</h2>

      <form onSubmit={verificar}>
        <div style={{ marginBottom: "15px", textAlign: "left" }}>
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{ width: "100%", padding: "10px", marginTop: "5px", borderRadius: "5px", border: "1px solid #ccc" }}
          />
        </div>

        <div style={{ marginBottom: "20px", textAlign: "left" }}>
          <label>Código:</label>
          <input
            type="text"
            value={codigo}
            onChange={e => setCodigo(e.target.value)}
            required
            style={{ width: "100%", padding: "10px", marginTop: "5px", borderRadius: "5px", border: "1px solid #ccc" }}
          />
        </div>

        <button type="submit" style={{
          width: "100%",
          padding: "12px",
          background: "#f59e0b",
          color: "#fff",
          fontWeight: "bold",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer"
        }}>
          VERIFICAR
        </button>
      </form>

      {mensagem && <p style={{ marginTop: "20px", color: "#10b981" }}>{mensagem}</p>}

      <div style={{ marginTop: "20px" }}>
        <Link to="/login" style={{ color: "#f59e0b", textDecoration: "underline" }}>
          Voltar para login
        </Link>
      </div>
    </div>
  );
}