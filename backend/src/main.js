/**
 * Composition root — injeta implementações concretas (DIP).
 */
const { loadEnv } = require("./infrastructure/config/env");
const agendamentoRepository = require("./infrastructure/persistence/agendamentoRepository");
const barbeiroCatalog = require("./infrastructure/auth/barbeirosCatalog");
const tokenService = require("./infrastructure/auth/hmacToken");
const whatsappSender = require("./infrastructure/whatsapp/evolutionWhatsApp");
const { startLembreteJob } = require("./infrastructure/jobs/lembreteJob");

const { createCriarAgendamento } = require("./application/use-cases/criarAgendamento");
const {
  createListarAgendamentos,
  createAtualizarAgendamento,
  createRemoverAgendamento,
  createConfirmarAgendamento,
  createListarHorariosOcupados,
} = require("./application/use-cases/agendamentoOps");
const { createLogin } = require("./application/use-cases/login");
const { createResumoFinanceiro } = require("./application/use-cases/resumoFinanceiro");

const { createAuthMiddleware } = require("./interfaces/http/middleware/authMiddleware");
const { createAgendamentoController } = require("./interfaces/http/controllers/agendamentoController");
const { createAuthController } = require("./interfaces/http/controllers/authController");
const { createFinanceiroController } = require("./interfaces/http/controllers/financeiroController");
const { createApp } = require("./interfaces/http/createApp");

async function bootstrap() {
  const env = loadEnv();
  const storageMode = await agendamentoRepository.initStorage();

  const useCases = {
    criarAgendamento: createCriarAgendamento({ agendamentoRepository }),
    listarAgendamentos: createListarAgendamentos({ agendamentoRepository }),
    atualizarAgendamento: createAtualizarAgendamento({ agendamentoRepository }),
    removerAgendamento: createRemoverAgendamento({ agendamentoRepository }),
    confirmarAgendamento: createConfirmarAgendamento({ agendamentoRepository }),
    listarHorariosOcupados: createListarHorariosOcupados({ agendamentoRepository }),
    login: createLogin({ barbeiroCatalog, tokenService }),
    resumoFinanceiro: createResumoFinanceiro({ agendamentoRepository }),
  };

  const authMiddleware = createAuthMiddleware({ tokenService });

  const controllers = {
    agendamento: createAgendamentoController(useCases),
    auth: createAuthController(useCases),
    financeiro: createFinanceiroController(useCases),
  };

  const app = createApp({ env, authMiddleware, controllers });

  app.listen(env.port, () => {
    console.log(`API rodando na porta ${env.port}`);
    console.log(
      `Armazenamento: ${storageMode === "json" ? "arquivo local (JSON)" : "MySQL"}`
    );
    console.log(`Health: http://localhost:${env.port}/health`);
    console.log(`CORS: ${env.corsOrigins.join(", ")}`);
    console.log(
      `WhatsApp: ${whatsappSender.isConfigured() ? "Evolution configurada" : "manual (painel)"}`
    );
    startLembreteJob();
  });
}

bootstrap().catch((err) => {
  console.error("Falha ao iniciar a API:", err);
  process.exit(1);
});
