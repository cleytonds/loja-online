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
import Admin from "./pages/Admin.jsx";

import PrivateRoute from "./routes/PrivateRoute";
import AdminRoute from "./routes/AdminRoute";

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

              {/* PÁGINAS PÚBLICAS */}
              <Route path="/" element={<Home />} />
              <Route path="/produtos" element={<Produtos />} />
              <Route path="/login" element={<Login />} />
              <Route path="/cadastro" element={<Cadastro />} />
              <Route path="/carrinho" element={<Carrinho />} />
              <Route path="/confirmar/:token" element={<Confirmacao />} />
              <Route path="/meus-pedidos" element={<MeusPedidos />} />
              <Route path="/esqueci-senha" element={<EsqueciSenha />} />
              <Route path="/redefinir-senha/:token" element={<RedefinirSenha />} />
              <Route path="/busca" element={<Busca />} />

              {/* USUÁRIO LOGADO */}
              <Route
                path="/perfil"
                element={
                  <PrivateRoute>
                    <Perfil />
                  </PrivateRoute>
                }
              />

              <Route
                path="/favoritos"
                element={
                  <PrivateRoute>
                    <Favoritos />
                  </PrivateRoute>
                }
              />

              {/* ADMIN (CORRETO E LIMPO) */}
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <Admin />
                  </AdminRoute>
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