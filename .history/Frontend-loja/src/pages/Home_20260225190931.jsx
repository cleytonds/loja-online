// src/pages/Home.jsx
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-10">
      <h1 className="text-4xl font-bold mb-6">Bem-vindo à Loja Online</h1>
      <p className="text-lg mb-6">Explore nossos produtos e faça suas compras facilmente!</p>

      <div className="flex gap-4">
        <Link
          to="/produtos"
          className="bg-black text-white py-2 px-6 rounded-lg hover:bg-gray-800 transition"
        >
          Ver Produtos
        </Link>

        <Link
          to="/carrinho"
          className="bg-gray-800 text-white py-2 px-6 rounded-lg hover:bg-gray-700 transition"
        >
          Meu Carrinho
        </Link>
      </div>
    </div>
  );
}