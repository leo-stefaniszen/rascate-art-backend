# Rascate Art API

Backend completo en Node.js + Express + MySQL para el trabajo final.

## Requisitos

- Node.js
- MySQL o MariaDB
- Ejecutar el script `BASE DE DATOS SQL.sql` en MySQL para crear la base `ProyectoPp`

## Instalacion

```bash
npm install
copy .env.example .env
npm run dev
```

En `.env` configurar usuario y clave de MySQL.

## Autenticacion

Enviar el token JWT en las rutas protegidas:

```http
Authorization: Bearer TU_TOKEN
```

Usuarios del seed:

- Admin: `admin@rascateart.com` / `admin123`
- Usuario: `usuario@gmail.com` / `usuario123`

Al iniciar sesion por primera vez, las claves del seed se migran automaticamente a bcrypt.

## Rutas principales

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `PUT /api/auth/me`
- `GET /api/shop/catalogo`
- `GET /api/shop/productos/:id/detalle`
- `GET /api/shop/mi-carrito`
- `POST /api/shop/mi-carrito/items`
- `PATCH /api/shop/mi-carrito/items/:id`
- `DELETE /api/shop/mi-carrito/items/:id`
- `POST /api/shop/checkout`
- `GET /api/shop/mis-pedidos`
- `GET /api/shop/mis-pedidos/:id`
- `GET /api/admin/dashboard`
- `GET /api/admin/ventas-por-producto`
- `GET /api/admin/materias-primas-bajo-stock`

## CRUD disponibles

Cada recurso tiene:

- `GET /api/{recurso}`
- `GET /api/{recurso}/:id`
- `POST /api/{recurso}`
- `PUT /api/{recurso}/:id`
- `DELETE /api/{recurso}/:id`

Recursos:

- `usuarios`
- `direcciones`
- `categorias`
- `productos`
- `historialPrecios`
- `ofertas`
- `resenas`
- `proveedores`
- `materiasPrimas`
- `comprasInsumos`
- `inventarioTerminados`
- `ordenesProduccion`
- `carritos`
- `detalleCarrito`
- `pedidos`
- `detallePedido`
- `metodosPago`
- `pagos`
- `cuotas`
- `metodosEnvio`
- `envios`

Recursos con clave compuesta:

- `ofertaProducto`: `/api/ofertaProducto/:id_oferta/:id_producto`
- `recetasProductos`: `/api/recetasProductos/:id_producto/:id_materia_prima`

Con estos CRUD mas las rutas de negocio hay mas de 100 endpoints funcionales.

## Ejemplo rapido

```bash
curl -X POST http://localhost:3000/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"admin@rascateart.com\",\"password\":\"admin123\"}"
```
