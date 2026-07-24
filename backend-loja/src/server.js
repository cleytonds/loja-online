import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';

import authRoutes from './routes/authRoutes.js';
import produtosRoutes from './routes/products.routes.js';
import pedidosRoutes from './routes/pedidos.js';
import usuariosRoutes from './routes/usuariosRoutes.js';
import favoritosRoutes from './routes/favoritosRoutes.js';
import pagamentosRoutes from './routes/pagamentos.js';
import db from './config/database.js';
import { getUploadProductsDir, parseCorsOrigins, validateRuntimeEnvironment } from './config/runtime.js';
import { stopOrderScheduler } from './utils/orderScheduler.js';
import { logger } from './utils/logger.js';

const app = express();
const runtime = validateRuntimeEnvironment(process.env);
if (runtime.trustProxy !== false) app.set('trust proxy', runtime.trustProxy);

app.use(compression({
  filter: (req, res) => (req.path.startsWith('/uploads/') ? false : compression.filter(req, res)),
}));

export function buildHelmetConfig() {
  return {
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    referrerPolicy: { policy: 'no-referrer-when-downgrade' },
    frameguard: { action: 'sameorigin' },
  };
}

app.use(helmet(buildHelmetConfig()));

const allowedOrigins = parseCorsOrigins(process.env.CORS_ORIGINS);
app.use(cors({
  origin(origin, callback) {
    // Webhooks, health checks and server-to-server callers have no Origin.
    if (!origin) return callback(null, true);
    return allowedOrigins.includes(origin)
      ? callback(null, true)
      : callback(Object.assign(new Error('CORS origin nao autorizada'), { statusCode: 403 }));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Idempotency-Key', 'ngrok-skip-browser-warning'],
}));

app.use(express.json({ limit: '10kb' }));
app.use('/uploads/produtos', express.static(getUploadProductsDir(process.env), {
  setHeaders: (res) => res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'),
}));

export function buildRateLimitConfig() {
  const base = {
    windowMs: 15 * 60 * 1000,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { erro: 'Muitas requisicoes. Tente novamente mais tarde.' },
  };
  return {
    login: { max: 20, middleware: rateLimit({ ...base, max: 20 }) },
    cadastro: { max: 10, middleware: rateLimit({ ...base, max: 10, message: { erro: 'Muitas requisicoes. Aguarde e tente novamente.' } }) },
    reenviar: { max: 5, middleware: rateLimit({ ...base, max: 5, message: { erro: 'Muitas requisicoes. Aguarde e tente novamente.' } }) },
    verificarCodigo: { max: 10, middleware: rateLimit({ ...base, max: 10, message: { erro: 'Muitas requisicoes. Aguarde e tente novamente.' } }) },
    pedidos: { max: 30, middleware: rateLimit({ ...base, max: 30, message: { erro: 'Muitas requisicoes. Aguarde e tente novamente.' } }) },
  };
}

const rateLimiters = buildRateLimitConfig();
app.use('/auth/login', rateLimiters.login.middleware);
app.use('/auth/cadastro', rateLimiters.cadastro.middleware);
app.use('/auth/reenviar-codigo', rateLimiters.reenviar.middleware);
app.use('/auth/verificar-codigo', rateLimiters.verificarCodigo.middleware);
app.post('/pedidos', rateLimiters.pedidos.middleware);

app.use('/auth', authRoutes);
app.use('/produtos', produtosRoutes);
app.use('/pedidos', pedidosRoutes);
app.use('/usuarios', usuariosRoutes);
app.use('/favoritos', favoritosRoutes);
app.use('/pagamentos', pagamentosRoutes);

app.get('/', (req, res) => res.send('API online'));
app.get('/health', (req, res) => res.status(200).json({
  status: 'ok', service: 'backend-loja', environment: process.env.NODE_ENV, timestamp: new Date().toISOString(),
}));
app.get('/ready', async (req, res) => {
  let timeout;
  try {
    await Promise.race([
      db.query('SELECT 1'),
      new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('timeout')), 2000); }),
    ]);
    return res.status(200).json({ status: 'ready' });
  } catch {
    return res.status(503).json({ status: 'unavailable' });
  } finally {
    clearTimeout(timeout);
  }
});

app.use((req, res) => res.status(404).json({ erro: 'Rota nao encontrada' }));

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const status = err?.statusCode || err?.status || (err?.type === 'entity.parse.failed' ? 400 : 500);
  const isPayloadTooLarge = err?.type === 'entity.too.large' || status === 413;
  const message = err?.type === 'entity.parse.failed'
    ? 'JSON invalido'
    : isPayloadTooLarge
      ? 'Payload muito grande'
      : err?.name === 'MulterError'
        ? 'Arquivo invalido'
        : status >= 500 ? 'Erro interno do servidor' : (err?.message || 'Requisicao invalida');
  logger.error('Erro HTTP', { method: req.method, route: req.originalUrl, status, message: err?.message });
  return res.status(status).json({
    erro: message,
    ...(process.env.NODE_ENV !== 'production' && status >= 500 ? { detalhes: 'Consulte os logs do servidor.' } : {}),
  });
});

const PORT = Number(process.env.PORT || 3001);
const isTestRuntime = process.env.NODE_ENV === 'test'
  || process.argv.includes('--test')
  || Boolean(process.env.NODE_TEST_CONTEXT);
export function startServer(port = PORT) {
  return app.listen(port, '0.0.0.0', () => logger.info('API iniciada', { port, environment: process.env.NODE_ENV }));
}

export async function shutdownServer(server, exit = process.exit) {
  logger.info('Encerramento seguro iniciado');
  stopOrderScheduler();
  const forceTimer = setTimeout(() => exit(1), 10000);
  forceTimer.unref?.();
  try {
    if (server?.listening) await new Promise((resolve) => server.close(resolve));
    await db.end();
    clearTimeout(forceTimer);
    exit(0);
  } catch (error) {
    logger.error('Falha no encerramento seguro', { message: error?.message });
    clearTimeout(forceTimer);
    exit(1);
  }
}

if (!isTestRuntime) {
  const server = startServer();
  let shuttingDown = false;
  const shutdown = () => {
    if (shuttingDown) return;
    shuttingDown = true;
    shutdownServer(server);
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
  process.once('unhandledRejection', (error) => { logger.error('Unhandled rejection', { message: error?.message }); shutdown(); });
  process.once('uncaughtException', (error) => { logger.error('Uncaught exception', { message: error?.message }); shutdown(); });
}

export default app;
