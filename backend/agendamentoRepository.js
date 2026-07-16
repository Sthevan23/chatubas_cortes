const pool = require("./db");
const jsonStore = require("./jsonStore");

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
    await pool.query("SELECT 1");
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

function getMode() {
  return mode;
}

async function listar({ data, barbeiro } = {}) {
  if (mode === "json") {
    return jsonStore.listar({ data, barbeiro });
  }

  let sql =
    "SELECT id, nome, telefone, data, hora, status, servicos, barbeiro, forma_pagamento, valor_total, criado_em FROM agendamentos";
  const params = [];
  const conditions = [];

  if (data) {
    conditions.push("data = ?");
    params.push(data);
  }
  if (barbeiro) {
    conditions.push("barbeiro = ?");
    params.push(barbeiro);
  }

  if (conditions.length > 0) {
    sql += " WHERE " + conditions.join(" AND ");
  }

  sql += " ORDER BY data ASC, hora ASC";
  const [rows] = await pool.query(sql, params);
  return rows;
}

async function slotLivre({ id, data, hora, barbeiro }) {
  if (mode === "json") {
    const rows = jsonStore.listar({ data, barbeiro });
    return !rows.some(
      (row) =>
        String(row.hora).slice(0, 5) === String(hora).slice(0, 5) &&
        row.barbeiro === barbeiro &&
        (!id || Number(row.id) !== Number(id))
    );
  }

  const sql = `
    SELECT COUNT(*) AS total
    FROM agendamentos
    WHERE data = ? AND hora = ? AND barbeiro = ?
    ${id ? "AND id <> ?" : ""}
  `;
  const params = id ? [data, hora, barbeiro, id] : [data, hora, barbeiro];
  const [rows] = await pool.query(sql, params);
  return rows[0].total === 0;
}

async function criar(payload) {
  if (mode === "json") {
    return jsonStore.criar(payload);
  }

  const sql = `
    INSERT INTO agendamentos
      (nome, telefone, data, hora, servicos, barbeiro, forma_pagamento, valor_total)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const [result] = await pool.query(sql, [
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

  const sql = `
    UPDATE agendamentos
    SET nome = ?, telefone = ?, data = ?, hora = ?, servicos = ?, barbeiro = ?,
        forma_pagamento = ?, valor_total = ?
    WHERE id = ?
  `;

  const [result] = await pool.query(sql, [
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

  const [result] = await pool.query("DELETE FROM agendamentos WHERE id = ?", [id]);
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

  const { calcularValor } = require("./servicos");
  const row = await exports.buscarPorId(id);
  if (!row) {
    const err = new Error("NOT_FOUND");
    err.code = "NOT_FOUND";
    throw err;
  }

  const valor = calcularValor(row.servicos);
  const [result] = await pool.query(
    "UPDATE agendamentos SET status = 'concluido', valor_total = ?, concluido_em = NOW() WHERE id = ?",
    [valor, id]
  );

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

  const [rows] = await pool.query(
    "SELECT hora FROM agendamentos WHERE data = ? AND barbeiro = ? ORDER BY hora ASC",
    [data, barbeiro]
  );
  return rows;
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
  listarConcluidos: async (opts) =>
    mode === "json"
      ? jsonStore.listarConcluidos(opts)
      : (async () => {
          let sql =
            "SELECT id, nome, data, hora, servicos, barbeiro, forma_pagamento, valor_total, status, concluido_em FROM agendamentos WHERE status = 'concluido'";
          const params = [];
          if (opts.barbeiro) {
            sql += " AND barbeiro = ?";
            params.push(opts.barbeiro);
          }
          sql += " ORDER BY data DESC, hora DESC";
          const [rows] = await pool.query(sql, params);
          return rows;
        })(),
  buscarPorId: async (id) =>
    mode === "json" ? jsonStore.buscarPorId(id) : (async () => {
      const [rows] = await pool.query(
        "SELECT id, nome, telefone, data, hora, servicos, barbeiro, forma_pagamento, valor_total, status FROM agendamentos WHERE id = ?",
        [id]
      );
      return rows[0] || null;
    })(),
};
