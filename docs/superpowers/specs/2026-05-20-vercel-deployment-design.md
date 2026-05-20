# Vercel Deployment Design

**Date:** 2026-05-20
**Status:** Approved

## Objetivo

Hacer CotizaPro accesible en producción en internet, con el frontend servido por CDN global y el portal del cliente como funciones serverless Python en Vercel. Sin servidores que mantener, sin costo inicial.

---

## Arquitectura

### Dos capas

**Capa 1 — Frontend estático (CDN de Vercel)**
- `index.html`, `css/styles.css`, `js/bundle.js` se sirven directamente desde el CDN de Vercel.
- No hay cambios al código del frontend.
- `build.py` genera `bundle.js` como parte del build de Vercel, inyectando `SUPABASE_URL` y `SUPABASE_ANON_KEY`.

**Capa 2 — Backend serverless (Funciones Python en Vercel)**
- `server.py` se divide en 3 funciones independientes dentro de `api/`.
- La lógica compartida (Supabase, rate limiting) vive en `api/_lib/`.
- `server.py` se conserva intacto para desarrollo local.

### Estructura de archivos

```
/ (raíz del repo)
├── index.html
├── css/
│   └── styles.css
├── js/
│   └── bundle.js           ← generado por build.py
├── api/
│   ├── _lib/
│   │   ├── supabase.py     ← sb_get(), sb_patch() extraídos de server.py
│   │   └── ratelimit.py    ← rate limiting via Upstash Redis REST API
│   ├── portal.py           ← GET /q/:token → renderiza HTML del portal
│   ├── viewed.py           ← POST /api/q/:token/viewed
│   └── action.py           ← POST /api/q/:token/action
├── vercel.json
├── build.py                ← sin cambios
└── server.py               ← conservado para desarrollo local
```

---

## Routing

`vercel.json` mapea las URLs existentes a las funciones Python. Los links ya enviados a clientes no se rompen.

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

---

## Rate Limiting

El rate limiting en memoria de `server.py` no funciona en serverless (sin estado compartido entre invocaciones). Se reemplaza con **Upstash Redis** usando su REST API.

- Patrón: sliding window, 30 requests/minuto por IP (igual que hoy)
- Comunicación: HTTP request simple desde `ratelimit.py` — sin SDK, sin conexión persistente
- Free tier de Upstash: ~300,000 comandos/mes (~150,000 visitas al portal)

```python
# api/_lib/ratelimit.py — patrón de implementación
# POST a https://<host>.upstash.io/pipeline con UPSTASH_REDIS_REST_TOKEN
# Comandos: INCR <key> + EXPIRE <key> 60 (sliding window simple)
# Retorna: True si pasa, False si excede límite
```

---

## Variables de Entorno

Se configuran una vez en el dashboard de Vercel. Nunca en el código ni en el repo.

| Variable | Uso | Disponible en |
|----------|-----|---------------|
| `SUPABASE_URL` | URL del proyecto Supabase | Build + Runtime |
| `SUPABASE_ANON_KEY` | Key pública inyectada en bundle.js | Build |
| `SUPABASE_SERVICE_ROLE_KEY` | Acceso server-side a Supabase | Runtime only |
| `UPSTASH_REDIS_REST_URL` | URL de la base Redis de Upstash | Runtime only |
| `UPSTASH_REDIS_REST_TOKEN` | Token de autenticación Upstash | Runtime only |

---

## Flujo de una Petición

```
Cliente abre https://app.vercel.app/q/abc123
    ↓
vercel.json reescribe → /api/portal?token=abc123
    ↓
portal.py: verifica rate limit en Upstash Redis
    ↓ (si pasa)
portal.py: llama sb_get() en supabase.py → obtiene datos de Supabase
    ↓
portal.py: renderiza HTML y responde
```

El frontend (`index.html`, `bundle.js`) lo sirve el CDN directamente — no toca ninguna función Python.

---

## Escalabilidad

| Fase | Clientes activos | Infraestructura | Costo |
|------|-----------------|-----------------|-------|
| Lanzamiento | 0–800 | Vercel Hobby + Upstash free | $0/mes |
| Crecimiento | 800–5,000 | Vercel Pro + Upstash free | $20/mes |
| Escala | 5,000+ | Reevaluar arquitectura | Variable |

Estimación: ~120 invocaciones/mes por cliente activo (20 cotizaciones × 2 aperturas × 3 invocaciones).

---

## Setup Inicial (una sola vez)

1. Crear cuenta en vercel.com → conectar repositorio de GitHub
2. Crear base de datos Redis en upstash.com (free tier)
3. Copiar `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN` de Upstash
4. Pegar las 5 variables de entorno en Vercel → Settings → Environment Variables
5. `git push` → primer deploy automático

---

## Qué No Cambia

- `server.py` — sigue funcionando para desarrollo local (`python server.py`)
- `build.py` — sin cambios
- `index.html` y todos los archivos del frontend
- URLs existentes de portales ya enviados a clientes
- Lógica de negocio — solo cambia la forma (HTTPServer → funciones serverless)
