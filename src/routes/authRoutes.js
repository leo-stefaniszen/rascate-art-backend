const express = require("express");
const bcrypt = require("bcryptjs");
const { body } = require("express-validator");
const { query } = require("../config/db");
const env = require("../config/env");
const validate = require("../middlewares/validate");
const { authenticate } = require("../middlewares/auth");
const asyncHandler = require("../utils/asyncHandler");
const HttpError = require("../utils/httpError");
const { signToken } = require("../utils/tokens");

const router = express.Router();

const userSelect = "id_usuario, nombre, apellido, dni, email, telefono, fecha_registro, administrador";

router.post(
  "/register",
  [
    body("nombre").notEmpty(),
    body("apellido").notEmpty(),
    body("dni").isInt(),
    body("email").isEmail(),
    body("password").isLength({ min: 6 }),
    validate,
  ],
  asyncHandler(async (req, res) => {
    const { nombre, apellido, dni, email, telefono = null, password } = req.body;
    const exists = await query("SELECT id_usuario FROM USUARIOS WHERE email = ? OR dni = ?", [email, dni]);
    if (exists.length) {
      throw new HttpError(409, "Ya existe un usuario con ese email o DNI");
    }

    const hashedPassword = await bcrypt.hash(password, env.bcryptSaltRounds);
    const result = await query(
      `INSERT INTO USUARIOS
       (nombre, apellido, dni, email, telefono, password, fecha_registro, administrador)
       VALUES (?, ?, ?, ?, ?, ?, CURDATE(), false)`,
      [nombre, apellido, dni, email, telefono, hashedPassword]
    );

    const users = await query(`SELECT ${userSelect} FROM USUARIOS WHERE id_usuario = ?`, [result.insertId]);
    const token = signToken(users[0]);
    res.status(201).json({ ok: true, token, user: users[0] });
  })
);

router.post(
  "/login",
  [body("email").isEmail(), body("password").notEmpty(), validate],
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const users = await query("SELECT * FROM USUARIOS WHERE email = ?", [email]);
    if (!users.length) {
      throw new HttpError(401, "Credenciales invalidas");
    }

    const user = users[0];
    const passwordLooksHashed = String(user.password).startsWith("$2");
    const passwordMatches = passwordLooksHashed
      ? await bcrypt.compare(password, user.password)
      : password === user.password;

    if (!passwordMatches) {
      throw new HttpError(401, "Credenciales invalidas");
    }

    if (!passwordLooksHashed) {
      const hashedPassword = await bcrypt.hash(password, env.bcryptSaltRounds);
      await query("UPDATE USUARIOS SET password = ? WHERE id_usuario = ?", [hashedPassword, user.id_usuario]);
    }

    const safeUser = Object.fromEntries(Object.entries(user).filter(([key]) => key !== "password"));
    const token = signToken(safeUser);
    res.json({ ok: true, token, user: safeUser });
  })
);

router.get(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    res.json({ ok: true, user: req.user });
  })
);

router.put(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    const allowed = ["nombre", "apellido", "telefono"];
    const data = allowed.reduce((acc, field) => {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) acc[field] = req.body[field];
      return acc;
    }, {});

    if (!Object.keys(data).length) {
      throw new HttpError(400, "No hay campos validos para actualizar");
    }

    await query(
      `UPDATE USUARIOS SET ${Object.keys(data).map((field) => `${field} = ?`).join(", ")} WHERE id_usuario = ?`,
      [...Object.values(data), req.user.id_usuario]
    );

    const users = await query(`SELECT ${userSelect} FROM USUARIOS WHERE id_usuario = ?`, [req.user.id_usuario]);
    res.json({ ok: true, user: users[0] });
  })
);

module.exports = router;
