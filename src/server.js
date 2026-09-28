require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const linhasRouter = require("./routes/linhas");
const { pool } = require("./db");

const app = express();
const raizProjeto = path.join(__dirname, "..");

const origensPermitidas = (process.env.CORS_ORIGIN || "*")
  .split(",")
  .map((o) => o.trim());

app.use(
  cors({
    origin: origensPermitidas.includes("*") ? true : origensPermitidas,
  })
);
app.use(express.json());

app.use(express.static(raizProjeto));

app.get("/", (req, res) => {
  res.sendFile(path.join(raizProjeto, "index.html"));
});

app.get("/api", (req, res) => {
  res.json({ status: "ok", servico: "bus-cwb-backend" });
});

app.get("/api/status", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT executado_em, linhas_total, horarios_total FROM importacoes ORDER BY executado_em DESC LIMIT 1"
    );
    res.json({ banco: "conectado", ultimaImportacao: rows[0] || null });
  } catch (erro) {
    res.status(200).json({
      banco: "demo",
      detalhe: "Banco não configurado; usando dados de demonstração.",
      ultimaImportacao: null,
    });
  }
});

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(raizProjeto, "index.html"));
});

app.use("/api/linhas", linhasRouter);

const PORTA = process.env.PORT || 3000;
app.listen(PORTA, () => {
  console.log(`Bus Cwb backend rodando na porta ${PORTA}`);
});
