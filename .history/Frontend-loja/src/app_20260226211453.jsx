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
      {/* HEADER */}
      <header className="bg-black text-white shadow-md">
        <div className="max-w-6xl mx-auto flex justify-between items-center p-4">
          <h1 className="text-2xl font-bold">Minha Loja</h1>

          {/* MENU DESKTOP */}
          <nav className="hidden md:flex space-x-6">
            <Link to="/">Home</Link>
            <Link to="/produtos">Produtos</Link>
            <Link to="/carrinho">Carrinho</Link>

            {!token && (
              <>
                <Link to="/login">Login</Link>
                <Link to="/cadastro">Cadastro</Link>
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

          {/* BOTÃO MOBILE */}
          <button
            className="md:hidden text-2xl"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            ☰
          </button>
        </div>

        {/* MENU MOBILE */}
        {menuOpen && (
          <div className="md:hidden bg-black px-4 pb-4 space-y-3">
            <Link className="block" to="/" onClick={() => setMenuOpen(false)}>
              Home
            </Link>
            <Link className="block" to="/produtos" onClick={() => setMenuOpen(false)}>
              Produtos
            </Link>
            <Link className="block" to="/carrinho" onClick={() => setMenuOpen(false)}>
              Carrinho
            </Link>

            {!token && (
              <>
                <Link className="block" to="/login" onClick={() => setMenuOpen(false)}>
                  Login
                </Link>
                <Link className="block" to="/cadastro" onClick={() => setMenuOpen(false)}>
                  Cadastro
                </Link>
              </>
            )}

            {token && (
              <button
                className="block w-full text-left"
                onClick={() => {
                  localStorage.removeItem("token");
                  window.location.reload();
                }}
              >
                Sair
              </button>
            )}
          </div>
        )}
      </header>

      {/* ROTAS */}
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

      <footer className="bg-black text-white text-center p-4 mt-10">
        © {new Date().getFullYear()} Minha Loja
      </footer>
    </Router>
  );
}