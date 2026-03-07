import { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Home from "./pages/Home.jsx";
import Produtos from "./pages/Produtos.jsx";
import Login from "./pages/Login.jsx";
import Cadastro from "./pages/Cadastro.jsx";
import Carrinho from "./pages/Carrinho.jsx";
import PrivateRoute from "./components/PrivateRoute.jsx";

import "./App.css";

export default function App() {
  const token = localStorage.getItem("token");
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <Router>
      {/* Header */}
      <header className="bg-black text-white shadow-md">
        <div className="max-w-6xl mx-auto flex justify-between items-center p-4 relative">
          <h1 className="text-2xl font-bold">DLmodas</h1>

          {/* Botão hamburguer (mobile) */}
          <button
            className="md:hidden text-2xl"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            ☰
          </button>

          {/* Menu */}
          <nav
            className={`
              absolute top-full right-4 bg-black p-4 rounded shadow-lg
              flex flex-col gap-4
              md:static md:flex md:flex-row md:gap-6 md:p-0 md:shadow-none
              ${menuOpen ? "block" : "hidden"} md:block
            `}
          >
            <Link
              className="hover:text-gray-300 transition"
              to="/"
              onClick={() => setMenuOpen(false)}
            >
              Home
            </Link>

            <Link
              className="hover:text-gray-300 transition"
              to="/produtos"
              onClick={() => setMenuOpen(false)}
            >
              Produtos
            </Link>

            <Link
              className="hover:text-gray-300 transition"
              to="/carrinho"
              onClick={() => setMenuOpen(false)}
            >
              Carrinho
            </Link>

            {!token && (
              <>
                <Link
                  className="hover:text-gray-300 transition"
                  to="/login"
                  onClick={() => setMenuOpen(false)}
                >
                  Login
                </Link>

                <Link
                  className="hover:text-gray-300 transition"
                  to="/cadastro"
                  onClick={() => setMenuOpen(false)}
                >
                  Cadastro
                </Link>
              </>
            )}

            {token && (
              <button
                className="hover:text-gray-300 text-left"
                onClick={() => {
                  localStorage.removeItem("token");
                  window.location.reload();
                }}
              >
                Sair
              </button>
            )}
          </nav>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="bg-gray-100 min-h-screen pt-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/produtos" element={<Produtos />} />
          <Route
            path="/carrinho"
            element={
              <PrivateRoute>
                <Carrinho />
              </PrivateRoute>
            }
          />
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Cadastro />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="bg-black text-white text-center p-4 mt-10">
        © {new Date().getFullYear()} Minha Loja. Todos os direitos reservados.
      </footer>
    </Router>
  );
}