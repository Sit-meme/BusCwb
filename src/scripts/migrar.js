const fs = require("fs");
const path = require("path");
const { pool } = require("../db");

async function main() {
  const caminhoSchema = path.join(__dirname, "..", "db", "schema.sql");
  const sql = fs.readFileSync(caminhoSchema, "utf8");

  console.log("Aplicando schema.sql no banco...");
  await pool.query(sql);
  console.log("Tabelas criadas/atualizadas com sucesso.");
  await pool.end();
}

main().catch((erro) => {
  console.error("Falha ao migrar o banco:", erro);
  process.exit(1);
});
