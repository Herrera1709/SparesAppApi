# ImportaCR - Plataforma de Importación

Plataforma web para ayudar a las personas en Costa Rica a importar cualquier producto del mundo desde Amazon, eBay y otras tiendas internacionales. 

**Nuestro gancho inicial:** Repuestos KTM (un nicho no resuelto en Costa Rica)  
**Nuestro servicio real:** Importaciones de cualquier producto que necesites.

## 🏗️ Arquitectura del Proyecto

Este es un **monorepo** que contiene:

- **Backend (NestJS)**: API REST en `apps/api/`
- **Frontend (Angular)**: Aplicación web en `SparesAppWeb/`
- **Base de Datos**: PostgreSQL con Prisma ORM

### Estructura del Backend

```
apps/api/
├── prisma/
│   └── schema.prisma          # Esquema de la base de datos
├── src/
│   ├── auth/                  # Módulo de autenticación (JWT)
│   ├── users/                 # Gestión de usuarios
│   ├── addresses/             # Direcciones de envío
│   ├── orders/                # Órdenes/pedidos
│   ├── prisma/                # Servicio de Prisma
│   ├── config/                # Configuración
│   └── main.ts                # Punto de entrada
└── package.json
```

### Estructura del Frontend

```
SparesAppWeb/
├── src/app/
│   ├── components/
│   │   ├── landing/           # Página de inicio pública
│   │   ├── login/             # Login
│   │   ├── register/          # Registro
│   │   ├── dashboard/         # Panel de usuario
│   │   ├── new-order/         # Crear nueva orden
│   │   └── admin/             # Panel de administración
│   ├── services/              # Servicios HTTP
│   ├── models/                # Modelos TypeScript
│   ├── guards/                # Guards de autenticación
│   └── interceptors/          # Interceptores HTTP
└── package.json
```

## 🚀 Instalación y Configuración

### Prerrequisitos

- Node.js 18+ 
- PostgreSQL 14+
- npm o yarn

### 1. Configurar Base de Datos

1. Crea una base de datos PostgreSQL:
```sql
CREATE DATABASE spares_app;
```

2. Configura la URL de conexión en el archivo `.env` del backend:
```env
DATABASE_URL="postgresql://usuario:password@localhost:5432/spares_app?schema=public"
```

### 2. Backend (API)

**Opción 1: Desde la raíz del proyecto (recomendado)**

```bash
# Desde C:\Users\Administrator\Desktop\SparesAppApi

# Instalar dependencias del API
cd apps/api
npm install
cd ../..

# Generar cliente de Prisma
npm run prisma:generate

# Ejecutar migraciones (primera vez)
npm run prisma:migrate

# Iniciar en modo desarrollo
npm run dev
# o
npm run start:dev
```

**Opción 2: Desde el directorio apps/api**

```bash
cd apps/api

# Instalar dependencias
npm install

# Generar cliente de Prisma
npm run prisma:generate

# Ejecutar migraciones
npm run prisma:migrate

# Iniciar en modo desarrollo
npm run start:dev
```

El servidor estará disponible en `http://localhost:3000`

### 3. Frontend (Angular)

```bash
cd SparesAppWeb

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm start
```

La aplicación estará disponible en `http://localhost:4200`

## 📊 Modelo de Datos

### Usuarios (User)
- Información básica del usuario
- Roles: USER, ADMIN
- Relación con direcciones y órdenes

### Direcciones (Address)
- Direcciones de envío del usuario
- Soporte para dirección por defecto
- Campos: street, city, province, postalCode, country

### Órdenes (Order)
- Pedidos de importación
- Estados: REQUESTED, QUOTED, PAYMENT_PENDING, PAID, IN_TRANSIT, IN_CUSTOMS, READY_FOR_PICKUP, DELIVERED, CANCELLED
- Precios: itemPrice, shippingCost, taxes, serviceFee, totalPrice
- Link externo al producto original

### Historial de Estados (OrderStatusHistory)
- Registro de cambios de estado de cada orden
- Incluye notas y timestamps

## 🔐 Autenticación

El sistema usa JWT (JSON Web Tokens) para autenticación:

1. **Registro**: `POST /auth/register`
2. **Login**: `POST /auth/login`
3. Las rutas protegidas requieren el header: `Authorization: Bearer <token>`

## 📡 Endpoints Principales

### Autenticación
- `POST /auth/register` - Registro de usuario
- `POST /auth/login` - Inicio de sesión

### Usuarios
- `GET /users/me` - Obtener perfil (requiere auth)
- `PUT /users/me` - Actualizar perfil (requiere auth)

### Direcciones
- `GET /addresses` - Listar direcciones (requiere auth)
- `POST /addresses` - Crear dirección (requiere auth)
- `PATCH /addresses/:id` - Actualizar dirección (requiere auth)
- `DELETE /addresses/:id` - Eliminar dirección (requiere auth)

### Órdenes
- `GET /orders` - Listar órdenes (requiere auth, admin ve todas)
- `GET /orders/:id` - Obtener orden (requiere auth)
- `POST /orders` - Crear orden (requiere auth)
- `PATCH /orders/:id` - Actualizar orden (requiere auth, admin puede editar precios)
- `DELETE /orders/:id` - Eliminar orden (solo admin)

## 🎯 Funcionalidades Implementadas

### Para Usuarios
- ✅ Registro e inicio de sesión
- ✅ Perfil de usuario
- ✅ Gestión de direcciones de envío
- ✅ Crear órdenes pegando links externos
- ✅ Ver lista de sus órdenes
- ✅ Ver estado y tracking de cada orden

### Para Administradores
- ✅ Ver todas las órdenes del sistema
- ✅ Actualizar estado de órdenes
- ✅ Editar precios (artículo, envío, impuestos, servicio)
- ✅ Agregar número de tracking
- ✅ Ver historial de estados

## 🔧 Variables de Entorno

Crea un archivo `.env` en `apps/api/` basado en `env.example`:

```env
PORT=3000
NODE_ENV=development
DATABASE_URL="postgresql://user:password@localhost:5432/spares_app?schema=public"
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:4200
```

## 📝 Próximos Pasos

- [ ] Implementar scraping básico de links para extraer nombre y precio
- [ ] Sistema de notificaciones por email
- [ ] Integración con pasarela de pagos
- [ ] Dashboard con estadísticas
- [ ] Sistema de cotizaciones automáticas
- [ ] API para tracking de envíos
- [ ] Soporte para múltiples direcciones de almacén fiscal

## 🛠️ Comandos Útiles

### Backend (desde la raíz del proyecto)

```bash
# Desarrollo
npm run dev            # Iniciar servidor en modo desarrollo
npm run start:dev      # Mismo que arriba

# Prisma
npm run prisma:generate  # Generar cliente de Prisma
npm run prisma:migrate   # Ejecutar migraciones
npm run prisma:studio    # Abrir Prisma Studio (GUI de BD)

# Producción
npm run build          # Compilar para producción
npm run start          # Iniciar servidor en producción
```

**Nota:** Si estás dentro de `apps/api`, puedes usar los comandos directamente:
```bash
cd apps/api
npm run start:dev
npm run prisma:generate
# etc.
```

### Frontend
```bash
npm start              # Servidor de desarrollo
npm run build          # Compilar para producción
```

## 📄 Licencia

ISC
