const app = require("./app");
const env = require("./config/env");
const { pool } = require("./config/db");

async function start() {
  await pool.query("SELECT 1");
  app.listen(env.port, () => {
    console.log(`API Rascate Art escuchando en http://localhost:${env.port}`);
  });
}

start().catch((error) => {
  console.error("No se pudo iniciar el servidor:", error.message);
  process.exit(1);
});
