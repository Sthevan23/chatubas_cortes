-- ============================================================
-- Chatubas Cortes — schema MySQL
-- ============================================================
-- LOCAL: pode criar o banco com as linhas CREATE DATABASE / USE.
-- HOSTINGER: o banco já existe no hPanel.
--   → Abra o phpMyAdmin, selecione o banco e rode só o CREATE TABLE.
-- ============================================================

-- (Opcional — só em ambiente local)
-- CREATE DATABASE IF NOT EXISTS barbearia
--   DEFAULT CHARACTER SET utf8mb4
--   DEFAULT COLLATE utf8mb4_unicode_ci;
-- USE barbearia;

CREATE TABLE IF NOT EXISTS agendamentos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  barbeiro VARCHAR(100) NOT NULL,
  servicos VARCHAR(255) NOT NULL,
  nome VARCHAR(150) NOT NULL,
  telefone VARCHAR(30) NOT NULL,
  data DATE NOT NULL,
  hora TIME NOT NULL,
  forma_pagamento VARCHAR(40) DEFAULT '',
  valor_total DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'pendente',
  concluido_em DATETIME NULL,
  lembrete_enviado_em DATETIME NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_barbeiro_data_hora (barbeiro, data, hora)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migrações (se a tabela já existir sem essas colunas):
-- ALTER TABLE agendamentos ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'pendente' AFTER hora;
-- ALTER TABLE agendamentos ADD COLUMN lembrete_enviado_em DATETIME NULL AFTER concluido_em;
