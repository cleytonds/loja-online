import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';

import authRoutes from './routes/authRoutes.js';
import carrinhoRoutes from './routes/carrinhoRoutes.js';
import produtosRoutes from './routes/products.routes.js';
import pedidosRoutes from './routes/pedidos.js';
import usuariosRoutes from './routes/usuariosRoutes.js';
import favoritosRoutes from './routes/favoritosRoutes.js';

const app = express();

// DEBUG
app.use((req, res, next) => {
  console.log('🔥 REQUEST:', req.method, req.url);
  next();
});

// CORS
app.use(
  cors({
    origin: ['http://localhost:5173', 'http://192.168.0.107:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

app.use(express.json());

app.use('/uploads', express.static(path.resolve('uploads')));

// ROTAS
app.use('/auth', authRoutes);
app.use('/carrinho', carrinhoRoutes);
app.use('/produtos', produtosRoutes);
app.use('/pedidos', pedidosRoutes);
app.use('/usuarios', usuariosRoutes);
app.use('/favoritos', favoritosRoutes);

// teste
app.get('/', (req, res) => {
  res.send('API online');
});

const PORT = process.env.PORT || 3000;

app.listen(3000, '0.0.0.0', () => {
  console.log('API rodando');
});
