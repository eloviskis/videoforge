import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'videoforge',
  user: process.env.POSTGRES_USER || 'videoforge',
  password: process.env.POSTGRES_PASSWORD || 'forge123',
  max: 10,
});

pool.on('error', (err) => {
  console.error('❌ Erro inesperado no pool PostgreSQL:', err.message);
});

export default pool;
