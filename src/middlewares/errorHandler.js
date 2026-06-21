function errorHandler(error, _req, res, _next) {
  const status = error.status || 500;
  const payload = {
    ok: false,
    message: status === 500 ? "Error interno del servidor" : error.message,
  };

  if (error.details) {
    payload.details = error.details;
  }

  if (process.env.NODE_ENV !== "production" && status === 500) {
    payload.error = error.message;
  }

  res.status(status).json(payload);
}

module.exports = errorHandler;
