import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Home from "./pages/Home.jsx";
import Produtos from "./pages/Produtos.jsx";
import Login from "./pages/Login.jsx";
import Cadastro from "./pages/Cadastro.jsx";
import Carrinho from "./pages/Carrinho.jsx";
import PrivateRoute from "./components/PrivateRoute.jsx";
import "./App.css"; // já global para todo o app

import "./App.css"; // caso queira adicionar seu CSS global

export default function App() {
  const token = localStorage.getItem("token");

  return (
    <Router>
      {/* Cabeçalho moderno */}
      <header className="bg-black text-white shadow-md">
        <div className="max-w-6xl mx-auto flex justify-between items-center p-4">
          <h1 className="text-2xl font-bold">Minha Loja</h1>

          <nav className="relative">
            {/* Botão hamburguer (mobile) */}
            <button
              className="md:hidden text-2xl text-white"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              ☰
            </button>

            {/* Menu */}
            <div
              className={`
              ${menuOpen ? "block" : "hidden"}
              absolute right-0 top-10 bg-black text-white p-4 rounded shadow-lg
              md:static md:block md:bg-transparent md:p-0 md:shadow-none
              `}
            >
              <div className="flex flex-col gap-4 md:flex-row md:space-x-6">
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
    </div>
  </div>
</nav>
        </div>
      </header>

      {/* Rotas da aplicação */}
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

          {/* Rota de login e cadastro podem ser criadas conforme seu frontend */}
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Cadastro />} />
        </Routes>
      </main>

      <footer className="bg-black text-white text-center p-4 mt-10">
        © {new Date().getFullYear()} Minha Loja. Todos os direitos reservados.
      </footer>
    </Router>
  );
}