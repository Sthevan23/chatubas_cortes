const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const agendamentoRoutes = require("./agendamentoRoutes");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Log de todas as requisições para depuração
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Servir arquivos estáticos (HTML, CSS, JS) da raiz do projeto
const path = require("path");
const rootPath = path.resolve(__dirname, "..");
app.use(express.static(rootPath));
console.log("Arquivos estáticos sendo servidos de:", rootPath);

app.use("/agendamentos", agendamentoRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
