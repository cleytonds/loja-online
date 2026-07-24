import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';

import Home from './pages/Home.jsx';
import Produtos from './pages/produtos.jsx';
import Login from './pages/Login.jsx';
import Cadastro from './pages/Cadastro.jsx';
import Carrinho from './pages/Carrinho.jsx';
import Confirmacao from './pages/Confirmacao.jsx';

import PrivateRoute from './routes/PrivateRoute';
import AdminRoute from './routes/AdminRoute';

import Header from './components/Header';
import Footer from './components/Footer';
import MiniCarrinho from './components/MiniCarrinho';

import { CarrinhoProvider } from './context/CarrinhoContext';
import { AuthProvider } from './context/AuthContext';

const MeusPedidos = lazy(() => import('./pages/MeusPedidos.jsx'));
const EsqueciSenha = lazy(() => import('./pages/EsqueciSenha.jsx'));
const VerificarCodigo = lazy(() => import('./pages/VerificarCodigo.jsx'));
const RedefinirSenha = lazy(() => import('./pages/RedefinirSenha.jsx'));
const Busca = lazy(() => import('./pages/Busca.jsx'));
const Perfil = lazy(() => import('./pages/Perfil.jsx'));
const Favoritos = lazy(() => import('./pages/Favoritos.jsx'));
const Admin = lazy(() => import('./pages/Admin.jsx'));
const ProdutoDetalhe = lazy(() => import('./pages/ProdutoDetalhe'));
const EditarProduto = lazy(() => import('./pages/EditarProduto'));
const PagamentoRetorno = lazy(() => import('./pages/PagamentoRetorno'));

import './App.css';

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <CarrinhoProvider>
          <Header />
          <MiniCarrinho />

          <main className="main-content">
            <Suspense fallback={<p>Carregando...</p>}>
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
              <Route path="/verificar" element={<VerificarCodigo />} />
              <Route path="/redefinir-senha/:token" element={<RedefinirSenha />} />
              <Route path="/busca" element={<Busca />} />
              <Route path="/produto/:id" element={<ProdutoDetalhe />} />
              <Route path="/admin/produto/:id" element={<EditarProduto />} />
              <Route path="/pagamento/sucesso" element={<PagamentoRetorno />} />
              <Route path="/pagamento/retorno" element={<PagamentoRetorno />} />
              <Route path="/pagamento-retorno" element={<PagamentoRetorno />} />
              <Route path="/pagamento/pendente" element={<PagamentoRetorno />} />
              <Route path="/pagamento/falhou" element={<PagamentoRetorno />} />

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
            </Suspense>
          </main>

          <Footer />
        </CarrinhoProvider>
      </AuthProvider>
    </Router>
  );
}
