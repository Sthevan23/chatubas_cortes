const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "..", "..", "data");
const DATA_FILE = path.join(DATA_DIR, "agendamentos.json");

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, "[]", "utf8");
  }
}

function readAll() {
  ensureFile();
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writeAll(rows) {
  ensureFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(rows, null, 2), "utf8");
}

function nextId(rows) {
  return rows.reduce((max, row) => Math.max(max, Number(row.id) || 0), 0) + 1;
}

const { calcularValor } = require("../../domain/pricing");

function normalizeRow(row) {
  const servicos = row.servicos || "";
  return {
    id: row.id,
    nome: row.nome,
    telefone: row.telefone || "",
    data: row.data,
    hora: row.hora,
    servicos,
    barbeiro: row.barbeiro,
    forma_pagamento: row.forma_pagamento || "",
    valor_total: Number(row.valor_total ?? calcularValor(servicos)),
    status: row.status || "pendente",
    criado_em: row.criado_em || new Date().toISOString(),
    concluido_em: row.concluido_em || null,
    lembrete_enviado_em: row.lembrete_enviado_em || null,
  };
}

function sortRows(rows) {
  return [...rows].sort((a, b) => {
    if (a.data !== b.data) return a.data.localeCompare(b.data);
    return String(a.hora).localeCompare(String(b.hora));
  });
}

function matchesFilters(row, { data, barbeiro }) {
  if (data && row.data !== data) return false;
  if (barbeiro && row.barbeiro !== barbeiro) return false;
  return true;
}

function isSlotTaken(rows, { data, hora, barbeiro, id }) {
  return rows.some(
    (row) =>
      row.data === data &&
      String(row.hora).slice(0, 5) === String(hora).slice(0, 5) &&
      row.barbeiro === barbeiro &&
      (!id || Number(row.id) !== Number(id))
  );
}

exports.listar = ({ data, barbeiro } = {}) => {
  const rows = readAll().map(normalizeRow);
  return sortRows(rows.filter((row) => matchesFilters(row, { data, barbeiro })));
};

exports.criar = (payload) => {
  const rows = readAll();
  if (isSlotTaken(rows, payload)) {
    const err = new Error("SLOT_TAKEN");
    err.code = "SLOT_TAKEN";
    throw err;
  }

  const row = normalizeRow({
    id: nextId(rows),
    ...payload,
    status: "pendente",
    criado_em: new Date().toISOString(),
  });

  rows.push(row);
  writeAll(rows);
  return row;
};

exports.atualizar = (id, payload) => {
  const rows = readAll();
  const index = rows.findIndex((row) => Number(row.id) === Number(id));

  if (index === -1) {
    const err = new Error("NOT_FOUND");
    err.code = "NOT_FOUND";
    throw err;
  }

  if (isSlotTaken(rows, { ...payload, id })) {
    const err = new Error("SLOT_TAKEN");
    err.code = "SLOT_TAKEN";
    throw err;
  }

  const updated = normalizeRow({
    ...rows[index],
    ...payload,
    id: Number(id),
  });

  rows[index] = updated;
  writeAll(rows);
  return updated;
};

exports.remover = (id) => {
  const rows = readAll();
  const next = rows.filter((row) => Number(row.id) !== Number(id));

  if (next.length === rows.length) {
    const err = new Error("NOT_FOUND");
    err.code = "NOT_FOUND";
    throw err;
  }

  writeAll(next);
  return true;
};

exports.confirmar = (id) => {
  const rows = readAll();
  const index = rows.findIndex((row) => Number(row.id) === Number(id));

  if (index === -1) {
    const err = new Error("NOT_FOUND");
    err.code = "NOT_FOUND";
    throw err;
  }

  rows[index] = normalizeRow({
    ...rows[index],
    status: "concluido",
    valor_total: calcularValor(rows[index].servicos),
    concluido_em: new Date().toISOString(),
  });

  writeAll(rows);
  return rows[index];
};

exports.listarConcluidos = ({ barbeiro } = {}) => {
  return readAll()
    .map(normalizeRow)
    .filter((row) => row.status === "concluido" && (!barbeiro || row.barbeiro === barbeiro))
    .sort((a, b) => {
      if (a.data !== b.data) return b.data.localeCompare(a.data);
      return String(b.hora).localeCompare(String(a.hora));
    });
};

exports.buscarPorId = (id) => {
  const row = readAll().find((r) => Number(r.id) === Number(id));
  return row ? normalizeRow(row) : null;
};

exports.horariosOcupados = ({ data, barbeiro }) => {
  return readAll()
    .filter((row) => row.data === data && row.barbeiro === barbeiro)
    .map((row) => ({ hora: row.hora }))
    .sort((a, b) => String(a.hora).localeCompare(String(b.hora)));
};

function appointmentDateTime(row) {
  const hora = String(row.hora || "00:00").slice(0, 5);
  return new Date(`${row.data}T${hora}:00`);
}

/** Agendamentos pendentes na janela [inicio, fim] ainda sem lembrete. */
exports.listarParaLembrete = ({ inicio, fim }) => {
  const start = inicio instanceof Date ? inicio : new Date(inicio);
  const end = fim instanceof Date ? fim : new Date(fim);

  return readAll()
    .map(normalizeRow)
    .filter((row) => {
      if (row.status !== "pendente") return false;
      if (row.lembrete_enviado_em) return false;
      if (!row.telefone) return false;
      const when = appointmentDateTime(row);
      return when >= start && when <= end;
    });
};

exports.marcarLembreteEnviado = (id) => {
  const rows = readAll();
  const index = rows.findIndex((row) => Number(row.id) === Number(id));

  if (index === -1) {
    const err = new Error("NOT_FOUND");
    err.code = "NOT_FOUND";
    throw err;
  }

  rows[index] = normalizeRow({
    ...rows[index],
    lembrete_enviado_em: new Date().toISOString(),
  });

  writeAll(rows);
  return rows[index];
};

function localDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

exports.seedDemoIfEmpty = () => {
  const rows = readAll();
  if (rows.length > 0) return;

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = localDateStr(tomorrow);

  writeAll([
    normalizeRow({
      id: 1,
      nome: "Carlos Mendes",
      telefone: "(37) 99999-1234",
      data: dateStr,
      hora: "09:00:00",
      servicos: "Corte, Barba",
      barbeiro: "Ricardo",
      forma_pagamento: "Pix",
      status: "pendente",
    }),
    normalizeRow({
      id: 2,
      nome: "Pedro Alves",
      telefone: "(37) 98888-5678",
      data: dateStr,
      hora: "14:00:00",
      servicos: "Corte",
      barbeiro: "Marcos",
      forma_pagamento: "Dinheiro",
      status: "pendente",
    }),
  ]);
};
