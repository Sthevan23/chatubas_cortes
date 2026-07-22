const express = require("express");

function createFinanceiroRoutes({ controller, authMiddleware }) {
  const router = express.Router();
  router.use(authMiddleware);
  router.get("/resumo", controller.resumo);
  return router;
}

module.exports = { createFinanceiroRoutes };
