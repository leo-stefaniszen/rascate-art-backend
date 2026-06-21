const express = require("express");
const { body } = require("express-validator");
const { query, transaction } = require("../config/db");
const { authenticate } = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const asyncHandler = require("../utils/asyncHandler");
const HttpError = require("../utils/httpError");

const router = express.Router();

router.get(
  "/catalogo",
  asyncHandler(async (_req, res) => {
    const products = await query(
      `SELECT p.id_producto, p.nombre, p.descripcion, p.precio_base, p.activo,
              c.id_categoria, c.nombre AS categoria
       FROM PRODUCTOS p
       LEFT JOIN CATEGORIAS c ON c.id_categoria = p.id_categoria
       WHERE p.activo = true
       ORDER BY p.id_producto`
    );

    res.json({ ok: true, data: products });
  })
);

router.get(
  "/productos/:id/detalle",
  asyncHandler(async (req, res) => {
    const products = await query(
      `SELECT p.*, c.nombre AS categoria
       FROM PRODUCTOS p
       LEFT JOIN CATEGORIAS c ON c.id_categoria = p.id_categoria
       WHERE p.id_producto = ?`,
      [req.params.id]
    );

    if (!products.length) throw new HttpError(404, "Producto no encontrado");

    const reviews = await query(
      `SELECT r.*, u.nombre, u.apellido
       FROM RESENAS r
       LEFT JOIN USUARIOS u ON u.id_usuario = r.id_usuario
       WHERE r.id_producto = ?
       ORDER BY r.fecha DESC`,
      [req.params.id]
    );

    res.json({ ok: true, data: { ...products[0], resenas: reviews } });
  })
);

router.get(
  "/mi-carrito",
  authenticate,
  asyncHandler(async (req, res) => {
    const carts = await query(
      "SELECT * FROM CARRITO WHERE id_usuario = ? AND estado = 'ACTIVO' ORDER BY id_carrito DESC LIMIT 1",
      [req.user.id_usuario]
    );

    if (!carts.length) {
      return res.json({ ok: true, data: { carrito: null, items: [], total: 0 } });
    }

    const items = await query(
      `SELECT dc.*, p.nombre, p.precio_base, (dc.cantidad * p.precio_base) AS subtotal
       FROM DETALLE_CARRITO dc
       JOIN PRODUCTOS p ON p.id_producto = dc.id_producto
       WHERE dc.id_carrito = ?`,
      [carts[0].id_carrito]
    );

    const total = items.reduce((sum, item) => sum + Number(item.subtotal), 0);
    res.json({ ok: true, data: { carrito: carts[0], items, total } });
  })
);

router.post(
  "/mi-carrito/items",
  authenticate,
  [body("id_producto").isInt(), body("cantidad").isInt({ min: 1 }), validate],
  asyncHandler(async (req, res) => {
    const { id_producto, cantidad, texto_personalizacion = null } = req.body;

    const result = await transaction(async (connection) => {
      const [products] = await connection.execute("SELECT id_producto FROM PRODUCTOS WHERE id_producto = ? AND activo = true", [id_producto]);
      if (!products.length) throw new HttpError(404, "Producto no encontrado o inactivo");

      const [carts] = await connection.execute(
        "SELECT * FROM CARRITO WHERE id_usuario = ? AND estado = 'ACTIVO' ORDER BY id_carrito DESC LIMIT 1",
        [req.user.id_usuario]
      );

      let cartId = carts[0]?.id_carrito;
      if (!cartId) {
        const [created] = await connection.execute(
          "INSERT INTO CARRITO (id_usuario, fecha_creacion, estado) VALUES (?, CURDATE(), 'ACTIVO')",
          [req.user.id_usuario]
        );
        cartId = created.insertId;
      }

      const [items] = await connection.execute(
        "SELECT * FROM DETALLE_CARRITO WHERE id_carrito = ? AND id_producto = ? AND COALESCE(texto_personalizacion, '') = COALESCE(?, '')",
        [cartId, id_producto, texto_personalizacion]
      );

      if (items.length) {
        await connection.execute(
          "UPDATE DETALLE_CARRITO SET cantidad = cantidad + ? WHERE id_detalle_carrito = ?",
          [cantidad, items[0].id_detalle_carrito]
        );
      } else {
        await connection.execute(
          "INSERT INTO DETALLE_CARRITO (id_carrito, id_producto, cantidad, texto_personalizacion) VALUES (?, ?, ?, ?)",
          [cartId, id_producto, cantidad, texto_personalizacion]
        );
      }

      return cartId;
    });

    res.status(201).json({ ok: true, message: "Producto agregado al carrito", id_carrito: result });
  })
);

router.patch(
  "/mi-carrito/items/:id",
  authenticate,
  [body("cantidad").isInt({ min: 1 }), validate],
  asyncHandler(async (req, res) => {
    const result = await query(
      `UPDATE DETALLE_CARRITO dc
       JOIN CARRITO c ON c.id_carrito = dc.id_carrito
       SET dc.cantidad = ?
       WHERE dc.id_detalle_carrito = ? AND c.id_usuario = ? AND c.estado = 'ACTIVO'`,
      [req.body.cantidad, req.params.id, req.user.id_usuario]
    );

    if (!result.affectedRows) throw new HttpError(404, "Item de carrito no encontrado");
    res.json({ ok: true, message: "Cantidad actualizada" });
  })
);

router.delete(
  "/mi-carrito/items/:id",
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await query(
      `DELETE dc FROM DETALLE_CARRITO dc
       JOIN CARRITO c ON c.id_carrito = dc.id_carrito
       WHERE dc.id_detalle_carrito = ? AND c.id_usuario = ? AND c.estado = 'ACTIVO'`,
      [req.params.id, req.user.id_usuario]
    );

    if (!result.affectedRows) throw new HttpError(404, "Item de carrito no encontrado");
    res.json({ ok: true, message: "Item eliminado" });
  })
);

router.post(
  "/checkout",
  authenticate,
  asyncHandler(async (req, res) => {
    const orderId = await transaction(async (connection) => {
      const [carts] = await connection.execute(
        "SELECT * FROM CARRITO WHERE id_usuario = ? AND estado = 'ACTIVO' ORDER BY id_carrito DESC LIMIT 1",
        [req.user.id_usuario]
      );
      if (!carts.length) throw new HttpError(400, "No hay carrito activo");

      const [items] = await connection.execute(
        `SELECT dc.*, p.precio_base
         FROM DETALLE_CARRITO dc
         JOIN PRODUCTOS p ON p.id_producto = dc.id_producto
         WHERE dc.id_carrito = ?`,
        [carts[0].id_carrito]
      );
      if (!items.length) throw new HttpError(400, "El carrito esta vacio");

      const total = items.reduce((sum, item) => sum + Number(item.precio_base) * Number(item.cantidad), 0);
      const [order] = await connection.execute(
        "INSERT INTO PEDIDOS (id_usuario, fecha_pedido, monto_total, estado_pedido) VALUES (?, CURDATE(), ?, 'PENDIENTE')",
        [req.user.id_usuario, total]
      );

      for (const item of items) {
        await connection.execute(
          `INSERT INTO DETALLE_PEDIDO
           (id_pedido, id_producto, cantidad, precio_unitario, texto_personalizacion)
           VALUES (?, ?, ?, ?, ?)`,
          [order.insertId, item.id_producto, item.cantidad, item.precio_base, item.texto_personalizacion]
        );
      }

      await connection.execute("UPDATE CARRITO SET estado = 'CERRADO' WHERE id_carrito = ?", [carts[0].id_carrito]);
      return order.insertId;
    });

    res.status(201).json({ ok: true, message: "Pedido creado", id_pedido: orderId });
  })
);

router.get(
  "/mis-pedidos",
  authenticate,
  asyncHandler(async (req, res) => {
    const orders = await query("SELECT * FROM PEDIDOS WHERE id_usuario = ? ORDER BY fecha_pedido DESC, id_pedido DESC", [
      req.user.id_usuario,
    ]);

    res.json({ ok: true, data: orders });
  })
);

router.get(
  "/mis-pedidos/:id",
  authenticate,
  asyncHandler(async (req, res) => {
    const orders = await query("SELECT * FROM PEDIDOS WHERE id_pedido = ? AND id_usuario = ?", [
      req.params.id,
      req.user.id_usuario,
    ]);
    if (!orders.length) throw new HttpError(404, "Pedido no encontrado");

    const details = await query(
      `SELECT dp.*, p.nombre
       FROM DETALLE_PEDIDO dp
       JOIN PRODUCTOS p ON p.id_producto = dp.id_producto
       WHERE dp.id_pedido = ?`,
      [req.params.id]
    );

    res.json({ ok: true, data: { ...orders[0], detalle: details } });
  })
);

module.exports = router;
