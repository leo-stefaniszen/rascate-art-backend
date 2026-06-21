require("dotenv").config();

const env = {
  port: Number(process.env.PORT || 3000),
  nodeEnv: process.env.NODE_ENV || "development",
  db: {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "ProyectoPp",
  },
  jwt: {
    secret: process.env.JWT_SECRET || "desarrollo_cambiar_esta_clave",
    expiresIn: process.env.JWT_EXPIRES_IN || "8h",
  },
  bcryptSaltRounds: Number(process.env.BCRYPT_SALT_ROUNDS || 10),
};

module.exports = env;
