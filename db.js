const { Pool } = require("pg");

// Render's PostgreSQL requires SSL for external connections.
// DATABASE_URL is provided automatically by Render when you attach a Postgres database.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.DATABASE_URL && process.env.DATABASE_URL.includes("localhost")
      ? false
      : { rejectUnauthorized: false },
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS submissions (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      mobile TEXT NOT NULL,
      submitted_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
}

module.exports = { pool, initDb };
