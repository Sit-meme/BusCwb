# Bus Cwb - Backend

API Node.js + PostgreSQL que serve linhas e horários de ônibus de
Curitiba, alimentada pelo endpoint público que a própria página de
horários da URBS usa internamente — sem GTFS, sem token, sem cadastro.

Fonte dos dados:
- Lista de linhas: `https://www.urbs.curitiba.pr.gov.br/portal/wp-content/urbs_data/urbs_horarios/linhas_ativas.json`
- Horários por linha: `https://www.urbs.curitiba.pr.gov.br/portal/wp-content/urbs_data/urbs_horarios/linha_{codigo}_v2.json`

## Estrutura

```
src/
  db.js                        -> conexão com o Postgres (usa DATABASE_URL)
  server.js                    -> servidor Express (rotas da API)
  db/schema.sql                -> criação das tabelas
  routes/linhas.js              -> endpoints /api/linhas
  scripts/migrar.js             -> roda o schema.sql no banco
  scripts/importarHorariosUrbs.js -> baixa os dados da URBS e popula o banco
```

## Passo a passo local

1. `npm install`
2. Copie `.env.example` para `.env` e preencha `DATABASE_URL` (Postgres
   local ou do Render).
3. Criar as tabelas: `npm run migrar`
4. Importar os dados: `npm run importar-horarios`
   (demora alguns minutos — são ~250 linhas, uma requisição por linha,
   com uma pequena pausa entre elas para não sobrecarregar o servidor
   da URBS)
5. Subir a API: `npm start` (ou `npm run dev`)
6. Testar: `http://localhost:3000/api/linhas`

## Deploy no Render

1. Suba esta pasta `bus-cwb-backend` para um repositório no GitHub.
2. No Render: **New +** → **PostgreSQL** → crie o banco (anote a
   "Internal Database URL").
3. No Render: **New +** → **Web Service** → conecte o repositório.
   - Build Command: `npm install`
   - Start Command: `npm start`
4. Em **Environment**, adicione:
   - `DATABASE_URL` = a Internal Database URL do passo 2
   - `DATABASE_SSL` = `true`
   - `CORS_ORIGIN` = a URL onde seu front-end fica hospedado
5. Depois do primeiro deploy, rode uma vez pela aba **Shell** do
   Web Service no Render:
   ```
   npm run migrar
   npm run importar-horarios
   ```
6. Para manter os dados atualizados, repita `npm run importar-horarios`
   de tempos em tempos (manualmente, ou com um **Render Cron Job**
   apontando pro mesmo comando — ex: 1x por semana).

## Sobre os dados

- Cada linha tem "simulações" (versões da tabela horária válidas por
  período). O script usa só as simulações marcadas como `is_current`.
- Tipo de dia: `"1"` = dia útil, `"2"` = sábado, `"3"` = domingo/feriado.
  Uma linha que não circula aos domingos simplesmente não tem a chave `"3"`.
- Cada linha tem vários **pontos/terminais**, cada um com sua própria
  lista de horários (ex: `"TERMINAL SANTA CANDIDA"`, `"TERMINAL PINHEIRINHO"`).
  O `ponto_principal` salvo em `linhas` é o ponto com mais horários
  cadastrados, usado só para calcular o "próximo horário" mostrado na
  lista inicial do app.
- O "próximo horário" da lista é calculado dinamicamente: dia da semana
  atual (útil/sábado/domingo) + primeiro horário do `ponto_principal`
  que ainda não passou (ou o primeiro do dia, se já passaram todos).
  Feriados não são tratados automaticamente (a URBS não expõe um
  calendário de feriados nesse endpoint).

## Endpoints

- `GET /api/linhas?busca=203` → lista linhas com o próximo horário calculado
- `GET /api/linhas/:id/horarios?tipoDia=util|sabado|domingo` → horários
  de TODOS os pontos/terminais da linha
- `GET /api/status` → confirma se o banco está de pé e quando foi a
  última importação
