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
import Admin from "./pages/AdminRoute.jsx";
import ProtectedRoute from "./components/ProtectedRoute";

import Header from "./components/Header";
import MiniCarrinho from "./components/MiniCarrinho";

import { CarrinhoProvider } from "./context/CarrinhoContext";
import { AuthProvider } from "./context/AuthContext";

import "./App.css";

export default function App() {
  return (
    <Router>
      <AuthProvider>
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

              {/* 👤 USUÁRIO LOGADO */}
              <Route
                path="/perfil"
                element={
                  <ProtectedRoute>
                    <Perfil />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/favoritos"
                element={
                  <ProtectedRoute>
                    <Favoritos />
                  </ProtectedRoute>
                }
              />

              {/* 👑 SOMENTE ADMIN */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute tipoPermitido="admin">
                    <Admin />
                  </ProtectedRoute>
                }
              />

            </Routes>
          </main>

          <footer className="footer">
            © {new Date().getFullYear()} DLmodas
          </footer>
        </CarrinhoProvider>
      </AuthProvider>
    </Router>
  );
}