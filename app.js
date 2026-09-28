const API_BASE_URL = "https://SEU-BACKEND.onrender.com/api";

let LINHAS = [];
let linhaSelecionadaId = null;
let tipoDiaSelecionado = "util";
let pontosLinhaAtual = [];
let pontoSelecionado = null;

const CHAVE_FAVORITOS = "buscwb_favoritos";

function obterFavoritos() {
  const dados = localStorage.getItem(CHAVE_FAVORITOS);
  return dados ? JSON.parse(dados) : [];
}

function salvarFavoritos(lista) {
  localStorage.setItem(CHAVE_FAVORITOS, JSON.stringify(lista));
}

function ehFavorita(idLinha) {
  return obterFavoritos().includes(idLinha);
}

function alternarFavorito(idLinha) {
  let favoritos = obterFavoritos();
  if (favoritos.includes(idLinha)) {
    favoritos = favoritos.filter((id) => id !== idLinha);
  } else {
    favoritos.push(idLinha);
  }
  salvarFavoritos(favoritos);
  renderizarTudo();
}

async function buscarLinhasNaApi(termoBusca = "") {
  const url = new URL(`${API_BASE_URL}/linhas`);
  if (termoBusca) url.searchParams.set("busca", termoBusca);
  const resposta = await fetch(url);
  if (!resposta.ok) throw new Error("Falha ao buscar linhas na API.");
  return resposta.json();
}

async function buscarHorariosNaApi(idLinha, tipoDia) {
  const url = `${API_BASE_URL}/linhas/${idLinha}/horarios?tipoDia=${tipoDia}`;
  const resposta = await fetch(url);
  if (!resposta.ok) throw new Error("Falha ao buscar horários na API.");
  return resposta.json();
}

function obterLinhaPorId(id) {
  return LINHAS.find((l) => l.id === id);
}

const SVG_ESTRELA = `
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <polygon points="12,3 14.9,9.3 21.8,10 16.7,14.6 18.2,21.5 12,17.9 5.8,21.5 7.3,14.6 2.2,10 9.1,9.3" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
  </svg>
`;

function criarCardLinha(linha) {
  const favoritada = ehFavorita(linha.id);
  const proximoHorario = linha.proximoHorario || "--:--";

  const item = document.createElement("div");
  item.className = "item-linha";
  item.dataset.id = linha.id;

  item.innerHTML = `
    <div class="item-linha-info">
      <div class="item-numero">${linha.numero}</div>
      <div class="item-texto">
        <h3>${linha.nome}</h3>
        <span>${linha.categoria_servico || ""}</span>
      </div>
    </div>
    <div class="item-linha-acoes">
      <div class="item-proximo-horario">
        <span class="label">Próximo</span>
        <span class="horario">${proximoHorario}</span>
      </div>
      <button class="btn-estrela-card${favoritada ? " favoritado" : ""}" aria-label="Favoritar linha">
        ${SVG_ESTRELA}
      </button>
    </div>
  `;

  item.addEventListener("click", (evento) => {
    if (evento.target.closest(".btn-estrela-card")) {
      evento.stopPropagation();
      alternarFavorito(linha.id);
      return;
    }
    abrirModalLinha(linha.id);
  });

  return item;
}

function renderizarListaLinhas() {
  const container = document.getElementById("lista-linhas");
  const msgVazio = document.getElementById("msg-sem-resultado");
  container.innerHTML = "";

  if (LINHAS.length === 0) {
    msgVazio.classList.remove("oculto");
  } else {
    msgVazio.classList.add("oculto");
    LINHAS.forEach((linha) => container.appendChild(criarCardLinha(linha)));
  }
}

function renderizarFavoritas() {
  const container = document.getElementById("lista-favoritas");
  const msgSemFavoritas = document.getElementById("msg-sem-favoritas");
  const favoritos = obterFavoritos();

  container.innerHTML = "";

  if (favoritos.length === 0) {
    container.appendChild(msgSemFavoritas);
    msgSemFavoritas.classList.remove("oculto");
    return;
  }

  favoritos.forEach((id) => {
    const linha = obterLinhaPorId(id);
    if (linha) container.appendChild(criarCardLinha(linha));
  });
}

function renderizarTelaFavoritos() {
  const container = document.getElementById("lista-favoritos-tela");
  const msgVazio = document.getElementById("msg-favoritos-vazio");
  const favoritos = obterFavoritos();

  container.innerHTML = "";

  if (favoritos.length === 0) {
    msgVazio.classList.remove("oculto");
    return;
  }

  msgVazio.classList.add("oculto");
  favoritos.forEach((id) => {
    const linha = obterLinhaPorId(id);
    if (linha) container.appendChild(criarCardLinha(linha));
  });
}

async function renderizarTudo() {
  const termo = document.getElementById("input-busca").value;
  try {
    LINHAS = await buscarLinhasNaApi(termo);
  } catch (erro) {
    console.error(erro);
    LINHAS = [];
  }
  renderizarListaLinhas();
  renderizarFavoritas();
  renderizarTelaFavoritos();
}

async function abrirModalLinha(idLinha) {
  const linha = obterLinhaPorId(idLinha);
  if (!linha) return;

  linhaSelecionadaId = idLinha;
  tipoDiaSelecionado = "util";
  pontoSelecionado = null;

  document.getElementById("modal-numero-linha").textContent = linha.numero;
  document.getElementById("modal-titulo-linha").textContent = linha.nome;
  document.getElementById("modal-sentido-texto").textContent =
    linha.categoria_servico || "";

  document.querySelectorAll(".tipo-dia-btn").forEach((btn) => {
    btn.classList.toggle("ativo", btn.dataset.tipo === "util");
  });

  atualizarFavoritoModal();
  await carregarPontosERenderizar();

  document.getElementById("modal-overlay").classList.remove("oculto");
}

function fecharModalLinha() {
  document.getElementById("modal-overlay").classList.add("oculto");
  linhaSelecionadaId = null;
}

function atualizarFavoritoModal() {
  const favoritado = ehFavorita(linhaSelecionadaId);
  const botao = document.getElementById("btn-favoritar-modal");
  const texto = document.getElementById("texto-favoritar-modal");

  botao.classList.toggle("favoritado", favoritado);
  texto.textContent = favoritado ? "Linha favoritada" : "Favoritar linha";
}

async function carregarPontosERenderizar() {
  const container = document.getElementById("lista-horarios-modal");
  container.innerHTML = `<p class="mensagem-vazia">Carregando horários...</p>`;

  try {
    const resultado = await buscarHorariosNaApi(
      linhaSelecionadaId,
      tipoDiaSelecionado
    );
    pontosLinhaAtual = resultado.pontos || [];
  } catch (erro) {
    console.error(erro);
    pontosLinhaAtual = [];
  }

  if (pontosLinhaAtual.length === 0) {
    document.getElementById("seletor-ponto-wrapper").classList.add("oculto");
    container.innerHTML = `<p class="mensagem-vazia">Esta linha não opera nesse tipo de dia.</p>`;
    return;
  }

  if (!pontosLinhaAtual.some((p) => p.nome === pontoSelecionado)) {
    pontoSelecionado = pontosLinhaAtual[0].nome;
  }

  renderizarSeletorDePontos();
  renderizarHorariosDoPontoSelecionado();
}

function renderizarSeletorDePontos() {
  const wrapper = document.getElementById("seletor-ponto-wrapper");
  const select = document.getElementById("seletor-ponto");
  wrapper.classList.remove("oculto");

  select.innerHTML = pontosLinhaAtual
    .map((p) => `<option value="${p.nome}">${p.nome}</option>`)
    .join("");
  select.value = pontoSelecionado;
}

function renderizarHorariosDoPontoSelecionado() {
  const container = document.getElementById("lista-horarios-modal");
  container.innerHTML = "";

  const ponto = pontosLinhaAtual.find((p) => p.nome === pontoSelecionado);
  const horarios = ponto ? ponto.horarios : [];

  if (horarios.length === 0) {
    container.innerHTML = `<p class="mensagem-vazia">Nenhum horário encontrado para este ponto.</p>`;
    return;
  }

  horarios.forEach((h, index) => {
    const ehProximo = index === 0;
    const item = document.createElement("div");
    item.className = "horario-item" + (ehProximo ? " proximo" : "");
    item.innerHTML = `
      <span class="horario-valor">${h.hora}${h.adapt === false ? " ♿︎✕" : ""}</span>
      ${ehProximo ? '<span class="selo-proximo">Próximo</span>' : ""}
    `;
    container.appendChild(item);
  });
}

function irParaTela(idTela) {
  document.querySelectorAll(".tela").forEach((tela) => {
    tela.classList.toggle("ativa", tela.id === idTela);
  });
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.toggle("ativo", item.dataset.tela === idTela);
  });
  renderizarTudo();
}

document.addEventListener("DOMContentLoaded", () => {
  renderizarTudo();

  const inputBusca = document.getElementById("input-busca");
  let debounceBusca = null;
  inputBusca.addEventListener("input", () => {
    clearTimeout(debounceBusca);
    debounceBusca = setTimeout(() => renderizarTudo(), 300);
  });

  document.getElementById("btn-buscar").addEventListener("click", () => {
    renderizarTudo();
    inputBusca.blur();
  });

  document
    .getElementById("btn-fechar-modal")
    .addEventListener("click", fecharModalLinha);

  document.getElementById("modal-overlay").addEventListener("click", (e) => {
    if (e.target.id === "modal-overlay") fecharModalLinha();
  });

  document
    .getElementById("btn-favoritar-modal")
    .addEventListener("click", () => {
      if (linhaSelecionadaId) alternarFavorito(linhaSelecionadaId);
      atualizarFavoritoModal();
    });

  document.querySelectorAll(".tipo-dia-btn").forEach((botao) => {
    botao.addEventListener("click", () => {
      tipoDiaSelecionado = botao.dataset.tipo;
      document
        .querySelectorAll(".tipo-dia-btn")
        .forEach((b) => b.classList.remove("ativo"));
      botao.classList.add("ativo");
      carregarPontosERenderizar();
    });
  });

  document
    .getElementById("seletor-ponto")
    .addEventListener("change", (evento) => {
      pontoSelecionado = evento.target.value;
      renderizarHorariosDoPontoSelecionado();
    });

  document.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", () => irParaTela(item.dataset.tela));
  });

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("service-worker.js")
        .then(() => console.log("Service Worker registrado com sucesso."))
        .catch((erro) =>
          console.log("Erro ao registrar Service Worker:", erro)
        );
    });
  }
});
