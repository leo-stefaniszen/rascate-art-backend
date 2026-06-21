const bcrypt = require("bcryptjs");
const { query } = require("../config/db");
const env = require("../config/env");
const HttpError = require("../utils/httpError");

function columnsForSelect(resource) {
  return resource.publicFields?.length ? resource.publicFields.join(", ") : "*";
}

function pickDefined(body, fields) {
  return fields.reduce((acc, field) => {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      acc[field] = body[field];
    }
    return acc;
  }, {});
}

async function hashPasswordIfPresent(data) {
  if (data.password) {
    data.password = await bcrypt.hash(String(data.password), env.bcryptSaltRounds);
  }
}

function buildCompositeWhere(resource, params) {
  const values = resource.compositeId.map((field) => params[field]);
  if (values.some((value) => value === undefined)) {
    throw new HttpError(400, `Faltan parametros: ${resource.compositeId.join(", ")}`);
  }

  return {
    clause: resource.compositeId.map((field) => `${field} = ?`).join(" AND "),
    values,
  };
}

function createCrudController(resource) {
  return {
    list: async (req, res) => {
      const limit = Math.min(Number(req.query.limit || 50), 100);
      const page = Math.max(Number(req.query.page || 1), 1);
      const offset = (page - 1) * limit;
      const rows = await query(
        `SELECT ${columnsForSelect(resource)} FROM ${resource.table} LIMIT ? OFFSET ?`,
        [limit, offset]
      );

      res.json({ ok: true, page, limit, data: rows });
    },

    getById: async (req, res) => {
      const where = resource.id
        ? { clause: `${resource.id} = ?`, values: [req.params.id] }
        : buildCompositeWhere(resource, req.params);

      const rows = await query(
        `SELECT ${columnsForSelect(resource)} FROM ${resource.table} WHERE ${where.clause}`,
        where.values
      );

      if (!rows.length) {
        throw new HttpError(404, "Registro no encontrado");
      }

      res.json({ ok: true, data: rows[0] });
    },

    create: async (req, res) => {
      const data = pickDefined(req.body, resource.createFields);
      if (!Object.keys(data).length) {
        throw new HttpError(400, "No hay campos validos para crear");
      }

      await hashPasswordIfPresent(data);

      const fields = Object.keys(data);
      const placeholders = fields.map(() => "?").join(", ");
      const values = fields.map((field) => data[field]);
      const result = await query(
        `INSERT INTO ${resource.table} (${fields.join(", ")}) VALUES (${placeholders})`,
        values
      );

      res.status(201).json({
        ok: true,
        message: "Registro creado",
        id: result.insertId || null,
      });
    },

    update: async (req, res) => {
      if (!resource.updateFields.length) {
        throw new HttpError(405, "Este recurso no admite modificacion");
      }

      const data = pickDefined(req.body, resource.updateFields);
      if (!Object.keys(data).length) {
        throw new HttpError(400, "No hay campos validos para actualizar");
      }

      await hashPasswordIfPresent(data);

      const fields = Object.keys(data);
      const values = fields.map((field) => data[field]);
      const where = resource.id
        ? { clause: `${resource.id} = ?`, values: [req.params.id] }
        : buildCompositeWhere(resource, req.params);

      const result = await query(
        `UPDATE ${resource.table} SET ${fields.map((field) => `${field} = ?`).join(", ")} WHERE ${where.clause}`,
        [...values, ...where.values]
      );

      if (!result.affectedRows) {
        throw new HttpError(404, "Registro no encontrado");
      }

      res.json({ ok: true, message: "Registro actualizado" });
    },

    remove: async (req, res) => {
      const where = resource.id
        ? { clause: `${resource.id} = ?`, values: [req.params.id] }
        : buildCompositeWhere(resource, req.params);

      const result = await query(`DELETE FROM ${resource.table} WHERE ${where.clause}`, where.values);
      if (!result.affectedRows) {
        throw new HttpError(404, "Registro no encontrado");
      }

      res.json({ ok: true, message: "Registro eliminado" });
    },
  };
}

module.exports = createCrudController;
