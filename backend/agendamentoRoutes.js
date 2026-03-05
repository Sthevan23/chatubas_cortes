const express = require("express");
const {
  criarAgendamento,
  listarAgendamentos,
  atualizarAgendamento,
  removerAgendamento,
  confirmarAgendamento,
  buscarHorariosOcupados,
} = require("./agendamentoController");

const router = express.Router();

router.get("/", listarAgendamentos);
router.post("/", criarAgendamento);
router.put("/:id", atualizarAgendamento);
router.delete("/:id", removerAgendamento);
router.patch("/:id/confirmar", confirmarAgendamento);
router.get("/ocupados", buscarHorariosOcupados);

module.exports = router;

