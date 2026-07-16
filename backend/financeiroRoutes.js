const express = require("express");
const { resumo } = require("./financeiroController");
const { authMiddleware } = require("./auth");

const router = express.Router();

router.use(authMiddleware);
router.get("/resumo", resumo);

module.exports = router;
