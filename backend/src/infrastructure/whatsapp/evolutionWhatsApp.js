/**
 * Envio de WhatsApp via Evolution API.
 * Sem EVOLUTION_* no .env, isConfigured() retorna false e o job só pula.
 */

function capitalizeName(name = "") {
  return String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function formatDateBR(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = String(dateStr).slice(0, 10).split("-");
  if (!y || !m || !d) return dateStr;
  return `${d}/${m}/${y}`;
}

function normalizePhone(telefone) {
  let digits = String(telefone || "").replace(/\D/g, "");
  if (!digits) return "";
  // BR: se vier com 10/11 dígitos (DDD+número), prefixa 55
  if (digits.length >= 10 && digits.length <= 11) {
    digits = `55${digits}`;
  }
  return digits;
}

function isConfigured() {
  return Boolean(
    process.env.EVOLUTION_API_URL &&
      process.env.EVOLUTION_INSTANCE &&
      process.env.EVOLUTION_API_KEY
  );
}

function buildLembreteText(agendamento) {
  const nome = capitalizeName(agendamento.nome);
  const data = formatDateBR(agendamento.data);
  const hora = String(agendamento.hora || "").slice(0, 5);
  const servicos = agendamento.servicos || "";
  const barbeiro = agendamento.barbeiro || "";
  const pagamento = agendamento.forma_pagamento
    ? `\n💳 ${agendamento.forma_pagamento}`
    : "";

  return (
    `Olá ${nome}! Passando para confirmar seu horário na Chatubas Cortes:\n\n` +
    `📅 ${data}\n` +
    `🕐 ${hora}\n` +
    `✂️ ${servicos}\n` +
    `💈 ${barbeiro}${pagamento}\n\n` +
    `Te esperamos! Se precisar remarcar, responda esta mensagem.`
  );
}

/**
 * Envia texto via Evolution API (POST /message/sendText/{instance}).
 * @returns {{ ok: boolean, skipped?: boolean, error?: string }}
 */
async function enviarTexto(telefone, text) {
  if (!isConfigured()) {
    return { ok: false, skipped: true, error: "Evolution API não configurada" };
  }

  const number = normalizePhone(telefone);
  if (!number) {
    return { ok: false, error: "Telefone inválido" };
  }

  const base = String(process.env.EVOLUTION_API_URL).replace(/\/$/, "");
  const instance = process.env.EVOLUTION_INSTANCE;
  const url = `${base}/message/sendText/${encodeURIComponent(instance)}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: process.env.EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        number,
        text,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return {
        ok: false,
        error: `Evolution HTTP ${res.status}: ${body.slice(0, 200)}`,
      };
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message || "Falha ao chamar Evolution API" };
  }
}

async function enviarLembrete(agendamento) {
  const text = buildLembreteText(agendamento);
  return enviarTexto(agendamento.telefone, text);
}

module.exports = {
  isConfigured,
  buildLembreteText,
  normalizePhone,
  enviarTexto,
  enviarLembrete,
};
