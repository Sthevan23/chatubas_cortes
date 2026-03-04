const express = require("express");
const {
  criarAgendamento,
  listarAgendamentos,
  atualizarAgendamento,
  removerAgendamento,
  buscarHorariosOcupados,
} = require("./agendamentoController");

const router = express.Router();

router.get("/", listarAgendamentos);
router.post("/", criarAgendamento);
router.put("/:id", atualizarAgendamento);
router.delete("/:id", removerAgendamento);
router.get("/ocupados", buscarHorariosOcupados);

module.exports = router;

