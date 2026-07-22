const express = require("express");

function createAgendamentoRoutes({ controller, authMiddleware }) {
  const router = express.Router();

  router.get("/ocupados", controller.ocupados);
  router.post("/", controller.criar);

  router.get("/", authMiddleware, controller.listar);
  router.put("/:id", authMiddleware, controller.atualizar);
  router.delete("/:id", authMiddleware, controller.remover);
  router.patch("/:id/confirmar", authMiddleware, controller.confirmar);

  return router;
}

module.exports = { createAgendamentoRoutes };
