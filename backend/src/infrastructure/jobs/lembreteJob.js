const repo = require("../persistence/agendamentoRepository");
const whatsapp = require("../whatsapp/evolutionWhatsApp");
const { loadEnv } = require("../config/env");

const INTERVAL_MS = 5 * 60 * 1000;
const WINDOW_HALF_MS = 10 * 60 * 1000;

let timer = null;
let running = false;

function horasAntes() {
  const n = loadEnv().lembreteHorasAntes;
  return Number.isFinite(n) && n > 0 ? n : 2;
}

function janelaLembrete(now = new Date()) {
  const offsetMs = horasAntes() * 60 * 60 * 1000;
  const target = new Date(now.getTime() + offsetMs);
  return {
    inicio: new Date(target.getTime() - WINDOW_HALF_MS),
    fim: new Date(target.getTime() + WINDOW_HALF_MS),
  };
}

async function processarLembretes() {
  if (running) return;
  if (!whatsapp.isConfigured()) return;

  running = true;
  try {
    const { inicio, fim } = janelaLembrete();
    const lista = await repo.listarParaLembrete({ inicio, fim });

    if (!lista.length) return;

    console.log(`[Lembrete] ${lista.length} agendamento(s) na janela.`);

    for (const ag of lista) {
      const result = await whatsapp.enviarLembrete(ag);
      if (result.ok) {
        await repo.marcarLembreteEnviado(ag.id);
        console.log(`[Lembrete] Enviado #${ag.id} → ${ag.nome}`);
      } else if (!result.skipped) {
        console.warn(`[Lembrete] Falha #${ag.id}: ${result.error}`);
      }
    }
  } catch (err) {
    console.error("[Lembrete] Erro no job:", err.message || err);
  } finally {
    running = false;
  }
}

function startLembreteJob() {
  if (timer) return;

  if (!whatsapp.isConfigured()) {
    console.log(
      "[Lembrete] Evolution API não configurada — lembretes automáticos desligados (use o botão do painel)."
    );
    return;
  }

  console.log(
    `[Lembrete] Job ativo: envia ~${horasAntes()}h antes (checagem a cada 5 min).`
  );

  // Primeira passagem após 15s (dá tempo do server estabilizar)
  setTimeout(() => {
    processarLembretes();
  }, 15_000);

  timer = setInterval(processarLembretes, INTERVAL_MS);
  if (typeof timer.unref === "function") timer.unref();
}

function stopLembreteJob() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

module.exports = {
  startLembreteJob,
  stopLembreteJob,
  processarLembretes,
  janelaLembrete,
};
