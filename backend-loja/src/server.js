import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/authRoutes.js';
import produtosRoutes from './routes/products.routes.js';
import pedidosRoutes from './routes/pedidos.js';
import usuariosRoutes from './routes/usuariosRoutes.js';
import favoritosRoutes from './routes/favoritosRoutes.js';

const app = express();

function requireEnv(name) {
  const value = process.env[name];
  if (value === undefined || value === null || String(value).trim() === '') {
    throw new Error(`${name} não definido no .env`);
  }
  return value;
}

// =====================================================
// CONFIG ENV (falha rápida em produção)
// =====================================================

requireEnv('NODE_ENV');
requireEnv('JWT_SECRET');
requireEnv('DB_PASSWORD');

// PIX_KEY / FRONT_URL / CORS_ORIGINS são usadas em rotas e/ou CORS.
// Mantemos como obrigatórias para evitar comportamento silencioso em produção.
requireEnv('PIX_KEY');
requireEnv('FRONT_URL');
requireEnv('CORS_ORIGINS');

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
// SECURITY HEADERS
// =====================================================

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: {
      policy: 'cross-origin',
    },
  }),
);

// =====================================================
// CORS (somente origens configuradas)
// =====================================================

const allowedOrigins = process.env.CORS_ORIGINS.split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // Permite requests sem origin (ex.: mobile/SSR/curl)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('CORS origin não autorizada'), false);
    },
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

// =====================================================
// UPLOADS (produção)
// =====================================================
// Problema: servir `uploads` inteiro publicamente expõe comprovantes PIX.
// Solução: manter /uploads/produtos público e NÃO expor /uploads/comprovantes.

app.use(
  '/uploads/produtos',
  express.static(path.resolve('uploads', 'produtos'), {
    setHeaders: (res) => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    },
  }),
);

// =====================================================
// ROTAS
// =====================================================

const rateLimiter15m = {
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { erro: 'Muitas requisições. Tente novamente mais tarde.' },
};

const rateLimiterLogin = rateLimit(rateLimiter15m);
const rateLimiterCadastro = rateLimit({
  ...rateLimiter15m,
  max: 10,
  message: { erro: 'Muitas requisições. Aguarde e tente novamente.' },
});
const rateLimiterReenviar = rateLimit({
  ...rateLimiter15m,
  max: 5,
  message: { erro: 'Muitas requisições. Aguarde e tente novamente.' },
});
const rateLimiterPedidos = rateLimit({
  ...rateLimiter15m,
  max: 30,
  message: { erro: 'Muitas requisições. Aguarde e tente novamente.' },
});
const rateLimiterPixComprovante = rateLimit({
  ...rateLimiter15m,
  max: 10,
  message: { erro: 'Muitas requisições. Aguarde e tente novamente.' },
});

app.use('/auth/login', rateLimiterLogin);
app.use('/auth/cadastro', rateLimiterCadastro);
app.use('/auth/reenviar-codigo', rateLimiterReenviar);

// Aplica SOMENTE em POST (evita limitar GET/PUT/DELETE)
app.post('/pedidos', rateLimiterPedidos);
app.post('/pedidos/:id/pix/comprovante', rateLimiterPixComprovante);

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
  if (process.env.NODE_ENV === 'production') {
    // Production: logs essenciais sem detalhes sensíveis/stack.
    // Evita vazamento de caminhos internos/stack/SQL.
    const msg = err && (err.message || err.error || err.erro);
    console.error('ERRO GLOBAL:', msg ? String(msg) : 'Erro interno');
  } else {
    // Development: manter logs completos para diagnóstico.
    console.error('ERRO GLOBAL:', err);
  }

  res.status(500).json({
    erro: 'Erro interno do servidor',
  });
});

// =====================================================
// SERVIDOR
// =====================================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API rodando na porta ${PORT}`);
});
