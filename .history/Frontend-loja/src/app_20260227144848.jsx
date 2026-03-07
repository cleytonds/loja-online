import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";

import Home from "./pages/Home.jsx";
import Produtos from "./pages/Produtos.jsx";
import Login from "./pages/Login.jsx";
import Cadastro from "./pages/Cadastro.jsx";
import Carrinho from "./pages/Carrinho.jsx";
import PrivateRoute from "./components/PrivateRoute.jsx";
import Confirmacao from "./pages/Confirmacao.jsx";

import "./App.css"; // CSS global do app

export default function App() {
  const token = localStorage.getItem("token");

  return (
  
    <Router>
      {/* Cabeçalho */}
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
            className="bg-black text-white px-3 py-1 rounded"
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

          {/* Rota de confirmação de email */}
          <Route path="/confirmar/:token" element={<Confirmacao />} />
        </Routes>
      </main>

      {/* Rodapé */}
      <footer className="bg-black text-white text-center p-4 mt-10">
        © {new Date().getFullYear()} Minha Loja. Todos os direitos reservados.
      </footer>
    </Router>
  );
}