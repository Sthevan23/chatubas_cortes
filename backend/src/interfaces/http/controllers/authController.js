const { handleError } = require("./agendamentoController");

function createAuthController(useCases) {
  return {
    async login(req, res) {
      try {
        const result = await useCases.login(req.body || {});
        res.json(result);
      } catch (err) {
        handleError(res, err, "Erro ao fazer login.");
      }
    },

    me(req, res) {
      res.json({
        barbeiro: req.barbeiro,
        usuario: req.auth.usuario,
      });
    },
  };
}

module.exports = { createAuthController };
