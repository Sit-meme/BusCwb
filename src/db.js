const { Pool } = require("pg");
require("dotenv").config();

const usarSSL = String(process.env.DATABASE_SSL).toLowerCase() === "true";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: usarSSL ? { rejectUnauthorized: false } : false,
});

pool.on("error", (erro) => {
  console.error("Erro inesperado no pool do Postgres:", erro);
});

module.exports = { pool };
