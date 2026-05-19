# Spec: Migración a SaaS — Credenciales en build

**Fecha:** 2026-05-19
**Estado:** Aprobado

## Contexto

Actualmente la app permite que cada usuario configure su propio proyecto Supabase desde el login y desde Settings. Para convertirla en SaaS, las credenciales del único proyecto Supabase del desarrollador se incrustan en `bundle.js` en tiempo de build. Los usuarios solo ven login/registro.

## Aislamiento de datos

- **Cliente:** todas las queries filtran por `user_id` del usuario autenticado
- **Supabase RLS:** las políticas rechazan cualquier acceso a filas de otro usuario a nivel de base de datos. El `anon key` es seguro para exponer en el cliente — solo permite operaciones que RLS autorice.

## Cambios por archivo

### `js/supabase-client.js`

Se elimina toda la lógica de configuración vía localStorage. El módulo queda:

```js
const SupabaseClient = {
  _client: null,
  get() {
    if (!this._client) {
      if (!window.supabase) { console.error('Supabase SDK not loaded'); return null; }
      this._client = window.supabase.createClient('__SUPABASE_URL__', '__SUPABASE_ANON_KEY__');
    }
    return this._client;
  },
  isConfigured() { return true; },
};
```

Los placeholders `__SUPABASE_URL__` y `__SUPABASE_ANON_KEY__` son reemplazados por `build.py` con los valores reales del `.env`. Se eliminan: `getConfig()`, `saveConfig()`, `reset()`.

### `build.py`

Después de escribir el bundle, se leen las variables `SUPABASE_URL` y `SUPABASE_ANON_KEY` del entorno (o del `.env` local) y se sustituyen los placeholders en el archivo generado. Si alguna variable falta, el script aborta con error claro.

### `build.mjs`

Mismo comportamiento que `build.py` — también lee del `.env` e inyecta los valores.

### `js/auth.js`

Se elimina el bloque `<details class="auth-config-details">` completo y el event listener `#auth-save-config`. También se elimina `const cfg = SupabaseClient.getConfig()` al inicio de `showScreen`, que queda huérfano. La pantalla de login queda con solo: tabs login/registro + formularios + botones.

### `js/modules/settings.js`

Se elimina:
- La card `#supabase-card` completa (con inputs de URL y anon key)
- Las 4 variables computadas: `_sbCfg`, `_sbConfigured`, `_sbStatusBadge`, `_sbSyncBtn`
- Los event listeners: `#sb-save-cfg` y `#sb-sync-now`

### `js/app.js`

Se elimina el branch `if (!SupabaseClient.isConfigured())` en `init()` — siempre es `true`. La función queda:

```js
async function init() {
  const settings = Store.getSettings();
  document.documentElement.setAttribute('data-theme', settings.theme || 'dark');
  I18n.setLang(settings.lang || 'es');

  const session = await Auth.getSession();
  if (!session) {
    Auth.showScreen(bootWithSession);
    return;
  }
  await bootWithSession(session);
}
```

## Flujo de build

```
.env  ──►  build.py  ──►  bundle.js (con valores reales)  ──►  navegador
```

En producción las variables vienen del entorno del servidor de CI/deploy (no del `.env`).

## Qué NO cambia

- Toda la lógica de sync (`scheduleSync`, `pushToSupabase`, `syncFromSupabase`)
- El flujo de `bootWithSession`
- Login y registro abiertos
- Aislamiento de datos por `user_id`

## Fuera de alcance

- Cambios de RLS en Supabase (se revisan en la pasada de seguridad posterior)
- Billing / planes de pago
