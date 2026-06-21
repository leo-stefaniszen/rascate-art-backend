const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const createCrudController = require("../controllers/crudController");
const { authenticate, requireAdmin } = require("../middlewares/auth");

function createCrudRouter(resource) {
  const router = express.Router();
  const controller = createCrudController(resource);
  const writeMiddlewares = resource.adminOnly ? [authenticate, requireAdmin] : [authenticate];

  router.get("/", asyncHandler(controller.list));

  if (resource.id) {
    router.get("/:id", asyncHandler(controller.getById));
    router.post("/", ...writeMiddlewares, asyncHandler(controller.create));
    router.put("/:id", ...writeMiddlewares, asyncHandler(controller.update));
    router.delete("/:id", ...writeMiddlewares, asyncHandler(controller.remove));
  } else {
    const path = `/${resource.compositeId.map((field) => `:${field}`).join("/")}`;
    router.get(path, asyncHandler(controller.getById));
    router.post("/", ...writeMiddlewares, asyncHandler(controller.create));
    router.put(path, ...writeMiddlewares, asyncHandler(controller.update));
    router.delete(path, ...writeMiddlewares, asyncHandler(controller.remove));
  }

  return router;
}

module.exports = createCrudRouter;
