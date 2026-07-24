import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { buildDatabaseConfig } from './runtime.js';

dotenv.config();

function requireEnv(name) {
  const value = process.env[name];
  if (value === undefined || value === null || String(value).trim() === '') {
    throw new Error(`${name} não definida no .env`);
  }
  return value;
}

// Variáveis obrigatórias do banco (sem fallback)
requireEnv('DB_HOST');
requireEnv('DB_USER');
requireEnv('DB_PASSWORD');
requireEnv('DB_NAME');
requireEnv('DB_PORT');

const db = mysql.createPool(buildDatabaseConfig(process.env));

export default db;
