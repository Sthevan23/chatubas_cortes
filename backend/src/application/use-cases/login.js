const { badRequest, unauthorized } = require("../../domain/errors");

function createLogin({ barbeiroCatalog, tokenService }) {
  return async function login({ usuario, senha }) {
    if (!usuario || !senha) {
      throw badRequest("Informe usuário e senha.");
    }

    const barbeiro = barbeiroCatalog.findByCredentials(usuario, senha);
    if (!barbeiro) {
      throw unauthorized("Usuário ou senha incorretos.");
    }

    const token = tokenService.signToken({
      barbeiro: barbeiro.nome,
      usuario: barbeiro.usuario,
    });

    return {
      token,
      barbeiro: barbeiro.nome,
      usuario: barbeiro.usuario,
    };
  };
}

module.exports = { createLogin };
