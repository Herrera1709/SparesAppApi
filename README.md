# Spares App API

API REST para la aplicación de repuestos de motocicletas.

## 🚀 Inicio Rápido

### Instalación

```bash
npm install
```

### Desarrollo

```bash
npm run dev
```

El servidor se ejecutará en `http://localhost:3000`

### Producción

```bash
npm run build
npm start
```

## 📁 Estructura del Proyecto

```
src/
├── server.ts              # Archivo principal del servidor
├── models/                # Modelos de datos
│   └── Product.model.ts
├── controllers/           # Controladores
│   └── product.controller.ts
├── routes/                # Rutas
│   └── product.routes.ts
└── middleware/            # Middleware personalizado
    └── errorHandler.ts
```

## 📡 Endpoints

### Productos

- `GET /api/products` - Obtener todos los productos
  - Query params: `category`, `brand`, `search`
- `GET /api/products/:id` - Obtener un producto por ID
- `GET /api/products/category/:category` - Obtener productos por categoría
- `POST /api/products` - Crear un nuevo producto
- `PUT /api/products/:id` - Actualizar un producto
- `DELETE /api/products/:id` - Eliminar un producto

### Health Check

- `GET /health` - Verificar estado del servidor

## 🔧 Tecnologías

- Node.js
- Express
- TypeScript
- CORS

## 📝 Variables de Entorno

Crea un archivo `.env` basado en `.env.example`:

```
PORT=3000
NODE_ENV=development
```

