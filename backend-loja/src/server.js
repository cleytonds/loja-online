import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';

import authRoutes from './routes/authRoutes.js';
import produtosRoutes from './routes/products.routes.js';
import pedidosRoutes from './routes/pedidos.js';
import usuariosRoutes from './routes/usuariosRoutes.js';
import favoritosRoutes from './routes/favoritosRoutes.js';

const app = express();

// =====================================================
// DEBUG (somente desenvolvimento)
// =====================================================

if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log('REQUEST:', req.method, req.url);

    next();
  });
}

// =====================================================
// CORS
// =====================================================

app.use(
  cors({
    origin: process.env.CORS_ORIGINS?.split(','),

    credentials: true,

    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],

    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// =====================================================
// JSON
// =====================================================

app.use(
  express.json({
    limit: '10kb',
  }),
);

// =====================================================
// UPLOADS
// =====================================================

app.use('/uploads', express.static(path.resolve('uploads')));

// =====================================================
// ROTAS
// =====================================================

app.use('/auth', authRoutes);

app.use('/produtos', produtosRoutes);

app.use('/pedidos', pedidosRoutes);

app.use('/usuarios', usuariosRoutes);

app.use('/favoritos', favoritosRoutes);

// =====================================================
// TESTE API
// =====================================================

app.get('/', (req, res) => {
  res.send('API online');
});

// =====================================================
// ERRO GLOBAL
// =====================================================

app.use((err, req, res, next) => {
  console.error('ERRO GLOBAL:', err);

  res.status(500).json({
    erro: 'Erro interno do servidor',
  });
});

// =====================================================
// VALIDAÇÃO JWT
// =====================================================

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET não definido no .env');
}

// =====================================================
// SERVIDOR
// =====================================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API rodando na porta ${PORT}`);
});
