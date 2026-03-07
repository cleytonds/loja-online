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

          <nav
  className={`
    ${menuOpen ? "block" : "hidden"}
    absolute top-16 left-0 w-full bg-black p-4
    md:static md:block md:w-auto md:p-0
  `}
>
  <ul className="flex flex-col gap-4 md:flex-row md:gap-6">
    <li>
      <Link to="/" onClick={() => setMenuOpen(false)}>
        Home
      </Link>
    </li>

    <li>
      <Link to="/produtos" onClick={() => setMenuOpen(false)}>
        Produtos
      </Link>
    </li>

    <li>
      <Link to="/carrinho" onClick={() => setMenuOpen(false)}>
        Carrinho
      </Link>
    </li>

    {!token && (
      <>
        <li>
          <Link to="/login" onClick={() => setMenuOpen(false)}>
            Login
          </Link>
        </li>
        <li>
          <Link to="/cadastro" onClick={() => setMenuOpen(false)}>
            Cadastro
          </Link>
        </li>
      </>
    )}

    {token && (
      <li>
        <button
          onClick={() => {
            localStorage.removeItem("token");
            window.location.reload();
          }}
        >
          Sair
        </button>
      </li>
    )}
  </ul>
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