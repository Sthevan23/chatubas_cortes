const express = require("express");

function createAuthRoutes({ controller, authMiddleware }) {
  const router = express.Router();
  router.post("/login", controller.login);
  router.get("/me", authMiddleware, controller.me);
  return router;
}

module.exports = { createAuthRoutes };
