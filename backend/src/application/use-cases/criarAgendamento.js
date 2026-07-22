const {
  FORMAS_PAGAMENTO,
  calcularValor,
  normalizarServicos,
  parseDateTime,
} = require("../../domain/pricing");
const { badRequest } = require("../../domain/errors");

function createCriarAgendamento({ agendamentoRepository }) {
  return async function criarAgendamento(input) {
    let { nome, telefone, data, hora, servicos, barbeiro, forma_pagamento } = input;

    nome = typeof nome === "string" ? nome.trim() : "";
    servicos = normalizarServicos(servicos);
    barbeiro = typeof barbeiro === "string" ? barbeiro.trim() : "";
    data = typeof data === "string" ? data.trim() : "";
    hora = typeof hora === "string" ? hora.trim() : "";
    forma_pagamento = typeof forma_pagamento === "string" ? forma_pagamento.trim() : "";

    if (!nome || !data || !hora || !servicos || !barbeiro || !forma_pagamento) {
      throw badRequest(
        "Campos obrigatórios: nome, data, hora, servicos, barbeiro, forma_pagamento"
      );
    }

    if (!FORMAS_PAGAMENTO.includes(forma_pagamento)) {
      throw badRequest("Forma de pagamento inválida.");
    }

    const dataHora = parseDateTime(data, hora);
    if (dataHora < new Date()) {
      throw badRequest("Não é permitido agendar para data/horário no passado.");
    }

    const livre = await agendamentoRepository.slotLivre({ data, hora, barbeiro });
    if (!livre) {
      throw badRequest(
        "Já existe um agendamento para esse barbeiro nesse dia e horário.",
        "SLOT_TAKEN"
      );
    }

    const valor_total = calcularValor(servicos);

    try {
      return await agendamentoRepository.criar({
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
    } catch (err) {
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

module.exports = { createCriarAgendamento };
