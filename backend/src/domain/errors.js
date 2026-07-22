class AppError extends Error {
  constructor(message, { code = "APP_ERROR", status = 400 } = {}) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
  }
}

function notFound(message = "Recurso não encontrado.") {
  return new AppError(message, { code: "NOT_FOUND", status: 404 });
}

function forbidden(message = "Sem permissão.") {
  return new AppError(message, { code: "FORBIDDEN", status: 403 });
}

function badRequest(message, code = "BAD_REQUEST") {
  return new AppError(message, { code, status: 400 });
}

function unauthorized(message = "Faça login para acessar o painel.") {
  return new AppError(message, { code: "UNAUTHORIZED", status: 401 });
}

module.exports = {
  AppError,
  notFound,
  forbidden,
  badRequest,
  unauthorized,
};
