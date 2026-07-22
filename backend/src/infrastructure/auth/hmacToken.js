const crypto = require("crypto");
const { loadEnv } = require("../config/env");

const { authSecret } = loadEnv();
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

function signToken(payload) {
  const data = JSON.stringify({
    ...payload,
    exp: Date.now() + TOKEN_TTL_MS,
  });
  const body = Buffer.from(data).toString("base64url");
  const sig = crypto.createHmac("sha256", authSecret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function verifyToken(token) {
  if (!token || typeof token !== "string") return null;

  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  const expected = crypto.createHmac("sha256", authSecret).update(body).digest("base64url");
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

module.exports = { signToken, verifyToken };
