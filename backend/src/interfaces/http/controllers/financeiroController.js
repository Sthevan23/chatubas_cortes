const { handleError } = require("./agendamentoController");

function createFinanceiroController(useCases) {
  return {
    async resumo(req, res) {
      try {
        const result = await useCases.resumoFinanceiro({
          barbeiro: req.barbeiro,
          data: req.query.data,
          mes: req.query.mes,
        });
        res.json(result);
      } catch (err) {
        handleError(res, err, "Erro ao carregar financeiro.");
      }
    },
  };
}

module.exports = { createFinanceiroController };
