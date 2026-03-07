import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./pages/Home.jsx";
import Produtos from "./pages/Produtos.jsx"; // você pode mover seu código de listagem pra aqui
import Carrinho from "./pages/Carrinho.jsx";
import Login from "./pages/Login.jsx";
import Cadastro from "./pages/Cadastro.jsx";
import PrivateRoute from "./routes/PrivateRoute.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rotas públicas */}
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Cadastro />} />

        {/* Rotas privadas */}
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Home />
            </PrivateRoute>
          }
        />
        <Route
          path="/produtos"
          element={
            <PrivateRoute>
              <Produtos />
            </PrivateRoute>
          }
        />
        <Route
          path="/carrinho"
          element={
            <PrivateRoute>
              <Carrinho />
            </PrivateRoute>
          }
        />
        <Route
          path="/carrinho"
           element={
              <PrivateRoute>
                <Carrinho />
              </PrivateRoute>
          }
/>
      </Routes>
    </BrowserRouter>
  );
}