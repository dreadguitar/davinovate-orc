import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

let dbConfig: any = {};

const DB_HOST = process.env.DB_HOST || '';
const DATABASE_URL = process.env.DATABASE_URL || '';

// Detect if we have a connection URI (postgresql:// or postgres://)
const rawConnectionString = (DATABASE_URL || DB_HOST).trim().replace('jdbc:', '');
const isURI = rawConnectionString.startsWith('postgres://') || rawConnectionString.startsWith('postgresql://');

if (isURI) {
  try {
    const url = new URL(rawConnectionString);
    // Merge separate env vars into URI if not already present
    if (process.env.DB_USER && !url.username) url.username = process.env.DB_USER;
    if (process.env.DB_PASSWORD && !url.password) url.password = process.env.DB_PASSWORD;
    if (process.env.DB_PORT && !url.port) url.port = process.env.DB_PORT;
    if (process.env.DB_NAME && (url.pathname === '/' || url.pathname === '')) {
      url.pathname = `/${process.env.DB_NAME}`;
    }
    dbConfig.connectionString = url.toString();
  } catch (e) {
    dbConfig.connectionString = rawConnectionString;
  }
} else {
  // Use individual properties
  dbConfig = {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  };
}

// Enable SSL for cloud databases (like Supabase)
// If the host is not localhost, we likely need SSL
const isExternal = dbConfig.host && !dbConfig.host.includes('localhost') && !dbConfig.host.includes('127.0.0.1');
const isExternalStr = rawConnectionString && !rawConnectionString.includes('localhost') && !rawConnectionString.includes('127.0.0.1');

if (isExternal || isExternalStr || process.env.DB_SSL === 'true') {
  dbConfig.ssl = {
    rejectUnauthorized: false
  };
}

const pool = new Pool(dbConfig);

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  // console.log('executed query', { text, duration, rows: res.rowCount });
  return res;
};

export default pool;
