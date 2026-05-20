# Vercel Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrar CotizaPro a Vercel: frontend estático en CDN + 3 funciones serverless Python que reemplazan `server.py` en producción, con rate limiting distribuido via Upstash Redis.

**Architecture:** El frontend (HTML/CSS/JS) lo sirve el CDN de Vercel sin cambios. El `server.py` se divide en `api/portal.py`, `api/viewed.py` y `api/action.py`, compartiendo lógica en `api/_lib/`. El `server.py` original se conserva para desarrollo local.

**Tech Stack:** Python 3.9, Vercel Serverless Functions (BaseHTTPRequestHandler), Upstash Redis REST API, Supabase REST API, Vercel CLI

---

## Estructura de archivos

```
api/
├── _lib/
│   ├── supabase.py    ← sb_get, sb_patch (extraídos de server.py)
│   ├── ratelimit.py   ← check_rate_limit via Upstash Redis REST
│   ├── render.py      ← fmt_currency, render_error, render_portal (de server.py)
│   └── base.py        ← SecureHandler (security headers + _html/_json)
├── portal.py          ← handler: GET /q/:token
├── viewed.py          ← handler: POST /api/q/:token/viewed
└── action.py          ← handler: POST /api/q/:token/action
tests/
├── conftest.py        ← sys.path para imports de api/_lib
├── test_supabase.py
└── test_ratelimit.py
vercel.json
```

---

## Task 1: Supabase client lib

**Files:**
- Create: `api/_lib/supabase.py`
- Create: `tests/conftest.py`
- Create: `tests/test_supabase.py`

- [ ] **Step 1.1: Crear `tests/conftest.py`**

```python
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'api'))
```

- [ ] **Step 1.2: Escribir tests fallidos**

Crear `tests/test_supabase.py`:

```python
import unittest
from unittest.mock import patch, MagicMock
import os

class TestSbGet(unittest.TestCase):
    @patch('_lib.supabase.urllib.request.urlopen')
    def test_returns_parsed_json(self, mock_open):
        mock_resp = MagicMock()
        mock_resp.read.return_value = b'[{"id": "abc"}]'
        mock_resp.__enter__ = lambda s: s
        mock_resp.__exit__ = MagicMock(return_value=False)
        mock_open.return_value = mock_resp

        with patch.dict(os.environ, {
            'SUPABASE_URL': 'https://test.supabase.co',
            'SUPABASE_SERVICE_ROLE_KEY': 'testkey',
        }):
            from _lib import supabase
            result = supabase.sb_get('quote_tokens', {'token': 'eq.abc'})

        self.assertEqual(result, [{'id': 'abc'}])

    @patch('_lib.supabase.urllib.request.urlopen')
    def test_patch_sends_correct_method(self, mock_open):
        mock_resp = MagicMock()
        mock_resp.status = 204
        mock_resp.__enter__ = lambda s: s
        mock_resp.__exit__ = MagicMock(return_value=False)
        mock_open.return_value = mock_resp

        with patch.dict(os.environ, {
            'SUPABASE_URL': 'https://test.supabase.co',
            'SUPABASE_SERVICE_ROLE_KEY': 'testkey',
        }):
            from _lib import supabase
            result = supabase.sb_patch('user_data', {'user_id': 'eq.1'}, {'quotations': []})

        call_args = mock_open.call_args[0][0]
        self.assertEqual(call_args.method, 'PATCH')
        self.assertEqual(result, 204)

if __name__ == '__main__':
    unittest.main()
```

- [ ] **Step 1.3: Correr tests — verificar que FALLAN**

```
python -m pytest tests/test_supabase.py -v
```

Esperado: `ModuleNotFoundError: No module named '_lib'`

- [ ] **Step 1.4: Crear `api/_lib/supabase.py`**

```python
import json
import os
import urllib.request
import urllib.parse


def sb_get(table, params):
    url = os.environ['SUPABASE_URL'].rstrip('/') + '/rest/v1/' + table
    url += '?' + urllib.parse.urlencode(params)
    key = os.environ['SUPABASE_SERVICE_ROLE_KEY']
    req = urllib.request.Request(url, headers={
        'apikey': key,
        'Authorization': f'Bearer {key}',
    })
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.loads(r.read())


def sb_patch(table, params, body):
    url = os.environ['SUPABASE_URL'].rstrip('/') + '/rest/v1/' + table
    url += '?' + urllib.parse.urlencode(params)
    key = os.environ['SUPABASE_SERVICE_ROLE_KEY']
    data = json.dumps(body).encode()
    req = urllib.request.Request(url, data=data, method='PATCH', headers={
        'apikey': key,
        'Authorization': f'Bearer {key}',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
    })
    with urllib.request.urlopen(req, timeout=10) as r:
        return r.status
```

- [ ] **Step 1.5: Correr tests — verificar que PASAN**

```
python -m pytest tests/test_supabase.py -v
```

Esperado: `2 passed`

- [ ] **Step 1.6: Commit**

```
git add api/_lib/supabase.py tests/conftest.py tests/test_supabase.py
git commit -m "feat(deploy): supabase client lib + tests"
```

---

## Task 2: Rate limit lib (Upstash Redis)

**Files:**
- Create: `api/_lib/ratelimit.py`
- Create: `tests/test_ratelimit.py`

- [ ] **Step 2.1: Escribir tests fallidos**

Crear `tests/test_ratelimit.py`:

```python
import unittest
from unittest.mock import patch, MagicMock
import json
import os

ENV = {
    'UPSTASH_REDIS_REST_URL': 'https://test.upstash.io',
    'UPSTASH_REDIS_REST_TOKEN': 'testtoken',
}

class TestCheckRateLimit(unittest.TestCase):
    @patch('_lib.ratelimit.urllib.request.urlopen')
    def test_allows_request_under_limit(self, mock_open):
        mock_resp = MagicMock()
        mock_resp.read.return_value = json.dumps([
            {'result': 5},   # INCR → count = 5, bajo el límite de 30
            {'result': 1},   # EXPIRE
        ]).encode()
        mock_resp.__enter__ = lambda s: s
        mock_resp.__exit__ = MagicMock(return_value=False)
        mock_open.return_value = mock_resp

        with patch.dict(os.environ, ENV):
            from _lib import ratelimit
            result = ratelimit.check_rate_limit('1.2.3.4')

        self.assertTrue(result)

    @patch('_lib.ratelimit.urllib.request.urlopen')
    def test_blocks_request_over_limit(self, mock_open):
        mock_resp = MagicMock()
        mock_resp.read.return_value = json.dumps([
            {'result': 31},  # INCR → count = 31, sobre el límite de 30
            {'result': 1},
        ]).encode()
        mock_resp.__enter__ = lambda s: s
        mock_resp.__exit__ = MagicMock(return_value=False)
        mock_open.return_value = mock_resp

        with patch.dict(os.environ, ENV):
            from _lib import ratelimit
            result = ratelimit.check_rate_limit('1.2.3.4')

        self.assertFalse(result)

    @patch('_lib.ratelimit.urllib.request.urlopen')
    def test_fails_open_on_redis_error(self, mock_open):
        mock_open.side_effect = Exception('Redis unreachable')

        with patch.dict(os.environ, ENV):
            from _lib import ratelimit
            result = ratelimit.check_rate_limit('1.2.3.4')

        self.assertTrue(result)  # fail open: deja pasar si Redis falla

if __name__ == '__main__':
    unittest.main()
```

- [ ] **Step 2.2: Correr tests — verificar que FALLAN**

```
python -m pytest tests/test_ratelimit.py -v
```

Esperado: `ModuleNotFoundError: No module named '_lib.ratelimit'`

- [ ] **Step 2.3: Crear `api/_lib/ratelimit.py`**

```python
import json
import os
import urllib.request

RATE_LIMIT_MAX = 30
RATE_LIMIT_WINDOW = 60  # segundos


def check_rate_limit(ip: str) -> bool:
    """Sliding window rate limit via Upstash Redis pipeline. Fail open."""
    url = os.environ['UPSTASH_REDIS_REST_URL'].rstrip('/') + '/pipeline'
    token = os.environ['UPSTASH_REDIS_REST_TOKEN']
    key = f'rl:{ip}'
    commands = [
        ['INCR', key],
        ['EXPIRE', key, RATE_LIMIT_WINDOW, 'NX'],
    ]
    data = json.dumps(commands).encode()
    req = urllib.request.Request(
        url,
        data=data,
        method='POST',
        headers={
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json',
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=5) as r:
            results = json.loads(r.read())
            count = results[0]['result']
            return count <= RATE_LIMIT_MAX
    except Exception:
        return True  # fail open: si Redis no responde, deja pasar
```

- [ ] **Step 2.4: Correr tests — verificar que PASAN**

```
python -m pytest tests/test_ratelimit.py -v
```

Esperado: `3 passed`

- [ ] **Step 2.5: Commit**

```
git add api/_lib/ratelimit.py tests/test_ratelimit.py
git commit -m "feat(deploy): Upstash Redis rate limit lib + tests"
```

---

## Task 3: Render lib

**Files:**
- Create: `api/_lib/render.py`

- [ ] **Step 3.1: Crear `api/_lib/render.py`**

Copiar las funciones `fmt_currency` (líneas 71–75), `render_error` (líneas 78–92) y `render_portal` (líneas 95–273) de `server.py` **sin ningún cambio**. Agregar el import que falta al inicio:

```python
import html as htmllib
import re

HEX_COLOR_RE = re.compile(r'^#[0-9a-fA-F]{6}$')
```

El archivo debe terminar con las tres funciones copiadas literalmente de `server.py`.

- [ ] **Step 3.2: Correr smoke test**

```
python -c "
import sys; sys.path.insert(0, 'api')
from _lib.render import fmt_currency, render_error, render_portal
assert fmt_currency(1234.5) == '1,234.50 MXN'
assert 'cotización' in render_error('Test').lower()
print('OK')
"
```

Esperado: `OK`

- [ ] **Step 3.3: Commit**

```
git add api/_lib/render.py
git commit -m "feat(deploy): render lib extraído de server.py"
```

---

## Task 4: Base handler

**Files:**
- Create: `api/_lib/base.py`

- [ ] **Step 4.1: Crear `api/_lib/base.py`**

```python
from http.server import BaseHTTPRequestHandler
import json


class SecureHandler(BaseHTTPRequestHandler):
    """Base handler que añade security headers y helpers _html/_json."""

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        self.send_header('X-Frame-Options', 'DENY')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Referrer-Policy', 'no-referrer')
        self.send_header('Strict-Transport-Security', 'max-age=31536000')
        super().end_headers()

    def _html(self, code, body):
        data = body.encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Content-Length', len(data))
        self.end_headers()
        self.wfile.write(data)

    def _json(self, code, obj):
        data = json.dumps(obj).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', len(data))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, fmt, *args):
        pass  # silencia logs de acceso en producción
```

- [ ] **Step 4.2: Commit**

```
git add api/_lib/base.py
git commit -m "feat(deploy): SecureHandler base con security headers"
```

---

## Task 5: `api/portal.py`

**Files:**
- Create: `api/portal.py`

- [ ] **Step 5.1: Crear `api/portal.py`**

```python
import os
import re
import sys
import urllib.parse

sys.path.insert(0, os.path.dirname(__file__))
from _lib.base import SecureHandler
from _lib.render import render_error, render_portal
from _lib.ratelimit import check_rate_limit
from _lib.supabase import sb_get

TOKEN_RE = re.compile(r'^[a-f0-9]{32}$')


class handler(SecureHandler):
    def do_GET(self):
        query = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        token = (query.get('token') or [None])[0] or ''
        ip = self.client_address[0]

        if not check_rate_limit(ip):
            self._html(429, render_error('Demasiadas solicitudes. Intenta más tarde.'))
            return

        if not TOKEN_RE.match(token):
            self._html(404, render_error('Esta cotización ya no está disponible'))
            return

        if not os.environ.get('SUPABASE_URL') or not os.environ.get('SUPABASE_SERVICE_ROLE_KEY'):
            self._html(503, render_error('Servidor no configurado'))
            return

        try:
            rows = sb_get('quote_tokens', {'token': f'eq.{token}', 'select': '*'})
            if not rows:
                return self._html(404, render_error('Esta cotización ya no está disponible'))
            user_id = rows[0]['user_id']
            quote_id = rows[0]['quote_id']

            ud_rows = sb_get('user_data', {
                'user_id': f'eq.{user_id}',
                'select': 'quotations,company,settings',
            })
            if not ud_rows:
                return self._html(404, render_error('Datos no encontrados'))
            ud = ud_rows[0]

            q = next((x for x in (ud.get('quotations') or []) if x.get('id') == quote_id), None)
            if not q:
                return self._html(404, render_error('Cotización no encontrada'))
            if q.get('status') not in ('sent', 'approved', 'rejected', 'changes_requested'):
                return self._html(410, render_error('Esta cotización ya no está disponible'))

            self._html(200, render_portal(q, ud.get('company') or {}, ud.get('settings') or {}))
        except Exception as e:
            print(f'[portal GET error] {e}', flush=True)
            self._html(500, render_error('Error interno'))
```

- [ ] **Step 5.2: Correr smoke test de importación**

```
python -c "import sys; sys.path.insert(0,'api'); import portal; print('OK')"
```

Esperado: `OK` (sin errores de import)

- [ ] **Step 5.3: Commit**

```
git add api/portal.py
git commit -m "feat(deploy): portal serverless function"
```

---

## Task 6: `api/viewed.py`

**Files:**
- Create: `api/viewed.py`

- [ ] **Step 6.1: Crear `api/viewed.py`**

```python
import os
import re
import sys
import urllib.parse
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(__file__))
from _lib.base import SecureHandler
from _lib.ratelimit import check_rate_limit
from _lib.supabase import sb_get, sb_patch

TOKEN_RE = re.compile(r'^[a-f0-9]{32}$')


class handler(SecureHandler):
    def do_POST(self):
        query = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        token = (query.get('token') or [None])[0] or ''
        ip = self.client_address[0]

        if not check_rate_limit(ip):
            self._json(429, {'error': 'Too many requests'})
            return

        if not TOKEN_RE.match(token):
            self._json(404, {'error': 'not found'})
            return

        try:
            rows = sb_get('quote_tokens', {'token': f'eq.{token}', 'select': '*'})
            if not rows:
                return self._json(404, {'error': 'not found'})
            user_id, quote_id = rows[0]['user_id'], rows[0]['quote_id']

            ud_rows = sb_get('user_data', {'user_id': f'eq.{user_id}', 'select': 'quotations'})
            if not ud_rows:
                return self._json(404, {'error': 'not found'})
            quotations = ud_rows[0].get('quotations') or []
            now = datetime.now(timezone.utc).isoformat()

            for qt in quotations:
                if qt.get('id') == quote_id:
                    if not qt.get('viewedAt'):
                        qt['viewedAt'] = now
                    qt['lastViewedAt'] = now
                    qt['viewCount'] = qt.get('viewCount', 0) + 1
                    break

            sb_patch('user_data', {'user_id': f'eq.{user_id}'}, {'quotations': quotations})
            self._json(200, {'ok': True})
        except Exception as e:
            print(f'[viewed error] {e}', flush=True)
            self._json(500, {'error': str(e)})
```

- [ ] **Step 6.2: Smoke test**

```
python -c "import sys; sys.path.insert(0,'api'); import viewed; print('OK')"
```

Esperado: `OK`

- [ ] **Step 6.3: Commit**

```
git add api/viewed.py
git commit -m "feat(deploy): viewed serverless function"
```

---

## Task 7: `api/action.py`

**Files:**
- Create: `api/action.py`

- [ ] **Step 7.1: Crear `api/action.py`**

```python
import json
import os
import re
import sys
import time
import urllib.parse
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(__file__))
from _lib.base import SecureHandler
from _lib.ratelimit import check_rate_limit
from _lib.supabase import sb_get, sb_patch

TOKEN_RE = re.compile(r'^[a-f0-9]{32}$')
MAX_BODY = 8 * 1024


class handler(SecureHandler):
    def do_POST(self):
        query = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        token = (query.get('token') or [None])[0] or ''
        ip = self.client_address[0]

        if not check_rate_limit(ip):
            self._json(429, {'error': 'Too many requests'})
            return

        if not TOKEN_RE.match(token):
            self._json(404, {'error': 'not found'})
            return

        length = int(self.headers.get('Content-Length', 0))
        if length > MAX_BODY:
            self._json(413, {'error': 'Payload too large'})
            return

        body = json.loads(self.rfile.read(length)) if length else {}
        action = body.get('action')
        if action not in ('approved', 'rejected', 'changes_requested'):
            self._json(400, {'error': 'invalid action'})
            return

        try:
            rows = sb_get('quote_tokens', {'token': f'eq.{token}', 'select': '*'})
            if not rows:
                return self._json(404, {'error': 'not found'})
            user_id, quote_id = rows[0]['user_id'], rows[0]['quote_id']

            ud_rows = sb_get('user_data', {'user_id': f'eq.{user_id}', 'select': 'quotations'})
            if not ud_rows:
                return self._json(404, {'error': 'not found'})
            quotations = ud_rows[0].get('quotations') or []
            now = datetime.now(timezone.utc).isoformat()

            comment = str(body.get('comment', ''))[:1000].strip()
            client_name = str(body.get('clientName', ''))[:100].strip()
            signed_at = str(body.get('signedAt', ''))[:40].strip()

            for qt in quotations:
                if qt.get('id') == quote_id:
                    qt['status'] = action
                    if action == 'approved':
                        qt['approvedAt'] = now
                    elif action == 'rejected':
                        qt['rejectedAt'] = now
                    else:
                        qt['changesRequestedAt'] = now
                    if comment:
                        qt['clientComment'] = comment
                    if client_name:
                        qt['clientName'] = client_name
                    if signed_at:
                        qt['signedAt'] = signed_at
                    break

            sb_patch('user_data', {'user_id': f'eq.{user_id}'}, {'quotations': quotations})
            token_prefix = token[:8]
            print(
                f'[portal:action] {time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())} '
                f'ip={ip} token={token_prefix}... action={action}',
                flush=True,
            )
            self._json(200, {'ok': True})
        except Exception as e:
            print(f'[action error] {e}', flush=True)
            self._json(500, {'error': str(e)})
```

- [ ] **Step 7.2: Smoke test**

```
python -c "import sys; sys.path.insert(0,'api'); import action; print('OK')"
```

Esperado: `OK`

- [ ] **Step 7.3: Correr toda la suite de tests**

```
python -m pytest tests/ -v
```

Esperado: `5 passed`

- [ ] **Step 7.4: Commit**

```
git add api/action.py
git commit -m "feat(deploy): action serverless function"
```

---

## Task 8: `vercel.json`

**Files:**
- Create: `vercel.json`

- [ ] **Step 8.1: Crear `vercel.json`**

```json
{
  "buildCommand": "python build.py",
  "rewrites": [
    { "source": "/q/:token",            "destination": "/api/portal?token=:token" },
    { "source": "/api/q/:token/viewed", "destination": "/api/viewed?token=:token" },
    { "source": "/api/q/:token/action", "destination": "/api/action?token=:token" }
  ]
}
```

- [ ] **Step 8.2: Commit**

```
git add vercel.json
git commit -m "feat(deploy): vercel.json — routing y build command"
```

---

## Task 9: Setup de cuentas y variables de entorno

- [ ] **Step 9.1: Crear cuenta en Upstash**

1. Ir a https://upstash.com → crear cuenta gratuita
2. Crear database → tipo **Redis** → región más cercana (e.g. us-east-1)
3. Copiar **REST URL** y **REST Token** desde la pestaña "REST API"

- [ ] **Step 9.2: Crear proyecto en Vercel**

1. Ir a https://vercel.com → crear cuenta o iniciar sesión
2. "Add New Project" → importar el repositorio de GitHub
3. Framework Preset: **Other**
4. Build Command: `python build.py` (Vercel lo detecta de `vercel.json`, pero verificar)
5. NO hacer deploy todavía — primero configurar variables de entorno

- [ ] **Step 9.3: Configurar variables de entorno en Vercel**

En Vercel → proyecto → Settings → Environment Variables, agregar las siguientes. Marcar cada una con los entornos que aplican:

| Variable | Entornos | Valor |
|----------|----------|-------|
| `SUPABASE_URL` | Production, Preview, Development | URL de Supabase |
| `SUPABASE_ANON_KEY` | Production, Preview, Development | Anon key (pública) |
| `SUPABASE_SERVICE_ROLE_KEY` | Production, Preview, Development | Service role key (privada) |
| `UPSTASH_REDIS_REST_URL` | Production, Preview, Development | REST URL de Upstash |
| `UPSTASH_REDIS_REST_TOKEN` | Production, Preview, Development | REST Token de Upstash |

- [ ] **Step 9.4: Hacer deploy**

```
git push origin main
```

Vercel detecta el push y hace deploy automáticamente. Verificar en el dashboard de Vercel que el build pasa sin errores.

---

## Task 10: Verificación en producción

- [ ] **Step 10.1: Verificar frontend**

Abrir `https://<tu-proyecto>.vercel.app` en el browser.
Esperado: la app carga normalmente, el login funciona.

- [ ] **Step 10.2: Verificar portal de cliente**

Desde la app, enviar una cotización real a un correo tuyo (o usar un token existente en Supabase).
Abrir el link del portal en el browser.
Esperado: se muestra el HTML del portal con los datos de la cotización.

- [ ] **Step 10.3: Verificar viewed y action**

Con el portal abierto, verificar en Supabase (tabla `user_data`) que:
- `viewedAt` y `viewCount` se actualizan al abrir el portal
- `status` cambia a `approved` o `rejected` al hacer clic en el botón

- [ ] **Step 10.4: Verificar rate limiting**

Abrir DevTools → Console y correr:

```javascript
for (let i = 0; i < 35; i++) {
  fetch('/api/q/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/viewed', {method:'POST'})
    .then(r => console.log(i, r.status));
}
```

Esperado: los primeros 30 devuelven `404` (token inválido pero llega al handler), los siguientes devuelven `429`.

- [ ] **Step 10.5: Commit final**

```
git add .
git commit -m "feat(deploy): deploy completo a Vercel con Upstash Redis"
```
