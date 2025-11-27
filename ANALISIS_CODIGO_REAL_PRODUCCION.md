# 🔍 ANÁLISIS DEL CÓDIGO REAL - CONFIGURACIÓN DE PRODUCCIÓN
## SparesApp API - Análisis Basado en el Código Fuente

**Fecha de análisis:** 2025-11-26  
**Basado en:** Código fuente real de `apps/api/src/`

---

## 📍 1. GLOBAL PREFIX

### ✅ CONFIRMADO EN EL CÓDIGO

**Archivo:** `apps/api/src/main.ts`  
**Línea:** 28

```typescript
app.setGlobalPrefix('api');
```

### Respuestas:

- **¿Se llama a `app.setGlobalPrefix()`?**  
  ✅ **SÍ**

- **¿Con qué valor?**  
  ✅ **`'api'`**

- **¿Está condicionado por NODE_ENV?**  
  ❌ **NO** - Se aplica siempre, en desarrollo y producción

### Conclusión:

**TODOS los endpoints tienen el prefijo `/api`**  
- Ejemplo: `/health` → `/api/health`
- Ejemplo: `/auth/login` → `/api/auth/login`
- Ejemplo: `/orders` → `/api/orders`

---

## 🏥 2. HEALTH CHECK

### ✅ CONFIRMADO EN EL CÓDIGO

**Archivo:** `apps/api/src/health/health.controller.ts`

```typescript
@Controller('health')
@PublicApi() // Marcar todo el controlador como público (sin API Key)
export class HealthController {
  @Get()
  check() { ... }

  @Get('ping')
  ping() { ... }
}
```

### Rutas Reales:

1. **Health Check Completo:**
   - **Ruta base del controlador:** `@Controller('health')` → `/health`
   - **Método:** `@Get()` → ruta raíz del controlador
   - **Ruta final con prefijo global:** `/api/health`
   - **URL completa:** `http://3.238.237.181:3000/api/health`

2. **Ping:**
   - **Ruta base del controlador:** `@Controller('health')` → `/health`
   - **Método:** `@Get('ping')` → `/ping`
   - **Ruta final con prefijo global:** `/api/health/ping`
   - **URL completa:** `http://3.238.237.181:3000/api/health/ping`

### Decorador de Seguridad:

✅ **`@PublicApi()`** aplicado a nivel de controlador (línea 5)

**Esto significa:**
- ❌ **NO requiere** `X-API-Key`
- ❌ **NO requiere** `X-App-Id`
- ✅ **Pasa** el `ApiKeyGuard` sin validación
- ⚠️ **PERO** aún debe pasar otros guards (CORS, Origin, etc.)

### Confirmación:

✅ **La documentación menciona `/api/health` y coincide con el código**

---

## 🌐 3. CORS Y ORÍGENES PERMITIDOS

### ✅ CONFIRMADO EN EL CÓDIGO

**Archivo:** `apps/api/src/main.ts`  
**Líneas:** 68-125

### Variables de Entorno que Afectan CORS:

1. **`CORS_ORIGIN`** (línea 68)
   - Se divide por comas: `.split(',')`
   - Valor por defecto: `['http://localhost:4200']`
   - Se usa como fallback si `ALLOWED_ORIGINS` no está definido

2. **`ALLOWED_ORIGINS`** (línea 69) - **PRIMARIO**
   - Se divide por comas: `.split(',')`
   - Si está definido, se usa este (tiene prioridad sobre `CORS_ORIGIN`)
   - Si NO está definido, usa `CORS_ORIGIN`

### Lógica de Validación (líneas 71-105):

```typescript
app.enableCors({
  origin: (origin, callback) => {
    // En producción, rechazar requests sin origin
    if (!origin && process.env.NODE_ENV === 'production') {
      return callback(new Error('Origin requerido'));
    }
    
    // Permitir requests sin origin solo en desarrollo
    if (!origin && process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    // Validar contra lista de orígenes permitidos
    const isValidOrigin = allowedOriginsStrict.some(allowed => {
      if (allowed.includes('*')) {
        const pattern = allowed.replace(/\*/g, '.*');
        return new RegExp(`^${pattern}$`).test(origin);
      }
      return origin === allowed;
    });
    
    if (isValidOrigin) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  // ... más config
});
```

### Comportamiento en Producción:

- ✅ **Requiere header `Origin`** (línea 74)
- ✅ **Valida contra `ALLOWED_ORIGINS`** (o `CORS_ORIGIN` si no existe)
- ✅ **Soporta wildcards** con `*` (se convierte en regex)
- ✅ **Credenciales habilitadas** (`credentials: true`)

### Configuración para CloudFront:

**URL actual de CloudFront:** `https://d3borb3tbumsnf.cloudfront.net`

```bash
# Configuración actual (URL específica)
ALLOWED_ORIGINS=https://d3borb3tbumsnf.cloudfront.net

# Si en el futuro tienes múltiples distribuciones:
ALLOWED_ORIGINS=https://d3borb3tbumsnf.cloudfront.net,https://otra-distribucion.cloudfront.net

# Si CloudFront genera URLs dinámicas (con wildcard):
ALLOWED_ORIGINS=https://*.cloudfront.net
```

**IMPORTANTE:** Si usas wildcard, el código lo convierte en regex: `^https://.*\.cloudfront\.net$`

### Otras Variables Relacionadas:

- **`FRONTEND_URL`** (línea 40): Se usa solo para CSP (Content Security Policy), NO para CORS
- **`ALLOWED_REFERERS`**: Se usa en `OriginValidatorGuard`, NO en CORS de NestJS

---

## 🔒 4. GUARDS GLOBALES Y HEADERS NECESARIOS

### ✅ CONFIRMADO EN EL CÓDIGO

**Archivo:** `apps/api/src/common/security/security.module.ts`  
**Líneas:** 41-64

### Guards Aplicados Globalmente:

1. **CustomThrottlerGuard** (línea 42-44)
   - Rate limiting: 100 requests/minuto (configurable con `RATE_LIMIT_MAX`)
   - **Headers requeridos:** Ninguno

2. **RequestSizeGuard** (línea 46-48)
   - Valida tamaño de body (máx 5MB)
   - **Headers requeridos:** Ninguno

3. **ContentTypeGuard** (línea 50-52)
   - Valida Content-Type
   - **Headers requeridos:** `Content-Type` (para POST/PUT/PATCH)

4. **ApiKeyGuard** (línea 54-56) ⚠️ **CRÍTICO**
   - **Headers requeridos para endpoints NO públicos:**
     - `X-API-Key` (OBLIGATORIO)
     - `X-App-Id` (OPCIONAL, pero validado si está presente)
   - **Para endpoints públicos (`@PublicApi()`):** NO requiere headers

5. **OriginValidatorGuard** (línea 58-60) ⚠️ **CRÍTICO**
   - **Headers requeridos en producción:**
     - `Origin` O `Referer` (al menos uno)
   - **Validación:** Contra `ALLOWED_ORIGINS` y `ALLOWED_REFERERS`

6. **RequestSignatureGuard** (línea 62-64)
   - **En desarrollo:** Permite todo (línea 30-35)
   - **En producción:**
     - Para GET: Valida `X-Client-Time` (opcional pero recomendado)
     - Para POST/PUT/PATCH: Requiere `X-Request-ID` y `X-Client-Time`
     - Opcional: `X-Body-Hash` y `X-Request-Signature`

### Headers Obligatorios por Tipo de Endpoint:

#### Para `/api/health` (endpoint público):

✅ **Headers MÍNIMOS:**
- `Origin` (en producción, si `STRICT_ORIGIN_VALIDATION=true` o `NODE_ENV=production`)

❌ **NO requiere:**
- `X-API-Key`
- `X-App-Id`
- `X-Request-ID`
- `X-Client-Time`

#### Para endpoints NO públicos (ej: `/api/orders`):

✅ **Headers OBLIGATORIOS:**
- `X-API-Key` (debe estar en `API_KEYS`)
- `Origin` (en producción)

✅ **Headers OPCIONALES pero recomendados:**
- `X-App-Id` (si `APP_IDS` está configurado)
- `X-Request-ID` (para POST/PUT/PATCH)
- `X-Client-Time` (para POST/PUT/PATCH)
- `X-Body-Hash` (para POST/PUT/PATCH con body)
- `X-Request-Signature` (para máxima seguridad)

---

## 📋 5. RESUMEN EJECUTIVO

### URL Exacta del Health Check:

```
http://3.238.237.181:3000/api/health
```

### Headers Mínimos para Health Check:

**En PRODUCCIÓN (`NODE_ENV=production`):**

```bash
curl -H "Origin: https://mi-distribucion.cloudfront.net" \
     http://3.238.237.181:3000/api/health
```

**NOTA:** El header `Origin` es requerido en producción por:
1. **CORS de NestJS** (línea 74 de main.ts)
2. **OriginValidatorGuard** (si `STRICT_ORIGIN_VALIDATION=true` o `NODE_ENV=production`)

**NO requiere `X-API-Key`** porque el endpoint está marcado con `@PublicApi()`

### Ejemplo Completo de Curl:

```bash
# Health check básico (desde tu PC)
curl http://3.238.237.181:3000/api/health

# Health check con Origin (requerido en producción)
curl -H "Origin: https://d3borb3tbumsnf.cloudfront.net" \
     http://3.238.237.181:3000/api/health

# Ping
curl -H "Origin: https://d3borb3tbumsnf.cloudfront.net" \
     http://3.238.237.181:3000/api/health/ping
```

### Para Endpoints NO Públicos:

```bash
# Ejemplo: Obtener órdenes
curl -H "X-API-Key: tu-api-key-aqui" \
     -H "Origin: https://d3borb3tbumsnf.cloudfront.net" \
     -H "X-App-Id: tu-app-id" \
     http://3.238.237.181:3000/api/orders
```

---

## 🌍 6. CONFIGURACIÓN PARA CLOUDFRONT

### Variables de Entorno Recomendadas:

```bash
# CORS - URLs permitidas
ALLOWED_ORIGINS=https://mi-distribucion.cloudfront.net

# O si tienes múltiples distribuciones:
ALLOWED_ORIGINS=https://dist1.cloudfront.net,https://dist2.cloudfront.net

# O con wildcard (si CloudFront genera URLs dinámicas):
ALLOWED_ORIGINS=https://*.cloudfront.net

# Frontend URL (para CSP y links en emails)
FRONTEND_URL=https://mi-distribucion.cloudfront.net

# Referers (para OriginValidatorGuard)
ALLOWED_REFERERS=https://mi-distribucion.cloudfront.net/*
```

### Si Usas un Dominio Personalizado:

Si en el futuro usas `https://api.midominio.com`:

```bash
ALLOWED_ORIGINS=https://midominio.com,https://www.midominio.com
FRONTEND_URL=https://midominio.com
ALLOWED_REFERERS=https://midominio.com/*
```

Y la URL del health check sería:
```
https://api.midominio.com/api/health
```

---

## ⚠️ 7. COMPORTAMIENTO EN PRODUCCIÓN vs DESARROLLO

### Diferencias Clave:

| Aspecto | Desarrollo | Producción |
|---------|-----------|------------|
| **CORS sin Origin** | ✅ Permitido | ❌ Rechazado |
| **OriginValidatorGuard** | ✅ Permite localhost | ❌ Estricto |
| **RequestSignatureGuard** | ✅ Permite todo | ⚠️ Valida headers |
| **ApiKeyGuard sin API_KEYS** | ✅ Permite acceso | ❌ Rechaza todo |
| **Mensajes de error** | ✅ Detallados | ❌ Ocultos |

### Validación de Origin en Producción:

**Archivo:** `apps/api/src/common/security/origin-validator.guard.ts`

- **Línea 28-29:** En producción, `strictMode = true` por defecto
- **Línea 88-95:** En modo estricto, requiere `Origin` O `Referer`

**Conclusión:** En producción, **SIEMPRE** se requiere el header `Origin` (o `Referer` como fallback).

---

## 🎯 8. EJEMPLO PRÁCTICO COMPLETO

### Escenario: Producción en EC2

**Configuración:**
- `NODE_ENV=production`
- `PORT=3000`
- `ALLOWED_ORIGINS=https://mi-distribucion.cloudfront.net`
- `API_KEYS=mi-api-key-secreta-123`

### Verificar Health Check desde tu PC:

```bash
# ✅ CORRECTO - Con Origin
curl -H "Origin: https://d3borb3tbumsnf.cloudfront.net" \
     http://3.238.237.181:3000/api/health

# ❌ FALLA - Sin Origin (en producción)
curl http://3.238.237.181:3000/api/health
# Error: "Origin requerido" o "No permitido por CORS"
```

### Verificar Health Check desde el Frontend (CloudFront):

```javascript
// ✅ CORRECTO - El navegador agrega automáticamente el Origin
fetch('http://3.238.237.181:3000/api/health', {
  method: 'GET'
})
// El navegador automáticamente agrega: Origin: https://d3borb3tbumsnf.cloudfront.net
```

**NOTA:** El navegador agrega automáticamente el header `Origin` basado en la URL del frontend, así que normalmente no necesitas agregarlo manualmente.

### Llamar a un Endpoint Protegido:

```bash
# ✅ CORRECTO
curl -H "X-API-Key: mi-api-key-secreta-123" \
     -H "Origin: https://d3borb3tbumsnf.cloudfront.net" \
     -H "X-App-Id: mi-app-id" \
     http://3.238.237.181:3000/api/orders
```

---

## 📊 9. MATRIZ DE HEADERS POR ENDPOINT

| Endpoint | X-API-Key | Origin | X-App-Id | X-Request-ID | X-Client-Time |
|----------|-----------|--------|----------|--------------|---------------|
| `/api/health` | ❌ NO | ✅ SÍ (prod) | ❌ NO | ❌ NO | ❌ NO |
| `/api/health/ping` | ❌ NO | ✅ SÍ (prod) | ❌ NO | ❌ NO | ❌ NO |
| `/api/auth/login` | ❌ NO | ✅ SÍ (prod) | ❌ NO | ❌ NO | ❌ NO |
| `/api/orders` (GET) | ✅ SÍ | ✅ SÍ (prod) | ⚠️ Opcional | ❌ NO | ⚠️ Recomendado |
| `/api/orders` (POST) | ✅ SÍ | ✅ SÍ (prod) | ⚠️ Opcional | ✅ SÍ | ✅ SÍ |

---

## 🔍 10. CITAS DEL CÓDIGO

### Global Prefix:
```28:28:apps/api/src/main.ts
app.setGlobalPrefix('api');
```

### Health Controller:
```4:6:apps/api/src/health/health.controller.ts
@Controller('health')
@PublicApi() // Marcar todo el controlador como público (sin API Key)
export class HealthController {
```

### CORS Configuration:
```68:69:apps/api/src/main.ts
const allowedOrigins = configService.get<string>('CORS_ORIGIN')?.split(',') || ['http://localhost:4200'];
const allowedOriginsStrict = configService.get<string>('ALLOWED_ORIGINS')?.split(',') || allowedOrigins;
```

### CORS en Producción:
```74:79:apps/api/src/main.ts
if (!origin && process.env.NODE_ENV === 'production') {
  return callback(new Error('Origin requerido'));
}

// Permitir requests sin origin solo en desarrollo
if (!origin && process.env.NODE_ENV !== 'production') {
  return callback(null, true);
}
```

### ApiKeyGuard - Endpoints Públicos:
```37:52:apps/api/src/common/security/api-key.guard.ts
canActivate(context: ExecutionContext): boolean {
  const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_API_KEY, [
    context.getHandler(),
    context.getClass(),
  ]);

  // Si es público, permitir acceso sin API key
  if (isPublic) {
    return true;
  }
  // ... validación de API Key
}
```

### OriginValidatorGuard - Modo Estricto:
```28:29:apps/api/src/common/security/origin-validator.guard.ts
this.strictMode = this.configService.get<string>('STRICT_ORIGIN_VALIDATION') === 'true' || 
                  process.env.NODE_ENV === 'production';
```

---

## ✅ CONCLUSIÓN FINAL

### URL Exacta del Health Check:
```
http://3.238.237.181:3000/api/health
```

### Headers Mínimos en Producción:
- ✅ `Origin: https://d3borb3tbumsnf.cloudfront.net` (requerido)
- ❌ `X-API-Key` NO requerido (endpoint público)

### Configuración de CORS para CloudFront:
```bash
ALLOWED_ORIGINS=https://d3borb3tbumsnf.cloudfront.net
FRONTEND_URL=https://d3borb3tbumsnf.cloudfront.net
ALLOWED_REFERERS=https://d3borb3tbumsnf.cloudfront.net/*
```

### Comando Curl Completo:
```bash
curl -H "Origin: https://d3borb3tbumsnf.cloudfront.net" \
     http://3.238.237.181:3000/api/health
```

---

**Última actualización:** 2025-11-26  
**Basado en análisis del código fuente real**

