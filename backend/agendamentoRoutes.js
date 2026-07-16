const express = require("express");
const {
  criarAgendamento,
  listarAgendamentos,
  atualizarAgendamento,
  removerAgendamento,
  confirmarAgendamento,
  buscarHorariosOcupados,
} = require("./agendamentoController");
const { authMiddleware } = require("./auth");

const router = express.Router();

// Público — site do cliente
router.get("/ocupados", buscarHorariosOcupados);
router.post("/", criarAgendamento);

// Protegido — painel do barbeiro
router.get("/", authMiddleware, listarAgendamentos);
router.put("/:id", authMiddleware, atualizarAgendamento);
router.delete("/:id", authMiddleware, removerAgendamento);
router.patch("/:id/confirmar", authMiddleware, confirmarAgendamento);

module.exports = router;
