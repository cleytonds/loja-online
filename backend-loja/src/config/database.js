import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

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

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT),

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export default db;
