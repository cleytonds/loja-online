// src/pages/Home.jsx

import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../services/api";

export default function Home() {

  const [produtos, setProdutos] = useState([]);

  useEffect(() => {
    async function carregarProdutos() {
      try {
        const res = await api.get("/produtos");
        setProdutos(res.data.slice(0, 4));
      } catch (err) {
        console.error("Erro ao carregar produtos:", err);
      }
    }

    carregarProdutos();
  }, []);

  function adicionarCarrinho(produto) {

    let carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];

    const existe = carrinho.find(p => p.id === produto.id);

    if (existe) {
      existe.quantidade += 1;
    } else {
      carrinho.push({
        ...produto,
        quantidade: 1
      });
    }

    localStorage.setItem("carrinho", JSON.stringify(carrinho));

    alert("Produto adicionado ao carrinho 🛒");
  }

  return (
    <div className="bg-gray-100 min-h-screen">

      {/* BANNER */}
      <section className="bg-black text-white text-center py-20 px-6">

        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Bem-vindo à DLmodas
        </h1>

        <p className="text-lg mb-6">
          Moda feminina com estilo e preço justo
        </p>

        <Link
          to="/produtos"
          className="bg-pink-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-pink-700 transition"
        >
          Ver Produtos
        </Link>

      </section>


      {/* PRODUTOS EM DESTAQUE */}
      <section className="max-w-7xl mx-auto py-14 px-6">

        <h2 className="text-3xl font-bold text-center mb-10">
          Produtos em Destaque
        </h2>

        {produtos.length === 0 && (
          <p className="text-center text-gray-500">
            Nenhum produto encontrado
          </p>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">

          {produtos.map(produto => (

            <div
              key={produto.id}
              className="bg-white rounded-xl shadow-md p-4 flex flex-col hover:shadow-lg transition"
            >

              <img
                src="https://via.placeholder.com/300x350"
                alt={produto.nome}
                className="rounded-lg mb-3 object-cover"
              />

              <h3 className="font-semibold text-lg mb-1">
                {produto.nome}
              </h3>

              <p className="text-pink-600 font-bold text-xl mb-3">
                R$ {produto.preco}
              </p>

              <div className="flex gap-2 mt-auto">

                <button
                  onClick={() => adicionarCarrinho(produto)}
                  className="bg-gray-800 text-white py-2 px-3 rounded-md hover:bg-black transition text-sm"
                >
                  Carrinho
                </button>

                <Link
                  to="/carrinho"
                  onClick={() => adicionarCarrinho(produto)}
                  className="bg-pink-600 text-white py-2 px-3 text-center rounded-md hover:bg-pink-700 transition text-sm"
                >
                  Comprar
                </Link>

              </div>

            </div>

          ))}

        </div>

      </section>


      {/* CHAMADA FINAL */}
      <section className="bg-pink-600 text-white text-center py-14 px-6">

        <h2 className="text-3xl font-bold mb-4">
          Novas coleções toda semana
        </h2>

        <p className="mb-6">
          Descubra roupas incríveis para qualquer ocasião
        </p>

        <Link
          to="/produtos"
          className="bg-white text-pink-600 px-8 py-3 rounded-lg font-bold hover:bg-gray-200 transition"
        >
          Explorar Loja
        </Link>

      </section>

    </div>
  );
}