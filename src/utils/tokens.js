const jwt = require("jsonwebtoken");
const env = require("../config/env");

function signToken(user) {
  return jwt.sign(
    {
      id_usuario: user.id_usuario,
      email: user.email,
      administrador: Boolean(user.administrador),
    },
    env.jwt.secret,
    { expiresIn: env.jwt.expiresIn }
  );
}

module.exports = {
  signToken,
};
