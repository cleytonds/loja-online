import { useEffect, useState } from "react";
import { listarProdutos } from "../services/api";

export default function Produtos() {
  const [produtos, setProdutos] = useState([]);

  useEffect(() => {
    listarProdutos().then(data => setProdutos(data));
  }, []);

  return (
    <div>
      <h1>Produtos</h1>

      {produtos.map(prod => (
        <div key={prod.id}>
          <strong>{prod.nome}</strong><br />
          R$ {prod.preco}<br />
          Estoque: {prod.estoque}
          <hr />
        </div>
      ))}
    </div>
  );
}