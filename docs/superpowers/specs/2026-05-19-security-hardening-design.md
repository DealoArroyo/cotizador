# Spec: Security Hardening para producción

**Fecha:** 2026-05-19
**Estado:** Aprobado

---

## Contexto

Auditoría pre-deploy identificó 21 issues. Se resuelven en 3 clusters independientes (A → B → C). El Cluster D (rotar service_role key, verificar git history) es manual.

---

## Cluster A: XSS Escaping + Content Security Policy

### Archivos modificados
- `js/utils.js` — nueva función `escapeHTML`
- `js/modules/quotations.js` — escapar valores de usuario en innerHTML
- `js/modules/clients.js` — escapar valores de usuario en innerHTML
- `js/modules/products.js` — escapar valores de usuario en innerHTML
- `js/modules/invoices.js` — escapar valores de usuario en innerHTML
- `js/modules/settings.js` — escapar valores de usuario en innerHTML
- `index.html` — CSP meta tag, pin versiones CDN, SRI hashes
- `js/bundle.js` — rebuild

### 1. Helper `escapeHTML`

Agregar en `js/utils.js` (exportar como función global):

```js
function escapeHTML(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
```

### 2. Aplicar `escapeHTML` en los 5 módulos

En cada módulo, toda interpolación `${value}` dentro de strings que se asignan a `innerHTML` o `insertAdjacentHTML` donde `value` proviene de datos del usuario (nombres, notas, descripciones, comentarios, correos, RFCs, direcciones) debe envolverse: `${escapeHTML(value)}`.

Valores seguros que NO necesitan escape: números, fechas formateadas por `I18n`, íconos Lucide (`<i data-lucide="...">`), clases CSS hardcodeadas.

### 3. CSP + SRI en `index.html`

**Versiones a pinear (verificar actuales en cada CDN antes de escribir el plan):**
- `lucide` → reemplazar `@latest` por versión específica (ej. `0.474.0`)
- `chart.js` → ya usa versión fija; confirmar
- `supabase-js` → ya usa `@2`; confirmar versión exacta
- `html2pdf.js` → ya usa `@0.10.1`; confirmar

**CSP meta tag** (agregar como primer tag en `<head>`):

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'none';
  script-src 'self' https://cdn.jsdelivr.net https://unpkg.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src https://fonts.gstatic.com;
  img-src 'self' data: blob:;
  connect-src https://*.supabase.co;
  frame-ancestors 'none';
  base-uri 'none';
  form-action 'none';
">
```

**SRI** — generar hash SHA-384 para cada CDN script con:
```
curl -s <url> | openssl dgst -sha384 -binary | openssl base64 -A
```
Agregar `integrity="sha384-<hash>" crossorigin="anonymous"` a cada `<script>`.

---

## Cluster B: Portal Server Hardening

### Archivos modificados
- `server.py`

### 1. Validación de token

Antes de cualquier llamada a la DB, validar:
```python
import re
TOKEN_RE = re.compile(r'^[a-f0-9]{32}$')
if not TOKEN_RE.match(token):
    self._send_json(404, {'error': 'Not found'})
    return
```

### 2. Cap de Content-Length y validación de inputs

En `do_POST`, antes de leer el body:
```python
MAX_BODY = 8 * 1024  # 8 KB
length = int(self.headers.get('Content-Length', 0))
if length > MAX_BODY:
    self._send_json(413, {'error': 'Payload too large'})
    return
```

Validación de campos en `_handle_action`:
- `clientName`: strip + max 100 chars
- `clientComment`: strip + max 1000 chars
- `signedAt`: strip + max 40 chars

Si alguno excede el límite, retornar 400.

### 3. Corrección de CSS injection

En `_serve_portal`, antes de interpolar `header_color`:
```python
import re
HEX_COLOR_RE = re.compile(r'^#[0-9a-fA-F]{6}$')
header_color = s.get('portalHeaderColor', '#1a1a2e')
if not HEX_COLOR_RE.match(header_color):
    header_color = '#1a1a2e'
```

### 4. Rate limiting en memoria

Variable de módulo al inicio de `server.py`:
```python
import time
from collections import defaultdict
_rate_limit = defaultdict(list)
RATE_LIMIT_MAX = 30
RATE_LIMIT_WINDOW = 60
```

Función de verificación:
```python
def _check_rate_limit(ip):
    now = time.time()
    window_start = now - RATE_LIMIT_WINDOW
    _rate_limit[ip] = [t for t in _rate_limit[ip] if t > window_start]
    if len(_rate_limit[ip]) >= RATE_LIMIT_MAX:
        return False
    _rate_limit[ip].append(now)
    return True
```

Llamar en `do_GET` y `do_POST` al inicio para rutas `/api/q/`:
```python
ip = self.client_address[0]
if self.path.startswith('/api/q/') and not _check_rate_limit(ip):
    self.send_response(429)
    self.send_header('Retry-After', '60')
    self.end_headers()
    return
```

### 5. Security headers en todas las respuestas

En `_send_json` y en `do_GET` antes de `end_headers()`, agregar siempre:
```python
self.send_header('X-Frame-Options', 'DENY')
self.send_header('X-Content-Type-Options', 'nosniff')
self.send_header('Referrer-Policy', 'no-referrer')
self.send_header('Strict-Transport-Security', 'max-age=31536000')
```

Extraer un método `_send_security_headers(self)` para no repetir.

### 6. Audit logging

Eliminar el override de `log_message` que silencia los logs. Agregar logs explícitos en `_handle_action`:
```python
token_prefix = token[:8]
print(f'[portal] {time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())} ip={self.client_address[0]} token={token_prefix}... action={action}')
```

---

## Cluster C: Input Validation & Secure Storage

### Archivos modificados
- `js/modules/settings.js`
- `js/bundle.js` — rebuild

### 1. Logo upload — rechazar SVG y validar data URL

Después del chequeo de tamaño en el listener de `#logo-upload`:
```js
const SAFE_IMG_RE = /^data:image\/(png|jpeg|gif|webp);base64,[A-Za-z0-9+/=]+$/;
if (!SAFE_IMG_RE.test(ev.target.result)) {
  Store.showToast('Formato de imagen no permitido. Usa PNG, JPG, GIF o WebP.', 'error');
  return;
}
```

### 2. `portalHeaderColor` — validar hex en guardar

En el listener de `#s-save-portal` (o donde se lee `#s-portal-color`), antes de guardar:
```js
const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const color = document.querySelector('#s-portal-color')?.value || '';
const safeColor = HEX_RE.test(color) ? color : '#1a1a2e';
```

### 3. Backup restore — validar schema antes de aplicar

```js
const VALID_KEYS = new Set(Object.values(KEYS)); // KEYS is the module-level const from store.js, accessible in bundle scope
const MAX_BACKUP_SIZE = 2 * 1024 * 1024; // 2 MB

// En el listener de restore:
const raw = ev.target.result;
if (raw.length > MAX_BACKUP_SIZE) {
  Store.showToast('Archivo demasiado grande (máx. 2 MB).', 'error');
  return;
}
let backup;
try { backup = JSON.parse(raw); } catch { Store.showToast('Archivo inválido.', 'error'); return; }
if (!backup.data || typeof backup.data !== 'object') {
  Store.showToast('Formato de respaldo inválido.', 'error'); return;
}
const unknownKeys = Object.keys(backup.data).filter(k => !VALID_KEYS.has(k));
if (unknownKeys.length) {
  Store.showToast('Respaldo contiene claves desconocidas.', 'error'); return;
}
for (const [k, v] of Object.entries(backup.data)) {
  if (typeof v !== 'object' || v === null) {
    Store.showToast('Respaldo contiene datos con formato incorrecto.', 'error'); return;
  }
}
// Aplicar
```

---

## Qué NO cambia

- Lógica de sync, Kanban, recordatorios, portal de cliente
- Flujo de auth (Supabase auth permanece intacto)
- `service_role_key` sigue siendo solo en `server.py` (ya correcto)

---

## Cluster D — Manual (no código)

1. Rotar `SUPABASE_SERVICE_ROLE_KEY` en el dashboard de Supabase
2. Verificar que `.env` nunca fue commiteado: `git log --all -- .env` (debe estar vacío)
3. Verificar que `service_role` nunca entró al repo: `git log -S 'service_role' --all`
4. Actualizar el `.env` en el servidor de producción con la nueva key
