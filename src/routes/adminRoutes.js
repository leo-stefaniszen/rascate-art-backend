const express = require("express");
const { query } = require("../config/db");
const { authenticate, requireAdmin } = require("../middlewares/auth");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.use(authenticate, requireAdmin);

router.get(
  "/dashboard",
  asyncHandler(async (_req, res) => {
    const [usuarios] = await query("SELECT COUNT(*) AS total FROM USUARIOS");
    const [productos] = await query("SELECT COUNT(*) AS total FROM PRODUCTOS");
    const [pedidos] = await query("SELECT COUNT(*) AS total, COALESCE(SUM(monto_total), 0) AS facturacion FROM PEDIDOS");
    const bajoStock = await query(
      `SELECT it.*, p.nombre
       FROM INVENTARIO_TERMINADOS it
       JOIN PRODUCTOS p ON p.id_producto = it.id_producto
       WHERE it.stock_actual <= it.stock_minimo`
    );

    res.json({
      ok: true,
      data: {
        usuarios: usuarios.total,
        productos: productos.total,
        pedidos: pedidos.total,
        facturacion: pedidos.facturacion,
        productos_bajo_stock: bajoStock,
      },
    });
  })
);

router.get(
  "/ventas-por-producto",
  asyncHandler(async (_req, res) => {
    const rows = await query(
      `SELECT p.id_producto, p.nombre, SUM(dp.cantidad) AS unidades, SUM(dp.cantidad * dp.precio_unitario) AS total
       FROM DETALLE_PEDIDO dp
       JOIN PRODUCTOS p ON p.id_producto = dp.id_producto
       GROUP BY p.id_producto, p.nombre
       ORDER BY unidades DESC`
    );

    res.json({ ok: true, data: rows });
  })
);

router.get(
  "/materias-primas-bajo-stock",
  asyncHandler(async (_req, res) => {
    const rows = await query("SELECT * FROM MATERIAS_PRIMAS WHERE stock_actual <= stock_minimo ORDER BY nombre");
    res.json({ ok: true, data: rows });
  })
);

module.exports = router;
