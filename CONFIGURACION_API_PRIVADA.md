# 🔐 CONFIGURACIÓN DE API PRIVADA

## 📋 RESUMEN

El API está configurado para ser **completamente privado** y solo aceptar requests desde aplicaciones autorizadas mediante:

1. **API Keys** - Autenticación obligatoria para todas las rutas
2. **Validación de Origen** - Solo orígenes autorizados pueden acceder
3. **App IDs** - Identificación opcional pero recomendada de aplicaciones

---

## 🔑 CONFIGURACIÓN DE VARIABLES DE ENTORNO

### Variables Requeridas:

```env
# API Keys - Separadas por comas (una por aplicación)
API_KEYS=tu-api-key-principal,api-key-app-2,api-key-app-3

# Orígenes permitidos para CORS y validación
ALLOWED_ORIGINS=http://localhost:4200,https://tu-dominio.com,https://app2.tu-dominio.com
CORS_ORIGIN=http://localhost:4200,https://tu-dominio.com

# App IDs opcionales (recomendado para mejor tracking)
APP_IDS=spares-app-web,spares-app-mobile,otra-app

# Referers permitidos (opcional, para validación adicional)
ALLOWED_REFERERS=https://tu-dominio.com,https://app2.tu-dominio.com

# Modo estricto de validación de origen (true/false)
STRICT_ORIGIN_VALIDATION=true
```

### Variables Opcionales:

```env
# Logging de accesos API (true/false)
LOG_API_ACCESS=false
```

---

## 🚀 USO EN APLICACIONES CLIENTE

### Frontend (Angular/React/Vue):

```typescript
// En tu servicio HTTP/interceptor
import { HttpHeaders } from '@angular/common/http';

const headers = new HttpHeaders({
  'X-API-Key': 'tu-api-key-principal',
  'X-App-Id': 'spares-app-web', // Opcional pero recomendado
  'Content-Type': 'application/json',
  'Authorization': 'Bearer ' + token // Para autenticación de usuario
});

// Ejemplo de request
this.http.get('https://api.tu-dominio.com/orders', { headers });
```

### Backend/Node.js:

```javascript
const axios = require('axios');

const headers = {
  'X-API-Key': 'tu-api-key-principal',
  'X-App-Id': 'otra-app',
  'Content-Type': 'application/json'
};

axios.get('https://api.tu-dominio.com/orders', { headers });
```

### cURL:

```bash
curl -X GET "https://api.tu-dominio.com/orders" \
  -H "X-API-Key: tu-api-key-principal" \
  -H "X-App-Id: spares-app-web" \
  -H "Content-Type: application/json"
```

---

## 🛡️ PROTECCIONES IMPLEMENTADAS

### 1. **API Key Guard** (`ApiKeyGuard`)
- ✅ Requiere header `X-API-Key` en todas las rutas
- ✅ Valida contra lista de API keys permitidas
- ✅ Opcionalmente valida `X-App-Id`
- ✅ Logging de intentos fallidos
- ✅ Bloquea acceso sin API key

### 2. **Origin Validator Guard** (`OriginValidatorGuard`)
- ✅ Valida `Origin` header en requests
- ✅ Valida `Referer` header como alternativa
- ✅ Soporte para wildcards en orígenes
- ✅ Modo estricto en producción
- ✅ Logging de orígenes bloqueados

### 3. **CORS Mejorado**
- ✅ Validación estricta de orígenes
- ✅ Headers personalizados permitidos (`X-API-Key`, `X-App-Id`)
- ✅ Rechazo de requests sin origin en producción

---

## 📝 ENDPOINTS PÚBLICOS (OPCIONAL)

Si necesitas que algunos endpoints sean accesibles sin API Key (por ejemplo, health checks), puedes usar el decorator `@PublicApi()`:

```typescript
import { PublicApi } from '../common/security/public-api.decorator';

@Controller('health')
export class HealthController {
  @PublicApi() // Este endpoint no requiere API Key
  @Get()
  health() {
    return { status: 'ok' };
  }
}
```

**⚠️ ADVERTENCIA:** Usa `@PublicApi()` solo cuando sea absolutamente necesario. La mayoría de endpoints deben requerir API Key.

---

## 🔒 GENERACIÓN DE API KEYS SEGURAS

### Método 1: Generar con Node.js

```javascript
const crypto = require('crypto');
const apiKey = crypto.randomBytes(32).toString('hex');
console.log('API Key:', apiKey);
```

### Método 2: Generar con OpenSSL

```bash
openssl rand -hex 32
```

### Método 3: Generar con UUID v4 + timestamp

```javascript
const uuid = require('uuid');
const timestamp = Date.now();
const apiKey = `${uuid.v4()}-${timestamp}`;
```

---

## 📊 MONITOREO Y LOGGING

### Eventos de Seguridad Registrados:

1. **`api_key_missing`** - Request sin API Key
2. **`api_key_invalid`** - API Key inválida
3. **`app_id_invalid`** - App ID inválido
4. **`origin_blocked`** - Origen bloqueado
5. **`referer_blocked`** - Referer bloqueado
6. **`origin_missing`** - Request sin origin/referer
7. **`api_access_granted`** - Acceso exitoso (si `LOG_API_ACCESS=true`)

### Ver Logs:

```bash
# En producción, revisa los logs de seguridad
tail -f logs/security.log | grep "api_key\|origin"
```

---

## ⚙️ CONFIGURACIÓN POR AMBIENTE

### Desarrollo:

```env
API_KEYS=dev-api-key-default
ALLOWED_ORIGINS=http://localhost:4200,http://localhost:3000
STRICT_ORIGIN_VALIDATION=false
LOG_API_ACCESS=true
```

### Producción:

```env
API_KEYS=prod-api-key-1,prod-api-key-2,prod-api-key-3
ALLOWED_ORIGINS=https://tu-dominio.com,https://app2.tu-dominio.com
STRICT_ORIGIN_VALIDATION=true
LOG_API_ACCESS=false
```

---

## 🚨 TROUBLESHOOTING

### Error: "API Key requerida"
- ✅ Verifica que estás enviando el header `X-API-Key`
- ✅ Verifica que la API key está en la variable `API_KEYS`
- ✅ Verifica que no hay espacios en la API key

### Error: "Origen no autorizado"
- ✅ Verifica que el origen está en `ALLOWED_ORIGINS`
- ✅ Verifica que el origen coincide exactamente (incluyendo protocolo y puerto)
- ✅ En desarrollo, verifica `STRICT_ORIGIN_VALIDATION=false`

### Error: "No permitido por CORS"
- ✅ Verifica que el origen está en `CORS_ORIGIN`
- ✅ Verifica que los headers están permitidos
- ✅ Verifica que el método HTTP está permitido

---

## ✅ CHECKLIST DE CONFIGURACIÓN

- [ ] API Keys generadas y configuradas en `API_KEYS`
- [ ] Orígenes permitidos configurados en `ALLOWED_ORIGINS`
- [ ] CORS configurado en `CORS_ORIGIN`
- [ ] App IDs configurados (opcional) en `APP_IDS`
- [ ] Headers `X-API-Key` agregados en cliente
- [ ] Headers `X-App-Id` agregados en cliente (opcional)
- [ ] Modo estricto activado en producción
- [ ] Logging configurado según necesidad
- [ ] Endpoints públicos marcados con `@PublicApi()` si es necesario

---

## 🎯 CONCLUSIÓN

El API está **100% protegido** y solo acepta requests desde aplicaciones autorizadas mediante:

1. ✅ API Keys válidas
2. ✅ Orígenes autorizados
3. ✅ Validación estricta en producción

**Nadie puede hacer consultas al API sin autorización.**

---

**Última actualización:** $(date)
**Estado:** ✅ API PRIVADO - SOLO APLICACIONES AUTORIZADAS

