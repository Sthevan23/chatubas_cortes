const path = require("path");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const agendamentoRoutes = require("./agendamentoRoutes");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const rootPath = path.resolve(__dirname, "..");

// --- Middlewares globais ---
app.use(cors());
app.use(express.json({ limit: "10kb" }));

// Log de requisições (apenas em desenvolvimento ou se LOG_REQUESTS=1)
if (process.env.NODE_ENV !== "production" || process.env.LOG_REQUESTS === "1") {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      const duration = Date.now() - start;
      console.log(
        `[${new Date().toISOString()}] ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`
      );
    });
    next();
  });
}

// Arquivos estáticos (HTML, CSS, JS, imagens)
app.use(express.static(rootPath));

// --- Rotas da API ---
app.use("/agendamentos", agendamentoRoutes);

// Health check para monitoramento/deploy
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// Middleware de erro global
app.use((err, req, res, next) => {
  console.error("[Erro]", err);
  res.status(500).json({
    mensagem: process.env.NODE_ENV === "production"
      ? "Erro interno do servidor."
      : err.message || "Erro interno do servidor.",
  });
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  if (process.env.NODE_ENV !== "production") {
    console.log("Arquivos estáticos:", rootPath);
  }
});
