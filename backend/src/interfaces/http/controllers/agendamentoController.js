const { AppError } = require("../../../domain/errors");

function handleError(res, err, fallbackMessage) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ mensagem: err.message });
  }
  if (err && err.code === "SLOT_TAKEN") {
    return res.status(400).json({
      mensagem: "Já existe um agendamento para esse barbeiro nesse dia e horário.",
    });
  }
  if (err && err.code === "NOT_FOUND") {
    return res.status(404).json({ mensagem: "Agendamento não encontrado." });
  }
  console.error(fallbackMessage, err);
  return res.status(500).json({ mensagem: fallbackMessage });
}

function createAgendamentoController(useCases) {
  return {
    async criar(req, res) {
      try {
        const created = await useCases.criarAgendamento(req.body || {});
        res.status(201).json(created);
      } catch (err) {
        handleError(res, err, "Erro ao criar agendamento.");
      }
    },

    async listar(req, res) {
      try {
        const rows = await useCases.listarAgendamentos({
          data: req.query.data,
          barbeiro: req.barbeiro,
          queryBarbeiro: req.query.barbeiro,
        });
        res.json(rows);
      } catch (err) {
        handleError(res, err, "Erro ao listar agendamentos.");
      }
    },

    async atualizar(req, res) {
      try {
        const updated = await useCases.atualizarAgendamento({
          id: req.params.id,
          body: req.body || {},
          barbeiroAuth: req.barbeiro,
        });
        res.json(updated);
      } catch (err) {
        handleError(res, err, "Erro ao atualizar agendamento.");
      }
    },

    async remover(req, res) {
      try {
        await useCases.removerAgendamento({
          id: req.params.id,
          barbeiroAuth: req.barbeiro,
        });
        res.status(200).json({ mensagem: "Agendamento excluído com sucesso." });
      } catch (err) {
        handleError(res, err, "Erro ao excluir agendamento.");
      }
    },

    async confirmar(req, res) {
      try {
        const updated = await useCases.confirmarAgendamento({
          id: req.params.id,
          barbeiroAuth: req.barbeiro,
        });
        res.status(200).json(updated);
      } catch (err) {
        handleError(res, err, "Erro ao confirmar agendamento.");
      }
    },

    async ocupados(req, res) {
      try {
        const rows = await useCases.listarHorariosOcupados({
          data: req.query.data,
          barbeiro: req.query.barbeiro,
        });
        res.json(rows);
      } catch (err) {
        handleError(res, err, "Erro ao buscar horários ocupados.");
      }
    },
  };
}

module.exports = { createAgendamentoController, handleError };
