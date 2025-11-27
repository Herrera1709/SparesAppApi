# 📋 RESUMEN COMPLETO - CONFIGURACIÓN DE PRODUCCIÓN
## SparesApp - Frontend (S3/CloudFront) ↔ Backend (EC2)

---

## 🎯 **CONFIGURACIÓN DEL FRONTEND (S3/CloudFront)**

### **Archivo:** `src/environments/environment.prod.ts`

```typescript
export const environment = {
  production: true,
  apiUrl: 'http://3.238.237.181:3000/api',
  apiKey: 'efdc60a3b2db5610326f5e68b1608ef1667f1545438be6ac965d5989b5bd5d69',
  appId: 'spares-app-web',
};
```

### **Detalles:**
- **URL del API:** `http://3.238.237.181:3000/api`
  - IP del servidor EC2: `3.238.237.181`
  - Puerto: `3000`
  - Prefijo global: `/api` (agregado automáticamente por el backend)
  
- **API Key:** `efdc60a3b2db5610326f5e68b1608ef1667f1545438be6ac965d5989b5bd5d69`
  - Se envía automáticamente en el header `X-API-Key` en cada request
  - **DEBE coincidir exactamente** con la configurada en el backend
  
- **App ID:** `spares-app-web`
  - Se envía automáticamente en el header `X-App-Id`
  - **DEBE coincidir** con `APP_IDS` en el backend

### **Cómo funciona:**
1. Los servicios Angular usan `environment.apiUrl` como base
2. El `security.interceptor.ts` agrega automáticamente:
   - Header `X-API-Key` con la API key
   - Header `X-App-Id` con el app ID
   - Header `Authorization: Bearer <token>` si el usuario está autenticado
3. Ejemplo de requests:
   - Login: `POST http://3.238.237.181:3000/api/auth/login`
   - Orders: `GET http://3.238.237.181:3000/api/orders`
   - Inventory: `GET http://3.238.237.181:3000/api/inventory/products`

---

## 🔒 **CONFIGURACIÓN DEL BACKEND (EC2)**

### **Archivo:** `.env` en el servidor EC2

```bash
# ============================================
# ENTORNO
# ============================================
NODE_ENV=production
PORT=3000

# ============================================
# BASE DE DATOS (PostgreSQL) - RDS AWS
# ============================================
DATABASE_URL=postgresql://postgres:Ronaldonazario4090@spareapp-db.czksgy6uo0rq.us-east-1.rds.amazonaws.com:5432/postgres?schema=public

# ============================================
# SEGURIDAD - JWT
# ============================================
JWT_SECRET=tu-jwt-secret-aqui
JWT_EXPIRES_IN=24h

# ============================================
# SEGURIDAD - API KEYS (CRÍTICO)
# ============================================
API_KEYS=efdc60a3b2db5610326f5e68b1608ef1667f1545438be6ac965d5989b5bd5d69
APP_IDS=spares-app-web

# ============================================
# SEGURIDAD - CORS - CloudFront
# ============================================
CORS_ORIGIN=https://d3borb3tbumsnf.cloudfront.net
ALLOWED_ORIGINS=https://d3borb3tbumsnf.cloudfront.net
ALLOWED_REFERERS=https://d3borb3tbumsnf.cloudfront.net/*
FRONTEND_URL=https://d3borb3tbumsnf.cloudfront.net

# ============================================
# EMAIL (Resend)
# ============================================
RESEND_API_KEY=re_123456789
RESEND_FROM=tickets@tiketpass.net
RESEND_RPS_LIMIT=2
RESEND_MAX_RETRIES=5
RESEND_DISABLE_IDEMPOTENCY=0

# ============================================
# SEGURIDAD AVANZADA
# ============================================
RATE_LIMIT_MAX=100
STRICT_ORIGIN_VALIDATION=true
REQUEST_SIGNATURE_SECRET=
IP_WHITELIST=
IP_BLACKLIST=
LOG_API_ACCESS=false
```

### **Detalles Críticos:**

#### **1. API Keys (Validación de Aplicación)**
- **`API_KEYS`:** `efdc60a3b2db5610326f5e68b1608ef1667f1545438be6ac965d5989b5bd5d69`
  - El backend valida que cada request tenga el header `X-API-Key` con este valor
  - Si no coincide, rechaza la request con `401 Unauthorized`
  - **DEBE ser idéntica** a la del frontend

- **`APP_IDS`:** `spares-app-web`
  - Valida el header `X-App-Id`
  - Opcional pero recomendado para tracking

#### **2. CORS (Cross-Origin Resource Sharing)**
- **`CORS_ORIGIN`:** `https://d3borb3tbumsnf.cloudfront.net`
- **`ALLOWED_ORIGINS`:** `https://d3borb3tbumsnf.cloudfront.net`
  - Solo permite requests desde CloudFront
  - El backend valida el header `Origin` de cada request
  - Si el origen no está en la lista, rechaza con error CORS

- **`ALLOWED_REFERERS`:** `https://d3borb3tbumsnf.cloudfront.net/*`
  - Valida el header `Referer` (opcional)

- **`FRONTEND_URL`:** `https://d3borb3tbumsnf.cloudfront.net`
  - URL base del frontend para redirecciones

#### **3. Prefijo Global del API**
- El backend tiene configurado: `app.setGlobalPrefix('api')`
- Todas las rutas tienen el prefijo `/api`
- Ejemplo: `/auth/login` → `/api/auth/login`

#### **4. Seguridad Adicional**
- **Rate Limiting:** Máximo 100 requests por minuto por IP
- **Validación Estricta de Origen:** `STRICT_ORIGIN_VALIDATION=true`
- **Helmet:** Headers de seguridad HTTP
- **Body Size Limit:** Máximo 5MB por request

---

## 🔄 **FLUJO DE COMUNICACIÓN**

### **1. Request desde Frontend (CloudFront) → Backend (EC2)**

```
Frontend (https://d3borb3tbumsnf.cloudfront.net)
    ↓
Request HTTP:
  - URL: http://3.238.237.181:3000/api/auth/login
  - Headers:
    - Origin: https://d3borb3tbumsnf.cloudfront.net
    - X-API-Key: efdc60a3b2db5610326f5e68b1608ef1667f1545438be6ac965d5989b5bd5d69
    - X-App-Id: spares-app-web
    - Content-Type: application/json
    ↓
Backend (EC2 - 3.238.237.181:3000)
    ↓
Validaciones:
  1. ✅ CORS: Origin permitido? → SÍ (https://d3borb3tbumsnf.cloudfront.net)
  2. ✅ API Key: X-API-Key válida? → SÍ (coincide con API_KEYS)
  3. ✅ App ID: X-App-Id válido? → SÍ (coincide con APP_IDS)
  4. ✅ Rate Limit: Dentro del límite? → Verificar
    ↓
✅ Request procesada
```

### **2. Validaciones que Hace el Backend**

1. **ApiKeyGuard** (Global):
   - Verifica header `X-API-Key`
   - Compara con `API_KEYS` del `.env`
   - Si no coincide → `401 Unauthorized`

2. **CORS Middleware**:
   - Verifica header `Origin`
   - Compara con `ALLOWED_ORIGINS`
   - Si no coincide → Error CORS (bloqueado por navegador)

3. **Origin Validator Guard** (Opcional):
   - Validación adicional del origen
   - Verifica `Referer` si está configurado

4. **Rate Limiting**:
   - Limita requests por IP
   - Máximo: `RATE_LIMIT_MAX` (100 por minuto)

---

## ✅ **CHECKLIST DE CONFIGURACIÓN**

### **Frontend (S3/CloudFront):**
- [x] `apiUrl` configurado: `http://3.238.237.181:3000/api`
- [x] `apiKey` configurada: `efdc60a3b2db5610326f5e68b1608ef1667f1545438be6ac965d5989b5bd5d69`
- [x] `appId` configurado: `spares-app-web`
- [x] Build de producción generado
- [ ] Desplegado en S3/CloudFront

### **Backend (EC2):**
- [x] `API_KEYS` configurado: `efdc60a3b2db5610326f5e68b1608ef1667f1545438be6ac965d5989b5bd5d69`
- [x] `APP_IDS` configurado: `spares-app-web`
- [x] `CORS_ORIGIN` configurado: `https://d3borb3tbumsnf.cloudfront.net`
- [x] `ALLOWED_ORIGINS` configurado: `https://d3borb3tbumsnf.cloudfront.net`
- [x] `ALLOWED_REFERERS` configurado: `https://d3borb3tbumsnf.cloudfront.net/*`
- [x] `FRONTEND_URL` configurado: `https://d3borb3tbumsnf.cloudfront.net`
- [x] `DATABASE_URL` configurado (RDS AWS)
- [ ] Servidor corriendo en EC2 (puerto 3000)
- [ ] Prefijo global `/api` activo

---

## 🚨 **PROBLEMAS COMUNES Y SOLUCIONES**

### **Error: 401 Unauthorized - API Key inválida**
- **Causa:** La API key del frontend no coincide con `API_KEYS` del backend
- **Solución:** Verificar que ambas sean idénticas (sin espacios, sin saltos de línea)

### **Error: CORS bloqueado**
- **Causa:** El origen de la request no está en `ALLOWED_ORIGINS`
- **Solución:** Verificar que `ALLOWED_ORIGINS` incluya `https://d3borb3tbumsnf.cloudfront.net`

### **Error: 404 Not Found**
- **Causa:** La ruta no tiene el prefijo `/api`
- **Solución:** Verificar que el frontend use `apiUrl: 'http://3.238.237.181:3000/api'` (con `/api`)

### **Error: Connection refused**
- **Causa:** El servidor EC2 no está corriendo o el puerto 3000 está bloqueado
- **Solución:** 
  - Verificar que el servidor esté corriendo: `pm2 status`
  - Verificar que el puerto 3000 esté abierto en el Security Group de EC2

---

## 📝 **COMANDOS ÚTILES**

### **En EC2:**
```bash
# Verificar que el servidor esté corriendo
pm2 status

# Reiniciar el servidor
pm2 restart spares-app-api

# Ver logs
pm2 logs spares-app-api

# Verificar variables de entorno
cat .env | grep API_KEYS
cat .env | grep ALLOWED_ORIGINS
```

### **Probar desde terminal:**
```bash
# Health check (endpoint público, no requiere API key)
curl http://3.238.237.181:3000/api/health

# Test con API key
curl -H "X-API-Key: efdc60a3b2db5610326f5e68b1608ef1667f1545438be6ac965d5989b5bd5d69" \
     -H "X-App-Id: spares-app-web" \
     -H "Origin: https://d3borb3tbumsnf.cloudfront.net" \
     http://3.238.237.181:3000/api/health
```

---

## 🔐 **VALORES CRÍTICOS QUE DEBEN COINCIDIR**

| Frontend | Backend (.env) | Estado |
|----------|---------------|--------|
| `apiKey` | `API_KEYS` | ✅ Deben ser **idénticos** |
| `appId` | `APP_IDS` | ✅ Deben ser **idénticos** |
| `apiUrl` (origen) | `ALLOWED_ORIGINS` | ✅ CloudFront debe estar en la lista |
| `apiUrl` (destino) | `PORT` | ✅ Puerto 3000 |

---

## 📍 **URLs IMPORTANTES**

- **Frontend (CloudFront):** `https://d3borb3tbumsnf.cloudfront.net`
- **Backend API (EC2):** `http://3.238.237.181:3000/api`
- **Health Check:** `http://3.238.237.181:3000/api/health`
- **Base de Datos (RDS):** `spareapp-db.czksgy6uo0rq.us-east-1.rds.amazonaws.com:5432`

---

**Última actualización:** 2025-11-26
**Versión:** 1.0.0

