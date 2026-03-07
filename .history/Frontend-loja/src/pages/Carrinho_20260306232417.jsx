import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Carrinho() {

  const [carrinho, setCarrinho] = useState([]);
  const navigate = useNavigate();

  // carregar carrinho
  useEffect(() => {
    const dados = JSON.parse(localStorage.getItem("carrinho")) || [];
    setCarrinho(dados);
  }, []);

  // salvar carrinho
  function salvarCarrinho(novoCarrinho) {
    setCarrinho(novoCarrinho);
    localStorage.setItem("carrinho", JSON.stringify(novoCarrinho));
  }

  // aumentar quantidade
  function aumentar(id) {
    const novo = carrinho.map(p => {
      if (p.id === id) p.quantidade += 1;
      return p;
    });

    salvarCarrinho(novo);
  }

  // diminuir quantidade
  function diminuir(id) {
    const novo = carrinho.map(p => {
      if (p.id === id && p.quantidade > 1) {
        p.quantidade -= 1;
      }
      return p;
    });

    salvarCarrinho(novo);
  }

  // remover produto
  function remover(id) {
    const novo = carrinho.filter(p => p.id !== id);
    salvarCarrinho(novo);
  }

  // calcular total
  const total = carrinho.reduce((acc, item) => {
    return acc + item.preco * item.quantidade;
  }, 0);

  // finalizar compra
  function finalizarCompra() {

    const token = localStorage.getItem("token");

    if (!token) {
      alert("Faça login para finalizar a compra 🔐");
      navigate("/login");
      return;
    }

    alert("Compra finalizada com sucesso 🛍️");

    localStorage.removeItem("carrinho");
    setCarrinho([]);
  }

  // carrinho vazio
  if (carrinho.length === 0) {
    return (
      <div className="p-10 text-center">
        <h2 className="text-2xl font-bold mb-4">Seu carrinho está vazio 🛒</h2>
        <button
          onClick={() => navigate("/produtos")}
          className="bg-pink-600 text-white px-6 py-2 rounded"
        >
          Ver produtos
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6">

      <h1 className="text-3xl font-bold mb-6 text-center">
        Carrinho de Compras
      </h1>

      <div className="space-y-4">

        {carrinho.map((item) => (

          <div
            key={item.id}
            className="bg-white p-4 rounded shadow flex flex-col md:flex-row md:justify-between md:items-center"
          >

            <div>
              <h2 className="font-semibold">{item.nome}</h2>
              <p className="text-pink-600 font-bold">
                R$ {item.preco}
              </p>
            </div>

            <div className="flex items-center gap-3 mt-3 md:mt-0">

              <button
                onClick={() => diminuir(item.id)}
                className="bg-gray-200 px-3 py-1 rounded"
              >
                -
              </button>

              <span>{item.quantidade}</span>

              <button
                onClick={() => aumentar(item.id)}
                className="bg-gray-200 px-3 py-1 rounded"
              >
                +
              </button>

            </div>

            <div className="flex items-center gap-4 mt-3 md:mt-0">

              <p className="font-bold">
                R$ {(item.preco * item.quantidade).toFixed(2)}
              </p>

              <button
                onClick={() => remover(item.id)}
                className="text-red-500"
              >
                Remover
              </button>

            </div>

          </div>

        ))}

      </div>

      <div className="mt-8 bg-white p-6 rounded shadow">

        <div className="flex justify-between text-xl font-bold">
          <span>Total</span>
          <span>R$ {total.toFixed(2)}</span>
        </div>

        <button
          onClick={finalizarCompra}
          className="mt-4 w-full bg-green-600 text-white py-3 rounded hover:bg-green-700"
        >
          Finalizar Compra
        </button>

      </div>

    </div>
  );
}