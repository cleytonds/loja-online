import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { useState } from "react";
import Home from "./pages/Home.jsx";
import Produtos from "./pages/Produtos.jsx";
import Login from "./pages/Login.jsx";
import Cadastro from "./pages/Cadastro.jsx";
import Carrinho from "./pages/Carrinho.jsx";
import PrivateRoute from "./components/PrivateRoute.jsx";
import "./App.css"; // CSS global

export default function App() {
  const token = localStorage.getItem("token");
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <Router>
      {/* HEADER */}
      <header className="bg-black text-white shadow-md">
        <div className="max-w-6xl mx-auto flex justify-between items-center p-4">
          <h1 className="text-2xl font-bold">Minha Loja</h1>

          {/* Botão mobile */}
          <button
            className="md:hidden text-2xl"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            ☰
          </button>

          {/* Menu */}
          <nav
            className={`${
              menuOpen ? "flex" : "hidden"
            } flex-col gap-4 absolute top-16 left-0 w-full bg-black p-4 md:static md:flex md:flex-row md:gap-6 md:w-auto`}
          >
            <Link onClick={() => setMenuOpen(false)} to="/">
              Home
            </Link>
            <Link onClick={() => setMenuOpen(false)} to="/produtos">
              Produtos
            </Link>
            <Link onClick={() => setMenuOpen(false)} to="/carrinho">
              Carrinho
            </Link>

            {!token && (
              <>
                <Link onClick={() => setMenuOpen(false)} to="/login">
                  Login
                </Link>
                <Link onClick={() => setMenuOpen(false)} to="/cadastro">
                  Cadastro
                </Link>
              </>
            )}

            {token && (
              <button
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

      {/* CONTEÚDO */}
      <main className="bg-gray-100 min-h-screen pt-6 px-4">
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

      {/* FOOTER */}
      <footer className="bg-black text-white text-center p-4 mt-10">
        © {new Date().getFullYear()} Minha Loja. Todos os direitos reservados.
      </footer>
    </Router>
  );
}