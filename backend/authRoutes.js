const express = require("express");
const { login, me } = require("./authController");
const { authMiddleware } = require("./auth");

const router = express.Router();

router.post("/login", login);
router.get("/me", authMiddleware, me);

module.exports = router;
