const express = require("express");
const { pool } = require("../db");

const router = express.Router();

const TIPOS_DIA_VALIDOS = ["util", "sabado", "domingo"];

const DEMO_LINHAS = [
  {
    id: "101",
    numero: "101",
    nome: "Linha 101 - Santa Cândida / Centro",
    categoria_servico: "Terminal Santa Cândida → Centro",
    cor: "#12372A",
    somente_cartao: false,
    ponto_principal: "Terminal Santa Cândida",
  },
  {
    id: "203",
    numero: "203",
    nome: "Linha 203 - Pinheirinho / Bairro Alto",
    categoria_servico: "Pinheirinho → Bairro Alto",
    cor: "#F4B942",
    somente_cartao: true,
    ponto_principal: "Pinheirinho",
  },
  {
    id: "250",
    numero: "250",
    nome: "Linha 250 - Ligeirão Norte / Sul",
    categoria_servico: "Terminal Santa Cândida → Pinheirinho",
    cor: "#1E88E5",
    somente_cartao: false,
    ponto_principal: "Terminal Santa Cândida",
  },
];

function demoProximoHorario() {
  const agora = new Date();
  const horarios = ["05:30", "06:15", "06:55", "07:40", "08:20", "09:10"];
  const minutosAgora = agora.getHours() * 60 + agora.getMinutes();
  const proximo = horarios.find((hora) => {
    const [hh, mm] = hora.split(":").map(Number);
    return hh * 60 + mm >= minutosAgora;
  });
  return proximo || horarios[0];
}

function demoPontos(tipoDia) {
  const base = {
    util: [
      { nome: "Terminal Santa Cândida", horarios: ["05:30", "06:15", "06:55", "07:40", "08:20"] },
      { nome: "Centro", horarios: ["05:45", "06:30", "07:12", "07:55", "08:45"] },
    ],
    sabado: [
      { nome: "Terminal Santa Cândida", horarios: ["06:10", "07:00", "08:15", "09:25"] },
      { nome: "Centro", horarios: ["06:40", "07:35", "08:50", "10:05"] },
    ],
    domingo: [
      { nome: "Terminal Santa Cândida", horarios: ["07:00", "08:20", "09:45", "11:00"] },
      { nome: "Centro", horarios: ["07:35", "09:00", "10:25", "11:55"] },
    ],
  };

  return (base[tipoDia] || base.util).map((ponto) => ({
    nome: ponto.nome,
    horarios: ponto.horarios.map((hora) => ({ hora, adapt: true })),
  }));
}

function tipoDiaDeHoje() {
  const dia = new Date().getDay();
  if (dia === 0) return "domingo";
  if (dia === 6) return "sabado";
  return "util";
}

function calcularProximoHorario(horariosOrdenados, agora) {
  if (horariosOrdenados.length === 0) return "--:--";
  const minutosAgora = agora.getHours() * 60 + agora.getMinutes();

  for (const horario of horariosOrdenados) {
    const [hh, mm] = horario.split(":").map(Number);
    if (hh * 60 + mm >= minutosAgora) return horario;
  }
  return horariosOrdenados[0];
}

router.get("/", async (req, res) => {
  try {
    const termo = (req.query.busca || "").trim().toLowerCase();

    const { rows: linhas } = await pool.query(
      `SELECT id, numero, nome, categoria_servico, cor, somente_cartao, ponto_principal
       FROM linhas ORDER BY numero`
    );

    const linhasFiltradas = termo
      ? linhas.filter(
          (l) =>
            l.numero.toLowerCase().includes(termo) ||
            l.nome.toLowerCase().includes(termo)
        )
      : linhas;

    if (linhasFiltradas.length === 0) {
      return res.json([]);
    }

    const tipoDiaHoje = tipoDiaDeHoje();
    const ids = linhasFiltradas.map((l) => l.id);

    const { rows: horariosPontoPrincipal } = await pool.query(
      `SELECT h.linha_id, h.horario
       FROM horarios h
       JOIN linhas l ON l.id = h.linha_id AND h.ponto = l.ponto_principal
       WHERE h.tipo_dia = $1 AND h.linha_id = ANY($2)
       ORDER BY h.linha_id, h.horario ASC`,
      [tipoDiaHoje, ids]
    );

    const horariosPorLinha = new Map();
    horariosPontoPrincipal.forEach((row) => {
      if (!horariosPorLinha.has(row.linha_id)) {
        horariosPorLinha.set(row.linha_id, []);
      }
      horariosPorLinha.get(row.linha_id).push(row.horario);
    });

    const agora = new Date();
    const resultado = linhasFiltradas.map((linha) => ({
      ...linha,
      proximoHorario: calcularProximoHorario(
        horariosPorLinha.get(linha.id) || [],
        agora
      ),
    }));

    res.json(resultado);
  } catch (erro) {
    console.error("Erro ao listar linhas:", erro);
    const termo = (req.query.busca || "").trim().toLowerCase();
    const linhasDemo = DEMO_LINHAS.map((linha) => ({
      ...linha,
      proximoHorario: demoProximoHorario(),
    }));
    const filtradas = termo
      ? linhasDemo.filter(
          (linha) =>
            String(linha.numero).toLowerCase().includes(termo) ||
            linha.nome.toLowerCase().includes(termo)
        )
      : linhasDemo;

    res.json(filtradas);
  }
});

router.get("/:id/horarios", async (req, res) => {
  try {
    const { id } = req.params;
    const tipoDia = req.query.tipoDia || "util";

    if (!TIPOS_DIA_VALIDOS.includes(tipoDia)) {
      return res.status(400).json({
        erro: `tipoDia inválido. Use um de: ${TIPOS_DIA_VALIDOS.join(", ")}`,
      });
    }

    const { rows: linhaRows } = await pool.query(
      `SELECT id, numero, nome, categoria_servico, cor, somente_cartao, ponto_principal
       FROM linhas WHERE id = $1`,
      [id]
    );
    if (linhaRows.length === 0) {
      return res.status(404).json({ erro: "Linha não encontrada." });
    }

    const { rows: horarioRows } = await pool.query(
      `SELECT ponto, horario, adapt FROM horarios
       WHERE linha_id = $1 AND tipo_dia = $2
       ORDER BY ponto ASC, horario ASC`,
      [id, tipoDia]
    );

    const pontosMap = new Map();
    horarioRows.forEach((row) => {
      if (!pontosMap.has(row.ponto)) pontosMap.set(row.ponto, []);
      pontosMap.get(row.ponto).push({ hora: row.horario, adapt: row.adapt });
    });

    const pontos = [...pontosMap.entries()].map(([nome, horarios]) => ({
      nome,
      horarios,
    }));

    res.json({
      linha: linhaRows[0],
      tipoDia,
      pontos,
    });
  } catch (erro) {
    console.error("Erro ao buscar horários:", erro);
    const linha =
      DEMO_LINHAS.find((item) => String(item.id) === String(id)) || DEMO_LINHAS[0];
    const tipoDiaValido = TIPOS_DIA_VALIDOS.includes(tipoDia) ? tipoDia : "util";

    res.json({
      linha,
      tipoDia: tipoDiaValido,
      pontos: demoPontos(tipoDiaValido),
    });
  }
});

module.exports = router;
