const { findByCredentials } = require("./barbeiros");
const { signToken } = require("./auth");

exports.login = (req, res) => {
  const { usuario, senha } = req.body || {};

  if (!usuario || !senha) {
    return res.status(400).json({ mensagem: "Informe usuário e senha." });
  }

  const barbeiro = findByCredentials(usuario, senha);

  if (!barbeiro) {
    return res.status(401).json({ mensagem: "Usuário ou senha incorretos." });
  }

  const token = signToken({
    barbeiro: barbeiro.nome,
    usuario: barbeiro.usuario,
  });

  res.json({
    token,
    barbeiro: barbeiro.nome,
    usuario: barbeiro.usuario,
  });
};

exports.me = (req, res) => {
  res.json({
    barbeiro: req.barbeiro,
    usuario: req.auth.usuario,
  });
};
