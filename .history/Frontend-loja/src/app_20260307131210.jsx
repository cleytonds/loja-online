// src/App.jsx
import { HashRouter as Router, Routes, Route, Link } from "react-router-dom";

import Home from "./pages/Home.jsx";
import Produtos from "./pages/Produtos.jsx";
import Login from "./pages/Login.jsx";
import Cadastro from "./pages/Cadastro.jsx";
import Carrinho from "./pages/Carrinho.jsx";
import VerificarCodigo from "./pages/VerificarCodigo.jsx";
import MeusPedidos from "./pages/MeusPedidos";

import "./App.css";

export default function App() {

  const token = localStorage.getItem("token");

  return (
    <Router>

      {/* HEADER */}
      <header className="bg-yellow-400 shadow-md">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:justify-between md:items-center p-4 gap-4">

          <h1 className="text-2xl font-bold text-black text-center md:text-left">
            DLmodas
          </h1>

          <nav className="flex flex-wrap justify-center md:justify-end gap-4 text-black font-medium">

            <Link to="/">Home</Link>
            <Link to="/produtos">Produtos</Link>
            <Link to="/carrinho">Carrinho</Link>

            {!token && (
              <>
                <Link to="/login">Conecte-se</Link>
              </>
            )}

            {token && (
              <button
                onClick={() => {
                  localStorage.removeItem("token");
                  window.location.reload();
                }}
                className="bg-black text-white px-3 py-1 rounded"
              >
                Sair
              </button>
            )}

          </nav>

        </div>
      </header>


      {/* CONTEÚDO */}
      <main className="bg-gray-100 min-h-screen pt-6">

        <Routes>

          <Route path="/" element={<Home />} />
          <Route path="/produtos" element={<Produtos />} />
          <Route path="/carrinho" element={<Carrinho />} />
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Cadastro />} />
          <Route path="/confirmar/:token" element={<VerificarCodigo />} />

        </Routes>

      </main>


      {/* FOOTER */}
      <footer className="bg-black text-white text-center p-4 mt-10">
        © {new Date().getFullYear()} DLmodas. Todos os direitos reservados.
      </footer>

    </Router>
  );
}