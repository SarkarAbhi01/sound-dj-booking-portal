const { Pool } = require('pg');
require('dotenv').config();

console.log('========== DB DEBUG ==========');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DATABASE_URL EXISTS:', !!process.env.DATABASE_URL);
console.log('DATABASE_URL LENGTH:', process.env.DATABASE_URL?.length || 0);
console.log('PGHOST:', process.env.PGHOST || 'NOT SET');
console.log('PGUSER:', process.env.PGUSER || 'NOT SET');
console.log('PGDATABASE:', process.env.PGDATABASE || 'NOT SET');
console.log('==============================');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

pool.on('error', (err) => {
  console.error('🔥 PostgreSQL Pool Error:', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};