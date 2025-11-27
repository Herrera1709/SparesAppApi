# 🔒 CONFIGURACIÓN COMPLETA PARA PRODUCCIÓN
## SparesApp API - Guía de Despliegue y Seguridad

---

## 📋 ÍNDICE

1. [Variables de Entorno Requeridas](#variables-de-entorno)
2. [Configuración de Seguridad](#configuración-de-seguridad)
3. [Guards y Middlewares Activos](#guards-y-middlewares)
4. [Configuración de Base de Datos](#base-de-datos)
5. [Configuración de Email](#email)
6. [Configuración del Servidor](#servidor)
7. [Checklist de Producción](#checklist)
8. [Monitoreo y Logging](#monitoreo)
9. [Backup y Recuperación](#backup)
10. [Troubleshooting](#troubleshooting)

---

## 🔐 VARIABLES DE ENTORNO

### Variables OBLIGATORIAS para Producción

```bash
# ============================================
# ENTORNO
# ============================================
NODE_ENV=production

# ============================================
# SERVIDOR
# ============================================
PORT=3000

# ============================================
# BASE DE DATOS (PostgreSQL)
# ============================================
DATABASE_URL=postgresql://usuario:password@host:5432/database?schema=public

# ============================================
# SEGURIDAD - JWT
# ============================================
JWT_SECRET=tu-secret-super-seguro-minimo-32-caracteres-aleatorios
JWT_EXPIRES_IN=24h

# ============================================
# SEGURIDAD - API KEYS (CRÍTICO)
# ============================================
# Múltiples API keys separadas por comas
API_KEYS=api-key-1-super-segura,api-key-2-super-segura,api-key-3-super-segura
APP_IDS=app-id-1,app-id-2

# ============================================
# SEGURIDAD - CORS
# ============================================
# URLs permitidas separadas por comas (SIN espacios después de comas)
# CloudFront actual: https://d3borb3tbumsnf.cloudfront.net
CORS_ORIGIN=https://d3borb3tbumsnf.cloudfront.net
ALLOWED_ORIGINS=https://d3borb3tbumsnf.cloudfront.net
ALLOWED_REFERERS=https://d3borb3tbumsnf.cloudfront.net/*

# ============================================
# FRONTEND
# ============================================
FRONTEND_URL=https://d3borb3tbumsnf.cloudfront.net

# ============================================
# EMAIL (Resend)
# ============================================
RESEND_API_KEY=re_tu-api-key-de-resend
RESEND_FROM=tickets@tiketpass.net
RESEND_RPS_LIMIT=2
RESEND_MAX_RETRIES=5
RESEND_DISABLE_IDEMPOTENCY=0
```

### Variables OPCIONALES (pero recomendadas)

```bash
# ============================================
# SEGURIDAD AVANZADA
# ============================================
# Rate Limiting
RATE_LIMIT_MAX=100

# Validación de origen estricta
STRICT_ORIGIN_VALIDATION=true

# Firma de requests
REQUEST_SIGNATURE_SECRET=otro-secret-diferente-al-jwt

# Whitelist/Blacklist de IPs (opcional)
IP_WHITELIST=1.2.3.4,5.6.7.8
IP_BLACKLIST=9.10.11.12

# ============================================
# LOGGING
# ============================================
LOG_API_ACCESS=false  # true para loggear todos los accesos (puede ser pesado)
```

---

## 🛡️ CONFIGURACIÓN DE SEGURIDAD

### 1. Headers de Seguridad (Helmet)

✅ **Configurado automáticamente:**
- Content Security Policy (CSP)
- XSS Protection
- HSTS (HTTP Strict Transport Security)
- No Sniff
- Referrer Policy
- X-Powered-By removido

### 2. CORS (Cross-Origin Resource Sharing)

✅ **Configuración estricta:**
- Solo orígenes permitidos en `ALLOWED_ORIGINS`
- Credentials habilitados
- Métodos permitidos: GET, POST, PUT, PATCH, DELETE, OPTIONS
- Headers personalizados permitidos
- Max Age: 24 horas

### 3. Rate Limiting

✅ **Configurado:**
- Límite por defecto: 100 requests por minuto
- Configurable con `RATE_LIMIT_MAX`
- Aplicado globalmente a todos los endpoints

### 4. Validación de Input

✅ **Configurado:**
- Whitelist activado (elimina propiedades no definidas)
- ForbidNonWhitelisted activado (rechaza propiedades extra)
- Transformación automática de tipos
- Mensajes de error ocultos en producción

### 5. Límites de Tamaño

✅ **Configurado:**
- Body máximo: 5MB
- Prevención de DoS por payloads grandes

---

## 🔒 GUARDS Y MIDDLEWARES ACTIVOS

### Guards Globales (aplicados a TODOS los endpoints)

1. **CustomThrottlerGuard** - Rate Limiting
   - Previene: Ataques de fuerza bruta, DoS
   - Configuración: `RATE_LIMIT_MAX`

2. **RequestSizeGuard** - Validación de tamaño
   - Previene: DoS por payloads grandes
   - Límite: 5MB

3. **ContentTypeGuard** - Validación de Content-Type
   - Previene: Ataques de inyección
   - Valida headers Content-Type

4. **ApiKeyGuard** - Validación de API Key
   - Previene: Acceso no autorizado
   - Requiere: Header `X-API-Key`
   - Opcional: Header `X-App-Id`
   - Excepciones: Endpoints marcados con `@PublicApi()`

5. **OriginValidatorGuard** - Validación de origen
   - Previene: CSRF, acceso desde dominios no autorizados
   - Valida: Origin y Referer headers
   - Configuración: `ALLOWED_ORIGINS`, `ALLOWED_REFERERS`

6. **RequestSignatureGuard** - Validación de firma
   - Previene: Manipulación de requests
   - Valida: Firma de requests (opcional)
   - Configuración: `REQUEST_SIGNATURE_SECRET`

### Pipes Globales

1. **ArrayValidatorPipe** - Validación de arrays
2. **StringLengthPipe** - Validación de longitud de strings

### Interceptors Globales

1. **QuerySanitizerInterceptor** - Sanitización de queries
   - Previene: SQL Injection, XSS en queries

---

## 🗄️ BASE DE DATOS

### PostgreSQL - Configuración Recomendada

```bash
# Connection String
DATABASE_URL=postgresql://usuario:password@host:5432/database?schema=public
```

### Configuración de Producción

1. **Conexiones:**
   - Pool de conexiones configurado por Prisma
   - Timeout: Configurar según necesidad

2. **SSL:**
   - En producción, usar SSL obligatorio:
   ```
   DATABASE_URL=postgresql://...?sslmode=require
   ```

3. **Backups:**
   - Configurar backups automáticos diarios
   - Retener backups por al menos 30 días

4. **Migraciones:**
   ```bash
   # Aplicar migraciones
   npx prisma migrate deploy
   
   # Regenerar cliente
   npx prisma generate
   ```

---

## 📧 EMAIL

### Resend - Configuración

```bash
RESEND_API_KEY=re_tu-api-key
RESEND_FROM=tickets@tiketpass.net
RESEND_RPS_LIMIT=2          # Requests por segundo
RESEND_MAX_RETRIES=5        # Reintentos máximos
RESEND_DISABLE_IDEMPOTENCY=0  # 0 = habilitado, 1 = deshabilitado
```

### Verificación

✅ El servicio de email:
- Limita rate de envío automáticamente
- Implementa retry con backoff exponencial
- Usa idempotency keys para evitar duplicados
- Loggea todos los envíos

---

## 🖥️ SERVIDOR

### Configuración Recomendada

1. **Node.js:**
   - Versión: 18.x o superior
   - Usar PM2 o similar para gestión de procesos

2. **PM2 Configuration (ecosystem.config.js):**
   ```javascript
   module.exports = {
     apps: [{
       name: 'spares-app-api',
       script: './dist/main.js',
       instances: 'max',
       exec_mode: 'cluster',
       env: {
         NODE_ENV: 'production',
         PORT: 3000
       },
       error_file: './logs/err.log',
       out_file: './logs/out.log',
       log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
       merge_logs: true,
       max_memory_restart: '1G'
     }]
   };
   ```

3. **Nginx (Recomendado):**
   ```nginx
   server {
       listen 80;
       server_name api.tu-dominio.com;
       
       # Redirigir a HTTPS
       return 301 https://$server_name$request_uri;
   }

   server {
       listen 443 ssl http2;
       server_name api.tu-dominio.com;

       ssl_certificate /path/to/cert.pem;
       ssl_certificate_key /path/to/key.pem;
       ssl_protocols TLSv1.2 TLSv1.3;
       ssl_ciphers HIGH:!aNULL:!MD5;

       location /api {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

4. **Firewall (Security Groups en EC2):**
   - Puerto 3000: Solo localhost
   - Puerto 80/443: Público (si usas Nginx)
   - SSH: Solo desde IPs conocidas

---

## ✅ CHECKLIST DE PRODUCCIÓN

### Pre-Despliegue

- [ ] **Variables de Entorno:**
  - [ ] `NODE_ENV=production` configurado
  - [ ] `JWT_SECRET` generado (mínimo 32 caracteres aleatorios)
  - [ ] `API_KEYS` configuradas (múltiples para diferentes apps)
  - [ ] `DATABASE_URL` configurado con SSL
  - [ ] `CORS_ORIGIN` y `ALLOWED_ORIGINS` configurados
  - [ ] `FRONTEND_URL` configurado
  - [ ] `RESEND_API_KEY` configurado

- [ ] **Base de Datos:**
  - [ ] Migraciones aplicadas (`npx prisma migrate deploy`)
  - [ ] Cliente Prisma regenerado (`npx prisma generate`)
  - [ ] Backups configurados
  - [ ] SSL habilitado en conexión

- [ ] **Seguridad:**
  - [ ] API Keys generadas y seguras
  - [ ] JWT Secret único y seguro
  - [ ] CORS configurado correctamente
  - [ ] Rate limiting configurado
  - [ ] Firewall/Security Groups configurados

- [ ] **Servidor:**
  - [ ] Node.js versión correcta instalada
  - [ ] PM2 o similar configurado
  - [ ] Nginx configurado (si aplica)
  - [ ] SSL/TLS certificados instalados
  - [ ] Logs configurados

- [ ] **Aplicación:**
  - [ ] Código compilado (`npm run build`)
  - [ ] Dependencias instaladas (`npm ci --production`)
  - [ ] Health check funcionando (`/api/health`)

### Post-Despliegue

- [ ] **Verificación:**
  - [ ] Health check responde correctamente
  - [ ] Endpoints públicos funcionan
  - [ ] Endpoints protegidos requieren autenticación
  - [ ] Rate limiting funciona
  - [ ] CORS funciona correctamente
  - [ ] Emails se envían correctamente

- [ ] **Monitoreo:**
  - [ ] Logs se están generando
  - [ ] Errores se están capturando
  - [ ] Métricas de rendimiento disponibles
  - [ ] Alertas configuradas

- [ ] **Documentación:**
  - [ ] Endpoints documentados
  - [ ] Variables de entorno documentadas
  - [ ] Proceso de despliegue documentado

---

## 📊 MONITOREO Y LOGGING

### Logs Recomendados

1. **Aplicación:**
   - Logs de errores
   - Logs de seguridad (intentos fallidos, etc.)
   - Logs de acceso (opcional con `LOG_API_ACCESS=true`)

2. **Servidor:**
   - Logs de sistema
   - Logs de Nginx (si aplica)
   - Logs de PM2

### Métricas a Monitorear

- CPU y Memoria del servidor
- Tiempo de respuesta de la API
- Tasa de errores
- Rate limiting (requests bloqueados)
- Conexiones a base de datos
- Uso de disco

### Herramientas Recomendadas

- **PM2:** Monitoreo de procesos Node.js
- **New Relic / Datadog:** APM (Application Performance Monitoring)
- **Sentry:** Monitoreo de errores
- **CloudWatch (AWS):** Logs y métricas

---

## 💾 BACKUP Y RECUPERACIÓN

### Base de Datos

1. **Backups Automáticos:**
   ```bash
   # Backup diario (ejemplo con cron)
   0 2 * * * pg_dump -h host -U usuario -d database > /backups/db_$(date +\%Y\%m\%d).sql
   ```

2. **Retención:**
   - Diarios: 7 días
   - Semanales: 4 semanas
   - Mensuales: 12 meses

3. **Pruebas de Restauración:**
   - Probar restauración mensualmente
   - Documentar proceso de restauración

### Código y Configuración

- [ ] Código en repositorio Git
- [ ] Variables de entorno en gestor de secretos (AWS Secrets Manager, etc.)
- [ ] Documentación actualizada

---

## 🔧 TROUBLESHOOTING

### Problemas Comunes

#### 1. Error 401 - API Key requerida
**Causa:** API Key no configurada o inválida
**Solución:**
- Verificar que `API_KEYS` esté configurado
- Verificar que el header `X-API-Key` se esté enviando
- Verificar que la API Key esté en la lista de keys válidas

#### 2. Error 403 - CORS bloqueado
**Causa:** Origen no permitido
**Solución:**
- Verificar `ALLOWED_ORIGINS` incluye el dominio del frontend
- Verificar que el frontend esté enviando el header `Origin` correcto

#### 3. Error 429 - Too Many Requests
**Causa:** Rate limiting activado
**Solución:**
- Esperar 1 minuto
- Ajustar `RATE_LIMIT_MAX` si es necesario
- Verificar que no haya un ataque en curso

#### 4. Error de conexión a base de datos
**Causa:** DATABASE_URL incorrecto o base de datos no accesible
**Solución:**
- Verificar `DATABASE_URL`
- Verificar que la base de datos esté accesible desde el servidor
- Verificar firewall/Security Groups

#### 5. Emails no se envían
**Causa:** RESEND_API_KEY incorrecto o límite alcanzado
**Solución:**
- Verificar `RESEND_API_KEY`
- Verificar límites de Resend
- Revisar logs del servicio de email

---

## 🚀 COMANDOS ÚTILES

### Despliegue

```bash
# 1. Instalar dependencias
npm ci --production

# 2. Compilar
npm run build

# 3. Aplicar migraciones
npx prisma migrate deploy

# 4. Regenerar cliente Prisma
npx prisma generate

# 5. Iniciar con PM2
pm2 start ecosystem.config.js

# 6. Ver logs
pm2 logs spares-app-api

# 7. Reiniciar
pm2 restart spares-app-api
```

### Verificación

```bash
# Health check
curl http://localhost:3000/api/health

# Ping
curl http://localhost:3000/api/health/ping

# Verificar variables de entorno
node -e "require('dotenv').config(); console.log(process.env.NODE_ENV)"
```

---

## 📝 NOTAS IMPORTANTES

### Seguridad

1. **NUNCA** commitees el archivo `.env` al repositorio
2. **SIEMPRE** usa HTTPS en producción
3. **ROTA** las API Keys periódicamente
4. **MONITOREA** los logs de seguridad regularmente
5. **ACTUALIZA** las dependencias regularmente

### Rendimiento

1. Usa PM2 en modo cluster para aprovechar múltiples CPUs
2. Configura límites de memoria para reiniciar procesos si es necesario
3. Usa un reverse proxy (Nginx) para SSL termination y caching
4. Monitorea el uso de recursos regularmente

### Escalabilidad

1. Considera usar un Load Balancer para múltiples instancias
2. Usa una base de datos con replicación para lectura
3. Implementa caching donde sea apropiado
4. Considera usar un CDN para assets estáticos

---

## 📞 SOPORTE

Si encuentras problemas:
1. Revisa los logs del servidor
2. Verifica las variables de entorno
3. Prueba el health check
4. Revisa la documentación de seguridad

---

**Última actualización:** 2025-11-26
**Versión del documento:** 1.0.0

