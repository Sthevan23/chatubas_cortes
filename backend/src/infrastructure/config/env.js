/**
 * @typedef {object} EnvConfig
 * @property {number} port
 * @property {string[]} corsOrigins
 * @property {string} authSecret
 * @property {number} lembreteHorasAntes
 */

const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

function parseCorsOrigins() {
  const raw = process.env.CORS_ORIGIN || "http://localhost:5173,http://127.0.0.1:5173";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function loadEnv() {
  return {
    port: Number(process.env.PORT) || 3000,
    corsOrigins: parseCorsOrigins(),
    authSecret: process.env.AUTH_SECRET || "chatubas-cortes-dev-secret",
    lembreteHorasAntes: Number(process.env.LEMBRETE_HORAS_ANTES) || 2,
    nodeEnv: process.env.NODE_ENV || "development",
    logRequests: process.env.NODE_ENV !== "production" || process.env.LOG_REQUESTS === "1",
  };
}

module.exports = { loadEnv, parseCorsOrigins };
