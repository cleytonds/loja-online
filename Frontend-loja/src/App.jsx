import { HashRouter as Router, Routes, Route } from "react-router-dom";

import Home from "./pages/Home.jsx";
import Produtos from "./pages/produtos.jsx";
import Login from "./pages/Login.jsx";
import Cadastro from "./pages/Cadastro.jsx";
import Carrinho from "./pages/Carrinho.jsx";
import Confirmacao from "./pages/Confirmacao.jsx";
import MeusPedidos from "./pages/MeusPedidos.jsx";
import EsqueciSenha from "./pages/EsqueciSenha.jsx";
import RedefinirSenha from "./pages/RedefinirSenha.jsx";
import Busca from "./pages/Busca.jsx";
import Perfil from "./pages/Perfil.jsx";
import Favoritos from "./pages/Favoritos.jsx";
import { FiShoppingCart } from "react-icons/fi";

import Header from "./components/Header";
import MiniCarrinho from "./components/MiniCarrinho";

import { CarrinhoProvider } from "./context/CarrinhoContext";

import "./App.css";

export default function App() {
  return (
    <Router>

      <CarrinhoProvider>

        <Header />

        <MiniCarrinho />

        <main className="main-content">
          <Routes>

            <Route path="/" element={<Home />} />
            <Route path="/produtos" element={<Produtos />} />
            <Route path="/carrinho" element={<Carrinho />} />

            <Route path="/login" element={<Login />} />
            <Route path="/cadastro" element={<Cadastro />} />

            <Route path="/confirmar/:token" element={<Confirmacao />} />
            <Route path="/meus-pedidos" element={<MeusPedidos />} />

            <Route path="/esqueci-senha" element={<EsqueciSenha />} />
            <Route path="/redefinir-senha/:token" element={<RedefinirSenha />} />

            <Route path="/busca" element={<Busca />} />
            <Route path="/perfil" element={<Perfil />} />
            <Route path="/favoritos" element={<Favoritos />} />

          </Routes>
        </main>

        <footer className="footer">
          © {new Date().getFullYear()} DLmodas
        </footer>

      </CarrinhoProvider>

    </Router>
  );
}