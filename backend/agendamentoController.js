const repo = require("./agendamentoRepository");
const { calcularValor, FORMAS_PAGAMENTO } = require("./servicos");
const { assertOwnership } = require("./auth");

function parseDateTime(data, hora) {
  const [year, month, day] = data.split("-").map(Number);
  const [hour, minute] = hora.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

function normalizarServicos(servicos) {
  if (Array.isArray(servicos)) return servicos.join(", ");
  if (typeof servicos === "string") return servicos.trim();
  return "";
}

exports.criarAgendamento = async (req, res) => {
  try {
    let { nome, telefone, data, hora, servicos, barbeiro, forma_pagamento } = req.body;

    nome = typeof nome === "string" ? nome.trim() : "";
    servicos = normalizarServicos(servicos);
    barbeiro = typeof barbeiro === "string" ? barbeiro.trim() : "";
    data = typeof data === "string" ? data.trim() : "";
    hora = typeof hora === "string" ? hora.trim() : "";
    forma_pagamento = typeof forma_pagamento === "string" ? forma_pagamento.trim() : "";

    if (!nome || !data || !hora || !servicos || !barbeiro || !forma_pagamento) {
      return res.status(400).json({
        mensagem: "Campos obrigatórios: nome, data, hora, servicos, barbeiro, forma_pagamento",
      });
    }

    if (!FORMAS_PAGAMENTO.includes(forma_pagamento)) {
      return res.status(400).json({ mensagem: "Forma de pagamento inválida." });
    }

    const agora = new Date();
    const dataHora = parseDateTime(data, hora);

    if (dataHora < agora) {
      return res
        .status(400)
        .json({ mensagem: "Não é permitido agendar para data/horário no passado." });
    }

    const livre = await repo.slotLivre({ data, hora, barbeiro });

    if (!livre) {
      return res
        .status(400)
        .json({ mensagem: "Já existe um agendamento para esse barbeiro nesse dia e horário." });
    }

    const valor_total = calcularValor(servicos);

    const created = await repo.criar({
      nome,
      telefone:
        (telefone && typeof telefone === "string" ? telefone.trim() : null) || "",
      data,
      hora,
      servicos,
      barbeiro,
      forma_pagamento,
      valor_total,
    });

    res.status(201).json(created);
  } catch (err) {
    if (err.code === "SLOT_TAKEN") {
      return res
        .status(400)
        .json({ mensagem: "Já existe um agendamento para esse barbeiro nesse dia e horário." });
    }
    console.error("Erro ao criar agendamento:", err);
    res.status(500).json({ mensagem: "Erro ao criar agendamento." });
  }
};

exports.listarAgendamentos = async (req, res) => {
  try {
    const { data } = req.query;

    if (req.barbeiro && req.query.barbeiro && req.query.barbeiro !== req.barbeiro) {
      return res.status(403).json({ mensagem: "Sem permissão para ver outro barbeiro." });
    }

    const rows = await repo.listar({ data, barbeiro: req.barbeiro });
    res.json(rows);
  } catch (err) {
    console.error("Erro ao listar agendamentos:", err);
    res.status(500).json({ mensagem: "Erro ao listar agendamentos." });
  }
};

exports.atualizarAgendamento = async (req, res) => {
  try {
    const { id } = req.params;
    const existente = await repo.buscarPorId(id);

    if (!existente) {
      return res.status(404).json({ mensagem: "Agendamento não encontrado." });
    }

    if (req.barbeiro && !assertOwnership(existente, req.barbeiro)) {
      return res.status(403).json({ mensagem: "Sem permissão." });
    }

    let { nome, telefone, data, hora, servicos, barbeiro, forma_pagamento } = req.body;

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

    const livre = await repo.slotLivre({ id, data, hora, barbeiro });

    if (!livre) {
      return res
        .status(400)
        .json({ mensagem: "Já existe um agendamento para esse barbeiro nesse dia e horário." });
    }

    const updated = await repo.atualizar(id, {
      nome,
      telefone:
        (telefone && typeof telefone === "string" ? telefone.trim() : null) || "",
      data,
      hora,
      servicos,
      barbeiro,
      forma_pagamento: forma_pagamento || existente.forma_pagamento,
      valor_total: calcularValor(servicos),
    });

    res.json(updated);
  } catch (err) {
    if (err.code === "NOT_FOUND") {
      return res.status(404).json({ mensagem: "Agendamento não encontrado." });
    }
    if (err.code === "SLOT_TAKEN") {
      return res
        .status(400)
        .json({ mensagem: "Já existe um agendamento para esse barbeiro nesse dia e horário." });
    }
    console.error("Erro ao atualizar agendamento:", err);
    res.status(500).json({ mensagem: "Erro ao atualizar agendamento." });
  }
};

exports.removerAgendamento = async (req, res) => {
  const { id } = req.params;

  try {
    const existente = await repo.buscarPorId(id);
    if (!existente) {
      return res.status(404).json({ mensagem: "Agendamento não encontrado." });
    }
    if (req.barbeiro && !assertOwnership(existente, req.barbeiro)) {
      return res.status(403).json({ mensagem: "Sem permissão." });
    }

    await repo.remover(id);
    res.status(200).json({ mensagem: "Agendamento excluído com sucesso." });
  } catch (err) {
    if (err.code === "NOT_FOUND") {
      return res.status(404).json({ mensagem: "Agendamento não encontrado." });
    }
    console.error("Erro ao excluir agendamento:", err);
    res.status(500).json({ mensagem: "Erro ao excluir agendamento." });
  }
};

exports.confirmarAgendamento = async (req, res) => {
  const { id } = req.params;

  try {
    const existente = await repo.buscarPorId(id);
    if (!existente) {
      return res.status(404).json({ mensagem: "Agendamento não encontrado." });
    }
    if (req.barbeiro && !assertOwnership(existente, req.barbeiro)) {
      return res.status(403).json({ mensagem: "Sem permissão." });
    }

    const updated = await repo.confirmar(id);
    res.status(200).json(updated);
  } catch (err) {
    if (err.code === "NOT_FOUND") {
      return res.status(404).json({ mensagem: "Agendamento não encontrado." });
    }
    console.error("Erro ao confirmar agendamento:", err);
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

    const rows = await repo.horariosOcupados({ data, barbeiro });
    res.json(rows);
  } catch (err) {
    console.error("Erro ao buscar horários ocupados:", err);
    res.status(500).json({ mensagem: "Erro ao buscar horários ocupados." });
  }
};
