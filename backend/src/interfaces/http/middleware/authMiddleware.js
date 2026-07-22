function createAuthMiddleware({ tokenService }) {
  return function authMiddleware(req, res, next) {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    const payload = tokenService.verifyToken(token);

    if (!payload) {
      return res.status(401).json({ mensagem: "Faça login para acessar o painel." });
    }

    req.auth = payload;
    req.barbeiro = payload.barbeiro;
    next();
  };
}

module.exports = { createAuthMiddleware };
