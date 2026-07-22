const {
  calcularValor,
  normalizarServicos,
  parseDateTime,
  assertOwnership,
} = require("../../domain/pricing");
const { badRequest, notFound, forbidden } = require("../../domain/errors");

function createListarAgendamentos({ agendamentoRepository }) {
  return async function listarAgendamentos({ data, barbeiro, queryBarbeiro }) {
    if (barbeiro && queryBarbeiro && queryBarbeiro !== barbeiro) {
      throw forbidden("Sem permissão para ver outro barbeiro.");
    }
    return agendamentoRepository.listar({ data, barbeiro });
  };
}

function createAtualizarAgendamento({ agendamentoRepository }) {
  return async function atualizarAgendamento({ id, body, barbeiroAuth }) {
    const existente = await agendamentoRepository.buscarPorId(id);
    if (!existente) throw notFound("Agendamento não encontrado.");
    if (barbeiroAuth && !assertOwnership(existente, barbeiroAuth)) {
      throw forbidden("Sem permissão.");
    }

    let { nome, telefone, data, hora, servicos, barbeiro, forma_pagamento } = body;

    nome = typeof nome === "string" ? nome.trim() : "";
    servicos = normalizarServicos(servicos);
    barbeiro = typeof barbeiro === "string" ? barbeiro.trim() : "";
    data = typeof data === "string" ? data.trim() : "";
    hora = typeof hora === "string" ? hora.trim() : "";

    if (!nome || !data || !hora || !servicos || !barbeiro) {
      throw badRequest("Campos obrigatórios: nome, data, hora, servicos, barbeiro");
    }

    if (parseDateTime(data, hora) < new Date()) {
      throw badRequest("Não é permitido reagendar para data/horário no passado.");
    }

    const livre = await agendamentoRepository.slotLivre({ id, data, hora, barbeiro });
    if (!livre) {
      throw badRequest(
        "Já existe um agendamento para esse barbeiro nesse dia e horário.",
        "SLOT_TAKEN"
      );
    }

    try {
      return await agendamentoRepository.atualizar(id, {
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
    } catch (err) {
      if (err.code === "NOT_FOUND") throw notFound("Agendamento não encontrado.");
      if (err.code === "SLOT_TAKEN") {
        throw badRequest(
          "Já existe um agendamento para esse barbeiro nesse dia e horário.",
          "SLOT_TAKEN"
        );
      }
      throw err;
    }
  };
}

function createRemoverAgendamento({ agendamentoRepository }) {
  return async function removerAgendamento({ id, barbeiroAuth }) {
    const existente = await agendamentoRepository.buscarPorId(id);
    if (!existente) throw notFound("Agendamento não encontrado.");
    if (barbeiroAuth && !assertOwnership(existente, barbeiroAuth)) {
      throw forbidden("Sem permissão.");
    }
    try {
      await agendamentoRepository.remover(id);
    } catch (err) {
      if (err.code === "NOT_FOUND") throw notFound("Agendamento não encontrado.");
      throw err;
    }
  };
}

function createConfirmarAgendamento({ agendamentoRepository }) {
  return async function confirmarAgendamento({ id, barbeiroAuth }) {
    const existente = await agendamentoRepository.buscarPorId(id);
    if (!existente) throw notFound("Agendamento não encontrado.");
    if (barbeiroAuth && !assertOwnership(existente, barbeiroAuth)) {
      throw forbidden("Sem permissão.");
    }
    try {
      return await agendamentoRepository.confirmar(id);
    } catch (err) {
      if (err.code === "NOT_FOUND") throw notFound("Agendamento não encontrado.");
      throw err;
    }
  };
}

function createListarHorariosOcupados({ agendamentoRepository }) {
  return async function listarHorariosOcupados({ data, barbeiro }) {
    if (!data || !barbeiro) {
      throw badRequest("Parâmetros obrigatórios: data, barbeiro.");
    }
    return agendamentoRepository.horariosOcupados({ data, barbeiro });
  };
}

module.exports = {
  createListarAgendamentos,
  createAtualizarAgendamento,
  createRemoverAgendamento,
  createConfirmarAgendamento,
  createListarHorariosOcupados,
};
