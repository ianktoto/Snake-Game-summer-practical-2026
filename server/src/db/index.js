import pg from 'pg';
const { Pool } = pg;

// Пул должен использовать DATABASE_URL из .env
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const query = (text, params) => pool.query(text, params);
