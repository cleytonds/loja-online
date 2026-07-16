import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';

import authRoutes from './routes/authRoutes.js';
import produtosRoutes from './routes/products.routes.js';
import pedidosRoutes from './routes/pedidos.js';
import usuariosRoutes from './routes/usuariosRoutes.js';
import favoritosRoutes from './routes/favoritosRoutes.js';

const app = express();

app.use(
  compression({
    filter: (req, res) => {
      if (req.path.startsWith('/uploads/')) return false;
      return compression.filter(req, res);
    },
  }),
);

export function buildHelmetConfig() {
  return {
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: {
      policy: 'cross-origin',
    },
    referrerPolicy: { policy: 'no-referrer-when-downgrade' },
    frameguard: { action: 'sameorigin' },
  };
}

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

app.use(helmet(buildHelmetConfig()));

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

export function buildRateLimitConfig() {
  const base = {
    windowMs: 15 * 60 * 1000,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { erro: 'Muitas requisições. Tente novamente mais tarde.' },
  };

  return {
    login: { max: 20, middleware: rateLimit({ ...base, max: 20 }) },
    cadastro: {
      max: 10,
      middleware: rateLimit({ ...base, max: 10, message: { erro: 'Muitas requisições. Aguarde e tente novamente.' } }),
    },
    reenviar: {
      max: 5,
      middleware: rateLimit({ ...base, max: 5, message: { erro: 'Muitas requisições. Aguarde e tente novamente.' } }),
    },
    verificarCodigo: {
      max: 10,
      middleware: rateLimit({ ...base, max: 10, message: { erro: 'Muitas requisições. Aguarde e tente novamente.' } }),
    },
    pedidos: {
      max: 30,
      middleware: rateLimit({ ...base, max: 30, message: { erro: 'Muitas requisições. Aguarde e tente novamente.' } }),
    },
    pixComprovante: {
      max: 10,
      middleware: rateLimit({ ...base, max: 10, message: { erro: 'Muitas requisições. Aguarde e tente novamente.' } }),
    },
  };
}

const rateLimiters = buildRateLimitConfig();

app.use('/auth/login', rateLimiters.login.middleware);
app.use('/auth/cadastro', rateLimiters.cadastro.middleware);
app.use('/auth/reenviar-codigo', rateLimiters.reenviar.middleware);
app.use('/auth/verificar-codigo', rateLimiters.verificarCodigo.middleware);

// Aplica SOMENTE em POST (evita limitar GET/PUT/DELETE)
app.post('/pedidos', rateLimiters.pedidos.middleware);
app.post('/pedidos/:id/pix/comprovante', rateLimiters.pixComprovante.middleware);

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

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`API rodando na porta ${PORT}`);
  });
}

export default app;
