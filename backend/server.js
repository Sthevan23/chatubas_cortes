const path = require("path");

const express = require("express");

const cors = require("cors");

const dotenv = require("dotenv");

const agendamentoRoutes = require("./agendamentoRoutes");
const authRoutes = require("./authRoutes");
const financeiroRoutes = require("./financeiroRoutes");
const {
  listarAgendamentos,
  criarAgendamento,
  buscarHorariosOcupados,
} = require("./agendamentoController");
const { authMiddleware } = require("./auth");
const { initStorage } = require("./agendamentoRepository");



dotenv.config();



const app = express();

const PORT = process.env.PORT || 3000;

const rootPath = path.resolve(__dirname, "..");



app.use(cors());

app.use(express.json({ limit: "10kb" }));

app.use(express.urlencoded({ extended: true, limit: "10kb" }));



if (process.env.NODE_ENV !== "production" || process.env.LOG_REQUESTS === "1") {

  app.use((req, res, next) => {

    const start = Date.now();

    res.on("finish", () => {

      const duration = Date.now() - start;

      console.log(

        `[${new Date().toISOString()}] ${req.method} ${req.originalUrl || req.url} - ${res.statusCode} (${duration}ms)`

      );

    });

    next();

  });

}



// Health check

app.get("/health", (req, res) => {

  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });

});



// --- API ---
app.use("/auth", authRoutes);
app.use("/financeiro", financeiroRoutes);
app.use("/agendamentos", agendamentoRoutes);

app.get("/agendamentos/ocupados", buscarHorariosOcupados);
app.post("/agendamentos", criarAgendamento);

// Compat cache antigo — listagem exige login
app.get("/ocupados", buscarHorariosOcupados);
app.get("/", (req, res, next) => {
  if (req.query.barbeiro !== undefined || req.query.data !== undefined) {
    return authMiddleware(req, res, () => listarAgendamentos(req, res));
  }
  next();
});

app.post("/", (req, res, next) => {

  const body = req.body || {};

  if (body.nome && body.barbeiro) {

    return criarAgendamento(req, res);

  }

  next();

});



// Arquivos estáticos — somente GET/HEAD (evita 405 em POST)

const staticFiles = express.static(rootPath);

app.use((req, res, next) => {

  if (req.method === "GET" || req.method === "HEAD") {

    return staticFiles(req, res, next);

  }

  next();

});



// POST/PUT/PATCH/DELETE não tratados → JSON, não 405 do static

app.use((req, res) => {

  res.status(404).json({

    mensagem: `Rota ${req.method} ${req.originalUrl} não encontrada.`,

  });

});



app.use((err, req, res, next) => {

  console.error("[Erro]", err);

  res.status(500).json({

    mensagem:

      process.env.NODE_ENV === "production"

        ? "Erro interno do servidor."

        : err.message || "Erro interno do servidor.",

  });

});



async function start() {

  const storageMode = await initStorage();



  app.listen(PORT, () => {

    console.log(`Servidor rodando na porta ${PORT}`);

    console.log(`Armazenamento: ${storageMode === "json" ? "arquivo local (JSON)" : "MySQL"}`);

    console.log(`Site: http://localhost:${PORT}`);

    console.log(`Painel: http://localhost:${PORT}/login.html`);

  });

}



start().catch((err) => {

  console.error("Falha ao iniciar o servidor:", err);

  process.exit(1);

});


