CREATE TABLE IF NOT EXISTS linhas (
  id                TEXT PRIMARY KEY,
  numero            TEXT NOT NULL,
  nome              TEXT NOT NULL,
  categoria_servico TEXT,
  cor               TEXT,
  somente_cartao    BOOLEAN NOT NULL DEFAULT false,
  pagamento         TEXT,
  ponto_principal   TEXT,
  atualizado_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS horarios (
  id       BIGSERIAL PRIMARY KEY,
  linha_id TEXT NOT NULL REFERENCES linhas(id) ON DELETE CASCADE,
  tipo_dia TEXT NOT NULL CHECK (tipo_dia IN ('util', 'sabado', 'domingo')),
  ponto    TEXT NOT NULL,
  horario  TEXT NOT NULL,
  adapt    BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (linha_id, tipo_dia, ponto, horario)
);

CREATE INDEX IF NOT EXISTS idx_horarios_linha_tipo_ponto
  ON horarios (linha_id, tipo_dia, ponto, horario);

CREATE TABLE IF NOT EXISTS importacoes (
  id            BIGSERIAL PRIMARY KEY,
  executado_em  TIMESTAMPTZ NOT NULL DEFAULT now(),
  linhas_total  INTEGER,
  horarios_total INTEGER,
  observacao    TEXT
);
