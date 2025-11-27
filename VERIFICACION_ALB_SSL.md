# 🔍 Guía de Verificación: ALB con SSL para API

## ✅ Checklist de Configuración

### 1. **Verificar URL del ALB**
En la consola de AWS:
- Ve a **EC2** → **Load Balancers**
- Busca tu ALB (Application Load Balancer)
- Copia el **DNS Name** (ejemplo: `sparesapp-api-123456789.us-east-1.elb.amazonaws.com`)

### 2. **Verificar Configuración del Listener**
En el ALB, verifica que tengas:
- **Listener en puerto 443 (HTTPS)** con certificado SSL
- **Target Group** apuntando al puerto 3000 de tu EC2
- **Health Check** configurado en `/api/health`

### 3. **Verificar DNS de `api.importacr.com`**
Ejecuta en tu terminal:
```bash
nslookup api.importacr.com
```

**Resultado esperado:**
- Debe resolver a la IP del ALB (no directamente a la IP del EC2)
- O debe resolver al DNS del ALB

### 4. **Verificar Grupo de Seguridad**
En el ALB:
- **Security Group** debe permitir:
  - Puerto **443 (HTTPS)** desde `0.0.0.0/0` (o desde CloudFront)
  - Puerto **80 (HTTP)** para redirección a HTTPS (opcional)

En el EC2:
- **Security Group** debe permitir:
  - Puerto **3000** desde el Security Group del ALB

### 5. **Verificar Certificado SSL**
En el ALB → Listeners → HTTPS (443):
- Debe tener un certificado de **AWS Certificate Manager (ACM)**
- El certificado debe cubrir: `*.importacr.com` o `api.importacr.com`

---

## 🔧 Solución de Problemas

### Problema 1: `ERR_CONNECTION_TIMED_OUT` en `https://api.importacr.com`

**Causas posibles:**
1. ❌ El DNS de `api.importacr.com` no apunta al ALB
2. ❌ El ALB no tiene listener en puerto 443
3. ❌ El Security Group del ALB bloquea el puerto 443
4. ❌ El Target Group no está saludable

**Solución:**
1. Verifica el DNS en Route 53 (o tu proveedor DNS):
   - Crea un registro **A (Alias)** apuntando `api.importacr.com` al ALB
   - O crea un registro **CNAME** apuntando al DNS del ALB

2. Verifica el Listener del ALB:
   - Debe tener un listener en puerto **443** con protocolo **HTTPS**
   - Debe tener un certificado SSL válido

3. Verifica el Security Group:
   - Debe permitir tráfico en puerto **443** desde `0.0.0.0/0`

4. Verifica el Target Group:
   - Debe estar apuntando al puerto **3000** del EC2
   - El health check debe estar en `/api/health`
   - Los targets deben estar **healthy**

### Problema 2: El frontend no puede conectarse

**Verificar:**
1. El frontend usa: `https://api.importacr.com/api`
2. El CORS del API permite: `https://app.importacr.com`
3. El API está corriendo en el EC2 en puerto 3000

**Comandos de prueba:**
```bash
# Desde tu máquina local
curl -v https://api.importacr.com/api/health

# Desde el EC2
curl http://localhost:3000/api/health
```

---

## 📝 Configuración del DNS (Route 53)

Si usas Route 53:
1. Ve a **Route 53** → **Hosted Zones** → `importacr.com`
2. Crea un nuevo registro:
   - **Name:** `api`
   - **Type:** `A - IPv4 address`
   - **Alias:** ✅ Sí
   - **Alias Target:** Selecciona tu ALB
   - **Routing Policy:** Simple

---

## 🧪 Pruebas de Conectividad

### Test 1: Verificar DNS
```bash
nslookup api.importacr.com
# Debe resolver a la IP del ALB
```

### Test 2: Verificar SSL
```bash
curl -v https://api.importacr.com/api/health
# Debe responder con status 200 y certificado válido
```

### Test 3: Verificar CORS
```bash
curl -X OPTIONS https://api.importacr.com/api/health \
  -H "Origin: https://app.importacr.com" \
  -H "Access-Control-Request-Method: GET" \
  -v
# Debe incluir headers CORS en la respuesta
```

---

## ✅ Configuración Final Esperada

### Frontend (`environment.prod.ts`):
```typescript
apiUrl: 'https://api.importacr.com/api'
```

### Backend (`.env` en EC2):
```env
ALLOWED_ORIGINS=https://app.importacr.com,https://d3borb3tbumsnf.cloudfront.net,http://localhost:4200
CORS_ORIGIN=https://app.importacr.com,https://d3borb3tbumsnf.cloudfront.net,http://localhost:4200
```

### DNS:
- `api.importacr.com` → ALB (puerto 443)
- `app.importacr.com` → CloudFront

### ALB:
- Listener 443 (HTTPS) → Target Group → EC2:3000

---

## 🚨 Si Aún No Funciona

1. **Verifica los logs del API en EC2:**
   ```bash
   # En el EC2
   pm2 logs
   # o
   journalctl -u sparesapp-api -f
   ```

2. **Verifica el health check del ALB:**
   - Ve a **EC2** → **Target Groups** → Tu Target Group
   - Verifica que los targets estén **healthy**

3. **Verifica el certificado SSL:**
   - Debe estar en estado **Issued** en ACM
   - Debe cubrir `api.importacr.com` o `*.importacr.com`

