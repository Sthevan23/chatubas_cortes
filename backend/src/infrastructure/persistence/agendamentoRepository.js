const { pool, queries } = require("../../../database");
const jsonStore = require("./jsonStore");
const { calcularValor } = require("../../domain/pricing");

const sql = queries.agendamentos;

let mode = process.env.STORAGE === "json" ? "json" : "mysql";
let initialized = false;

async function initStorage() {
  if (initialized) return mode;

  if (mode === "json") {
    jsonStore.seedDemoIfEmpty();
    initialized = true;
    return mode;
  }

  try {
    await pool.query(sql.PING);
    await ensureLembreteColumn();
    initialized = true;
    return mode;
  } catch (err) {
    console.warn(
      "[Storage] MySQL indisponível — usando arquivo local (backend/data/agendamentos.json)."
    );
    mode = "json";
    jsonStore.seedDemoIfEmpty();
    initialized = true;
    return mode;
  }
}

async function ensureLembreteColumn() {
  try {
    const [cols] = await pool.query(sql.HAS_LEMBRETE_COLUMN);
    if (cols.length === 0) {
      await pool.query(sql.ADD_LEMBRETE_COLUMN);
      console.log("[Storage] Coluna lembrete_enviado_em adicionada.");
    }
  } catch (err) {
    console.warn("[Storage] Não foi possível garantir coluna lembrete_enviado_em:", err.message);
  }
}

function getMode() {
  return mode;
}

async function listar(filters = {}) {
  if (mode === "json") {
    return jsonStore.listar(filters);
  }

  const { sql: query, params } = sql.listar(filters);
  const [rows] = await pool.query(query, params);
  return rows;
}

async function slotLivre(opts) {
  if (mode === "json") {
    const rows = jsonStore.listar({ data: opts.data, barbeiro: opts.barbeiro });
    return !rows.some(
      (row) =>
        String(row.hora).slice(0, 5) === String(opts.hora).slice(0, 5) &&
        row.barbeiro === opts.barbeiro &&
        (!opts.id || Number(row.id) !== Number(opts.id))
    );
  }

  const { sql: query, params } = sql.countSlot(opts);
  const [rows] = await pool.query(query, params);
  return rows[0].total === 0;
}

async function criar(payload) {
  if (mode === "json") {
    return jsonStore.criar(payload);
  }

  const [result] = await pool.query(sql.INSERIR, [
    payload.nome,
    payload.telefone,
    payload.data,
    payload.hora,
    payload.servicos,
    payload.barbeiro,
    payload.forma_pagamento || "",
    payload.valor_total || 0,
  ]);

  return {
    id: result.insertId,
    ...payload,
    status: "pendente",
  };
}

async function atualizar(id, payload) {
  if (mode === "json") {
    return jsonStore.atualizar(id, payload);
  }

  const [result] = await pool.query(sql.ATUALIZAR, [
    payload.nome,
    payload.telefone,
    payload.data,
    payload.hora,
    payload.servicos,
    payload.barbeiro,
    payload.forma_pagamento || "",
    payload.valor_total || 0,
    id,
  ]);

  if (result.affectedRows === 0) {
    const err = new Error("NOT_FOUND");
    err.code = "NOT_FOUND";
    throw err;
  }

  return { id: Number(id), ...payload };
}

async function remover(id) {
  if (mode === "json") {
    return jsonStore.remover(id);
  }

  const [result] = await pool.query(sql.REMOVER, [id]);
  if (result.affectedRows === 0) {
    const err = new Error("NOT_FOUND");
    err.code = "NOT_FOUND";
    throw err;
  }
}

async function confirmar(id) {
  if (mode === "json") {
    return jsonStore.confirmar(id);
  }

  const row = await exports.buscarPorId(id);
  if (!row) {
    const err = new Error("NOT_FOUND");
    err.code = "NOT_FOUND";
    throw err;
  }

  const valor = calcularValor(row.servicos);
  const [result] = await pool.query(sql.CONFIRMAR, [valor, id]);

  if (result.affectedRows === 0) {
    const err = new Error("NOT_FOUND");
    err.code = "NOT_FOUND";
    throw err;
  }

  return { ...row, status: "concluido", valor_total: valor };
}

async function horariosOcupados({ data, barbeiro }) {
  if (mode === "json") {
    return jsonStore.horariosOcupados({ data, barbeiro });
  }

  const [rows] = await pool.query(sql.HORARIOS_OCUPADOS, [data, barbeiro]);
  return rows;
}

function toMysqlDateTime(date) {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  return `${y}-${m}-${day} ${h}:${min}:${s}`;
}

async function listarParaLembrete({ inicio, fim }) {
  if (mode === "json") {
    return jsonStore.listarParaLembrete({ inicio, fim });
  }

  const [rows] = await pool.query(sql.LISTAR_PARA_LEMBRETE, [
    toMysqlDateTime(inicio),
    toMysqlDateTime(fim),
  ]);
  return rows;
}

async function marcarLembreteEnviado(id) {
  if (mode === "json") {
    return jsonStore.marcarLembreteEnviado(id);
  }

  const [result] = await pool.query(sql.MARCAR_LEMBRETE, [id]);

  if (result.affectedRows === 0) {
    const err = new Error("NOT_FOUND");
    err.code = "NOT_FOUND";
    throw err;
  }

  return exports.buscarPorId(id);
}

module.exports = {
  initStorage,
  getMode,
  listar,
  slotLivre,
  criar,
  atualizar,
  remover,
  confirmar,
  horariosOcupados,
  listarParaLembrete,
  marcarLembreteEnviado,
  listarConcluidos: async (opts) => {
    if (mode === "json") return jsonStore.listarConcluidos(opts);
    const { sql: query, params } = sql.listarConcluidos(opts);
    const [rows] = await pool.query(query, params);
    return rows;
  },
  buscarPorId: async (id) => {
    if (mode === "json") return jsonStore.buscarPorId(id);
    const [rows] = await pool.query(sql.BUSCAR_POR_ID, [id]);
    return rows[0] || null;
  },
};
