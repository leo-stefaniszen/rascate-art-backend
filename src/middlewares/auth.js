const jwt = require("jsonwebtoken");
const env = require("../config/env");
const { query } = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");
const HttpError = require("../utils/httpError");

const authenticate = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || "";
  const [type, token] = header.split(" ");

  if (type !== "Bearer" || !token) {
    throw new HttpError(401, "Token requerido");
  }

  try {
    const payload = jwt.verify(token, env.jwt.secret);
    const users = await query(
      "SELECT id_usuario, nombre, apellido, dni, email, telefono, fecha_registro, administrador FROM USUARIOS WHERE id_usuario = ?",
      [payload.id_usuario]
    );

    if (!users.length) {
      throw new HttpError(401, "Usuario no encontrado");
    }

    req.user = users[0];
    next();
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(401, "Token invalido");
  }
});

function requireAdmin(req, _res, next) {
  if (!req.user?.administrador) {
    return next(new HttpError(403, "Se requiere rol administrador"));
  }

  return next();
}

module.exports = {
  authenticate,
  requireAdmin,
};
