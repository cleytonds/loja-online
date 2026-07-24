import fs from 'fs';
import path from 'path';

const LOCALHOST_PATTERN = /(^|\/\/)(localhost|127\.0\.0\.1)(?::\d+)?(?:\/|$)/i;

export function parseTrustProxy(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized || normalized === 'false' || normalized === '0') return false;
  if (/^[1-9]\d*$/.test(normalized)) return Number(normalized);
  throw new Error('TRUST_PROXY deve ser false, vazio ou um inteiro positivo');
}

export function parseCorsOrigins(value) {
  return String(value ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function isLocalOrigin(value) {
  return LOCALHOST_PATTERN.test(String(value ?? '').trim());
}

export function isHttpsUrl(value) {
  try {
    return new URL(String(value)).protocol === 'https:';
  } catch {
    return false;
  }
}

export function publicApiUrl(env = process.env) {
  return String(env.PUBLIC_API_URL || env.BACKEND_URL || '').trim().replace(/\/+$/, '');
}

export function validateMercadoPagoConfiguration(env = process.env) {
  const environment = String(env.MP_ENVIRONMENT || '').trim().toLowerCase();
  if (!['sandbox', 'production'].includes(environment)) {
    throw new Error('MP_ENVIRONMENT deve ser sandbox ou production');
  }
  const invalid = ['MERCADO_PAGO_ACCESS_TOKEN', 'MERCADO_PAGO_WEBHOOK_SECRET']
    .filter((name) => !String(env[name] ?? '').trim());
  if (invalid.length) throw new Error(`Configuracao Mercado Pago ausente: ${invalid.join(', ')}`);
  return { environment };
}

export function getUploadProductsDir(env = process.env) {
  const configured = String(env.UPLOAD_DIR || '').trim();
  const root = configured || (env.NODE_ENV === 'production' ? '' : path.resolve('uploads'));
  if (!root) throw new Error('UPLOAD_DIR deve ser configurado em producao');
  return path.resolve(root, 'produtos');
}

export function ensureUploadDirectory(env = process.env) {
  const directory = getUploadProductsDir(env);
  fs.mkdirSync(directory, { recursive: true });
  fs.accessSync(directory, fs.constants.R_OK | fs.constants.W_OK);
  return directory;
}

export function validateRuntimeEnvironment(env = process.env) {
  const missing = ['NODE_ENV', 'JWT_SECRET', 'DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME']
    .filter((name) => !String(env[name] ?? '').trim());
  const production = env.NODE_ENV === 'production';
  const origins = parseCorsOrigins(env.CORS_ORIGINS);

  if (production) {
    for (const name of ['FRONT_URL', 'PUBLIC_API_URL', 'CORS_ORIGINS']) {
      if (!String(env[name] ?? '').trim()) missing.push(name);
    }
    if (String(env.FRONT_URL || '').trim() && (!isHttpsUrl(env.FRONT_URL) || isLocalOrigin(env.FRONT_URL))) {
      throw new Error('FRONT_URL deve ser HTTPS publico em producao');
    }
    if (String(env.PUBLIC_API_URL || '').trim() && (!isHttpsUrl(env.PUBLIC_API_URL) || isLocalOrigin(env.PUBLIC_API_URL))) {
      throw new Error('PUBLIC_API_URL deve ser HTTPS publico em producao');
    }
    if (!origins.length || origins.some((origin) => origin === '*' || isLocalOrigin(origin))) {
      throw new Error('CORS_ORIGINS deve conter somente origens publicas explicitas em producao');
    }
    for (const name of ['MERCADO_PAGO_ACCESS_TOKEN', 'MERCADO_PAGO_WEBHOOK_SECRET']) {
      if (!String(env[name] ?? '').trim()) missing.push(name);
    }
    if (!missing.length) validateMercadoPagoConfiguration(env);
    ensureUploadDirectory(env);
  }

  if (missing.length) throw new Error(`Variaveis obrigatorias ausentes: ${[...new Set(missing)].join(', ')}`);
  return { origins, trustProxy: parseTrustProxy(env.TRUST_PROXY) };
}

export function buildDatabaseConfig(env = process.env) {
  const sslEnabled = String(env.DB_SSL_ENABLED || '').toLowerCase() === 'true';
  const config = {
    host: env.DB_HOST,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    port: Number(env.DB_PORT),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 10000,
    charset: 'utf8mb4',
  };
  if (sslEnabled) {
    config.ssl = { rejectUnauthorized: String(env.DB_SSL_REJECT_UNAUTHORIZED ?? 'true') !== 'false' };
    if (String(env.DB_SSL_CA || '').trim()) config.ssl.ca = env.DB_SSL_CA;
  }
  return config;
}
