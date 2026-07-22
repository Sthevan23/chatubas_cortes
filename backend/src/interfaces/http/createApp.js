const express = require("express");
const cors = require("cors");
const { createRequestLogger } = require("./middleware/requestLogger");
const { createAgendamentoRoutes } = require("./routes/agendamentoRoutes");
const { createAuthRoutes } = require("./routes/authRoutes");
const { createFinanceiroRoutes } = require("./routes/financeiroRoutes");

function createApp({ env, authMiddleware, controllers }) {
  const app = express();

  const corsOptions = {
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (env.corsOrigins.includes("*") || env.corsOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS bloqueado para origem: ${origin}`));
    },
    credentials: true,
  };

  app.use(cors(corsOptions));
  app.use(express.json({ limit: "10kb" }));
  app.use(express.urlencoded({ extended: true, limit: "10kb" }));
  app.use(createRequestLogger({ enabled: env.logRequests }));

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.use(
    "/auth",
    createAuthRoutes({ controller: controllers.auth, authMiddleware })
  );
  app.use(
    "/financeiro",
    createFinanceiroRoutes({ controller: controllers.financeiro, authMiddleware })
  );
  app.use(
    "/agendamentos",
    createAgendamentoRoutes({
      controller: controllers.agendamento,
      authMiddleware,
    })
  );

  // Compat aliases
  app.get("/ocupados", controllers.agendamento.ocupados);

  app.use((req, res) => {
    res.status(404).json({
      mensagem: `Rota ${req.method} ${req.originalUrl} não encontrada.`,
    });
  });

  app.use((err, _req, res, _next) => {
    console.error("[Erro]", err);
    if (err && String(err.message || "").startsWith("CORS")) {
      return res.status(403).json({ mensagem: err.message });
    }
    res.status(500).json({
      mensagem:
        env.nodeEnv === "production"
          ? "Erro interno do servidor."
          : err.message || "Erro interno do servidor.",
    });
  });

  return app;
}

module.exports = { createApp };
