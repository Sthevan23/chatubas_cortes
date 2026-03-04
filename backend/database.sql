-- Banco de dados da barbearia

CREATE DATABASE IF NOT EXISTS barbearia
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE barbearia;

-- Tabela de agendamentos
CREATE TABLE IF NOT EXISTS agendamentos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  barbeiro VARCHAR(100) NOT NULL,
  servicos VARCHAR(255) NOT NULL,
  nome VARCHAR(150) NOT NULL,
  telefone VARCHAR(30) NOT NULL,
  data DATE NOT NULL,
  hora TIME NOT NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Impede dois agendamentos no mesmo horário para o mesmo barbeiro
  UNIQUE KEY uniq_barbeiro_data_hora (barbeiro, data, hora)
);

