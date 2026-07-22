/**
 * Queries SQL — agendamentos
 * Todas as strings SQL ficam neste módulo (não no repository).
 */

const PING = "SELECT 1";

const HAS_LEMBRETE_COLUMN = `
  SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'agendamentos'
    AND COLUMN_NAME = 'lembrete_enviado_em'
`;

const ADD_LEMBRETE_COLUMN =
  "ALTER TABLE agendamentos ADD COLUMN lembrete_enviado_em DATETIME NULL AFTER concluido_em";

const LISTAR_BASE =
  "SELECT id, nome, telefone, data, hora, status, servicos, barbeiro, forma_pagamento, valor_total, criado_em, lembrete_enviado_em FROM agendamentos";

function listar({ data, barbeiro } = {}) {
  let sql = LISTAR_BASE;
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
  return { sql, params };
}

function countSlot({ id, data, hora, barbeiro }) {
  const sql = `
    SELECT COUNT(*) AS total
    FROM agendamentos
    WHERE data = ? AND hora = ? AND barbeiro = ?
    ${id ? "AND id <> ?" : ""}
  `;
  const params = id ? [data, hora, barbeiro, id] : [data, hora, barbeiro];
  return { sql, params };
}

const INSERIR = `
  INSERT INTO agendamentos
    (nome, telefone, data, hora, servicos, barbeiro, forma_pagamento, valor_total)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`;

const ATUALIZAR = `
  UPDATE agendamentos
  SET nome = ?, telefone = ?, data = ?, hora = ?, servicos = ?, barbeiro = ?,
      forma_pagamento = ?, valor_total = ?
  WHERE id = ?
`;

const REMOVER = "DELETE FROM agendamentos WHERE id = ?";

const CONFIRMAR =
  "UPDATE agendamentos SET status = 'concluido', valor_total = ?, concluido_em = NOW() WHERE id = ?";

const HORARIOS_OCUPADOS =
  "SELECT hora FROM agendamentos WHERE data = ? AND barbeiro = ? ORDER BY hora ASC";

const LISTAR_PARA_LEMBRETE = `
  SELECT id, nome, telefone, data, hora, status, servicos, barbeiro, forma_pagamento, valor_total, lembrete_enviado_em
  FROM agendamentos
  WHERE status = 'pendente'
    AND lembrete_enviado_em IS NULL
    AND telefone IS NOT NULL
    AND telefone <> ''
    AND TIMESTAMP(data, hora) BETWEEN ? AND ?
  ORDER BY data ASC, hora ASC
`;

const MARCAR_LEMBRETE =
  "UPDATE agendamentos SET lembrete_enviado_em = NOW() WHERE id = ?";

const BUSCAR_POR_ID = `
  SELECT id, nome, telefone, data, hora, servicos, barbeiro, forma_pagamento, valor_total, status, lembrete_enviado_em
  FROM agendamentos
  WHERE id = ?
`;

const LISTAR_CONCLUIDOS_BASE = `
  SELECT id, nome, data, hora, servicos, barbeiro, forma_pagamento, valor_total, status, concluido_em, lembrete_enviado_em
  FROM agendamentos
  WHERE status = 'concluido'
`;

function listarConcluidos({ barbeiro } = {}) {
  let sql = LISTAR_CONCLUIDOS_BASE;
  const params = [];
  if (barbeiro) {
    sql += " AND barbeiro = ?";
    params.push(barbeiro);
  }
  sql += " ORDER BY data DESC, hora DESC";
  return { sql, params };
}

module.exports = {
  PING,
  HAS_LEMBRETE_COLUMN,
  ADD_LEMBRETE_COLUMN,
  listar,
  countSlot,
  INSERIR,
  ATUALIZAR,
  REMOVER,
  CONFIRMAR,
  HORARIOS_OCUPADOS,
  LISTAR_PARA_LEMBRETE,
  MARCAR_LEMBRETE,
  BUSCAR_POR_ID,
  listarConcluidos,
};
