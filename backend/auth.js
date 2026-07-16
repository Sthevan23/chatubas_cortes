const crypto = require("crypto");
const { findByNome } = require("./barbeiros");

const SECRET = process.env.AUTH_SECRET || "chatubas-cortes-dev-secret";
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

function signToken(payload) {
  const data = JSON.stringify({
    ...payload,
    exp: Date.now() + TOKEN_TTL_MS,
  });
  const body = Buffer.from(data).toString("base64url");
  const sig = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function verifyToken(token) {
  if (!token || typeof token !== "string") return null;

  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  const expected = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
  if (sig !== expected) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!payload.exp || Date.now() > payload.exp) return null;
    if (!payload.barbeiro) return null;
    return payload;
  } catch {
    return null;
  }
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  const payload = verifyToken(token);

  if (!payload) {
    return res.status(401).json({ mensagem: "Faça login para acessar o painel." });
  }

  req.auth = payload;
  req.barbeiro = payload.barbeiro;
  next();
}

function assertOwnership(agendamento, barbeiroNome) {
  return agendamento && agendamento.barbeiro === barbeiroNome;
}

module.exports = {
  signToken,
  verifyToken,
  authMiddleware,
  assertOwnership,
  findByNome,
};
