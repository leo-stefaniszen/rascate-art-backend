const { validationResult } = require("express-validator");
const HttpError = require("../utils/httpError");

module.exports = function validate(req, _res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError(400, "Datos invalidos", errors.array()));
  }

  return next();
};
