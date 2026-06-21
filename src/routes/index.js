const express = require("express");
const authRoutes = require("./authRoutes");
const shopRoutes = require("./shopRoutes");
const adminRoutes = require("./adminRoutes");
const createCrudRouter = require("./crudRoutes");
const resources = require("../resources/resourceConfig");

const router = express.Router();

router.get("/health", (_req, res) => {
  res.json({ ok: true, message: "API Rascate Art funcionando" });
});

router.use("/auth", authRoutes);
router.use("/shop", shopRoutes);
router.use("/admin", adminRoutes);

Object.entries(resources).forEach(([name, resource]) => {
  router.use(`/${name}`, createCrudRouter(resource));
});

module.exports = router;
