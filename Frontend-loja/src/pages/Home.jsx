// src/pages/Home.jsx
import "./home.css";
import { Link } from "react-router-dom";
import { useEffect, useState, useContext } from "react";
import api from "../services/api";
import { CarrinhoContext } from "../context/CarrinhoContext";

export default function Home() {
  const [produtos, setProdutos] = useState([]);
  const { adicionarAoCarrinho } = useContext(CarrinhoContext); // 🔹 useContext

  useEffect(() => {
    async function carregarProdutos() {
      try {
        const res = await api.get("/produtos");
        setProdutos(res.data.slice(0, 4));
      } catch (err) {
        console.error(err);
      }
    }

    carregarProdutos();
  }, []);

  return (
    <div>
      {/* BANNER */}
      <section className="banner">
        <h1>Bem-vindo à DLmodas</h1>
        <p>Moda feminina com estilo e preço justo</p>
        <Link to="/produtos">
          <button>Ver Produtos</button>
        </Link>
      </section>

      {/* PRODUTOS */}
      <section className="produtos">
        <h2>Produtos em Destaque</h2>
        <div className="grid-produtos">
          {produtos.map((produto) => (
            <div key={produto.id} className="card-produto">
              <img
                src={produto.imagem || "https://via.placeholder.com/300x350"}
                alt={produto.nome}
              />
              <h3>{produto.nome}</h3>
              <p className="preco">R$ {produto.preco}</p>
              <div className="botoes">
                <button
                  className="btn-carrinho"
                  onClick={() => adicionarAoCarrinho(produto)}
                >
                  Carrinho
                </button>

                <Link to="/carrinho">
                  <button
                    className="btn-comprar"
                    onClick={() => adicionarAoCarrinho(produto)}
                  >
                    Comprar
                  </button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="cta">
        <h2>Novas coleções toda semana</h2>
        <p>Descubra roupas incríveis para qualquer ocasião</p>
        <Link to="/produtos">
          <button>Explorar Loja</button>
        </Link>
      </section>
    </div>
  );
}