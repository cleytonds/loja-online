import { BrowserRouter, Routes, Route } from "react-router-dom";
import Produtos from "../pages/Produtos";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/produtos" element={<Produtos />} />
      </Routes>
    </BrowserRouter>
  );
}