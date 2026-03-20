import { useState } from "react";
import api from "../services/api";
import "./Busca.css";

export default function Busca() {
  const [busca, setBusca] = useState("");
  const [produtos, setProdutos] = useState([]);

  async function buscar() {
    if (!busca) return;

    try {
      const res = await api.get(`/produtos?nome=${busca}`);
      setProdutos(res.data);
    } catch (err) {
      console.error("Erro na busca:", err);
    }
  }

  return (
    <div className="busca-container">

      <h1 className="busca-titulo">Buscar Produtos</h1>

      <div className="busca-box">

        <input
          type="text"
          placeholder="Digite o nome do produto..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />

        <button onClick={buscar}>Buscar</button>

      </div>

      <div className="resultados">

        {produtos.length === 0 && (
          <p className="sem-resultados">
            Nenhum produto encontrado
          </p>
        )}

        {produtos.map((p) => (
          <div key={p.id} className="produto-card">

            <img src={p.imagem} alt={p.nome} />

            <h3>{p.nome}</h3>

            <p>R$ {Number(p.preco).toFixed(2)}</p>

          </div>
        ))}

      </div>

    </div>
  );
}