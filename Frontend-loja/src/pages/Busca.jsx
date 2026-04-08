import { useEffect, useState } from "react";
import api from "../services/api";
import "./Busca.css";

export default function Busca() {
  const [busca, setBusca] = useState("");
  const [produtos, setProdutos] = useState([]);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (!busca) {
      setProdutos([]);
      return;
    }

    const buscarProdutos = async () => {
      try {
        setCarregando(true);

        const res = await api.get("/produtos", {
          params: {
            nome: busca // 🔹 envia o termo para backend
            // categoria: 0 // se quiser filtrar por categoria futuramente
          }
        });

        setProdutos(res.data);
        setCarregando(false);
      } catch (err) {
        console.error("Erro ao buscar produtos:", err);
        setCarregando(false);
      }
    };

    // debounce 300ms
    const timeout = setTimeout(() => {
      buscarProdutos();
    }, 300);

    return () => clearTimeout(timeout);
  }, [busca]);

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
      </div>

      <div className="resultados">
        {carregando && <p>Carregando...</p>}

        {!carregando && produtos.length === 0 && busca && (
          <p className="sem-resultados">Nenhum produto encontrado</p>
        )}

        {!carregando &&
          produtos.map((p) => (
            <div key={p.id} className="produto-card">
              <img
                src={p.imagem || "https://picsum.photos/300/350"}
                alt={p.nome}
              />
              <h3>{p.nome}</h3>
              <p>R$ {Number(p.preco).toFixed(2)}</p>
              <p className="categoria">{p.categoria_nome}</p>
            </div>
          ))}
      </div>
    </div>
  );
}