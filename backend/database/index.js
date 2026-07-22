/**
 * Módulo database — conexão MySQL + queries SQL.
 *
 * Estrutura:
 *   backend/database/
 *     connection.js
 *     schema.sql
 *     queries/agendamentos.js
 */
const pool = require("./connection");
const agendamentos = require("./queries/agendamentos");

module.exports = {
  pool,
  queries: {
    agendamentos,
  },
};
