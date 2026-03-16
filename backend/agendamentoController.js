const pool = require("./db");

function parseDateTime(data, hora) {
  const [year, month, day] = data.split("-").map(Number);
  const [hour, minute] = hora.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

/** Normaliza servicos: aceita string ou array e retorna string para o banco. */
function normalizarServicos(servicos) {
  if (Array.isArray(servicos)) return servicos.join(", ");
  if (typeof servicos === "string") return servicos.trim();
  return "";
}

async function validarAgendamento({ id, data, hora, barbeiro }) {
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

exports.criarAgendamento = async (req, res) => {
  try {
    let {
      nome,
      telefone,
      data,
      hora,
      servicos,
      barbeiro,
    } = req.body;

    nome = typeof nome === "string" ? nome.trim() : "";
    servicos = normalizarServicos(servicos);
    barbeiro = typeof barbeiro === "string" ? barbeiro.trim() : "";
    data = typeof data === "string" ? data.trim() : "";
    hora = typeof hora === "string" ? hora.trim() : "";

    if (!nome || !data || !hora || !servicos || !barbeiro) {
      return res.status(400).json({
        mensagem: "Campos obrigatórios: nome, data, hora, servicos, barbeiro",
      });
    }

    const agora = new Date();
    const dataHora = parseDateTime(data, hora);

    if (dataHora < agora) {
      return res
        .status(400)
        .json({ mensagem: "Não é permitido agendar para data/horário no passado." });
    }

    const livre = await validarAgendamento({ data, hora, barbeiro });

    if (!livre) {
      return res
        .status(400)
        .json({ mensagem: "Já existe um agendamento para esse barbeiro nesse dia e horário." });
    }

    const sql = `
      INSERT INTO agendamentos
        (nome, telefone, data, hora, servicos, barbeiro)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const [result] = await pool.query(sql, [
      nome,
      (telefone && typeof telefone === "string" ? telefone.trim() : null) || null,
      data,
      hora,
      servicos,
      barbeiro,
    ]);

    res.status(201).json({
      id: result.insertId,
      nome,
      telefone,
      data,
      hora,
      servicos,
      barbeiro,
    });
  } catch (err) {
    console.error("Erro ao criar agendamento:", err);
    res.status(500).json({ mensagem: "Erro ao criar agendamento." });
  }
};

exports.listarAgendamentos = async (req, res) => {
  try {
    const { data, barbeiro } = req.query;
    let sql = "SELECT id, nome, telefone, data, hora, status, servicos, barbeiro, criado_em FROM agendamentos";
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
    res.json(rows);
  } catch (err) {
    console.error("Erro ao listar agendamentos:", err);
    res.status(500).json({ mensagem: "Erro ao listar agendamentos." });
  }
};

exports.atualizarAgendamento = async (req, res) => {
  try {
    const { id } = req.params;
    let {
      nome,
      telefone,
      data,
      hora,
      servicos,
      barbeiro,
    } = req.body;

    nome = typeof nome === "string" ? nome.trim() : "";
    servicos = normalizarServicos(servicos);
    barbeiro = typeof barbeiro === "string" ? barbeiro.trim() : "";
    data = typeof data === "string" ? data.trim() : "";
    hora = typeof hora === "string" ? hora.trim() : "";

    if (!nome || !data || !hora || !servicos || !barbeiro) {
      return res.status(400).json({
        mensagem: "Campos obrigatórios: nome, data, hora, servicos, barbeiro",
      });
    }

    const agora = new Date();
    const dataHora = parseDateTime(data, hora);

    if (dataHora < agora) {
      return res
        .status(400)
        .json({ mensagem: "Não é permitido reagendar para data/horário no passado." });
    }

    const livre = await validarAgendamento({ id, data, hora, barbeiro });

    if (!livre) {
      return res
        .status(400)
        .json({ mensagem: "Já existe um agendamento para esse barbeiro nesse dia e horário." });
    }

    const sql = `
      UPDATE agendamentos
      SET nome = ?, telefone = ?, data = ?, hora = ?, servicos = ?, barbeiro = ?
      WHERE id = ?
    `;

    const [result] = await pool.query(sql, [
      nome,
      (telefone && typeof telefone === "string" ? telefone.trim() : null) || null,
      data,
      hora,
      servicos,
      barbeiro,
      id,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ mensagem: "Agendamento não encontrado." });
    }

    res.json({
      id: Number(id),
      nome,
      telefone,
      data,
      hora,
      servicos,
      barbeiro,
    });
  } catch (err) {
    console.error("Erro ao atualizar agendamento:", err);
    res.status(500).json({ mensagem: "Erro ao atualizar agendamento." });
  }
};

exports.removerAgendamento = async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await pool.query("DELETE FROM agendamentos WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ mensagem: "Agendamento não encontrado." });
    }

    res.status(200).json({ mensagem: "Agendamento excluído com sucesso." });
  } catch (error) {
    console.error("Erro ao excluir agendamento:", error);
    res.status(500).json({ mensagem: "Erro ao excluir agendamento." });
  }
};

exports.confirmarAgendamento = async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await pool.query(
      "UPDATE agendamentos SET status = 'concluido' WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ mensagem: "Agendamento não encontrado." });
    }

    res.status(200).json({ mensagem: "Agendamento marcado como concluído." });
  } catch (error) {
    console.error("Erro ao confirmar agendamento:", error);
    res.status(500).json({ mensagem: "Erro ao confirmar agendamento." });
  }
};

exports.buscarHorariosOcupados = async (req, res) => {
  try {
    const { data, barbeiro } = req.query;

    if (!data || !barbeiro) {
      return res
        .status(400)
        .json({ mensagem: "Parâmetros obrigatórios: data, barbeiro." });
    }

    const [rows] = await pool.query(
      "SELECT hora FROM agendamentos WHERE data = ? AND barbeiro = ? ORDER BY hora ASC",
      [data, barbeiro]
    );

    res.json(rows);
  } catch (err) {
    console.error("Erro ao buscar horários ocupados:", err);
    res.status(500).json({ mensagem: "Erro ao buscar horários ocupados." });
  }
};

