const { Pool } = require('pg');
const dotenv = require("dotenv")

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Required for Railway PostgreSQL
});

pool.on('connect', () => {
  // console.log('[OK] => Database connection');
});

module.exports = pool;
