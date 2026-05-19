# SaaS Credentials — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminar la configuración de Supabase de la UI e incrustar las credenciales en `bundle.js` en tiempo de build, convirtiendo la app en un SaaS donde los usuarios solo ven login/registro.

**Architecture:** `build.py` y `build.mjs` leen `SUPABASE_URL` y `SUPABASE_ANON_KEY` del `.env` (o del entorno) y reemplazan placeholders en `bundle.js` después de generar el bundle. `supabase-client.js` se simplifica para usar esos placeholders directamente, sin localStorage.

**Tech Stack:** Python 3 (build.py), Node.js (build.mjs), Vanilla JS

---

### Task 1: Simplificar `supabase-client.js`

**Files:**
- Modify: `js/supabase-client.js`

- [ ] **Reemplazar el contenido completo de `js/supabase-client.js`**

```js
// Supabase client singleton — credentials injected at build time
const SupabaseClient = {
  _client: null,

  isConfigured() { return true; },

  get() {
    if (!this._client) {
      try {
        if (!window.supabase) { console.error('Supabase SDK not loaded'); return null; }
        this._client = window.supabase.createClient('__SUPABASE_URL__', '__SUPABASE_ANON_KEY__');
      } catch (e) {
        console.error('Supabase client init error:', e);
        return null;
      }
    }
    return this._client;
  },
};
```

- [ ] **Commit**

```bash
git add js/supabase-client.js
git commit -m "refactor: supabase-client uses build-time placeholders, remove config methods"
```

---

### Task 2: Inyección de credenciales en `build.py`

**Files:**
- Modify: `build.py`

- [ ] **Agregar función `read_dotenv` y lógica de inyección al final de `build.py`**

Reemplazar el bloque final:

```python
bundle = ''.join(parts)
out_path = os.path.join(BASE, 'js', 'bundle.js')
with open(out_path, 'w', encoding='utf-8') as f:
    f.write(bundle)

print(f'Bundle written to {out_path} ({len(bundle):,} bytes)')
```

Por:

```python
def read_dotenv():
    env = {}
    dotenv_path = os.path.join(BASE, '.env')
    if os.path.exists(dotenv_path):
        with open(dotenv_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, _, val = line.partition('=')
                    env[key.strip()] = val.strip().strip('"').strip("'")
    return env

dotenv = read_dotenv()
supabase_url = os.environ.get('SUPABASE_URL') or dotenv.get('SUPABASE_URL', '')
supabase_anon_key = os.environ.get('SUPABASE_ANON_KEY') or dotenv.get('SUPABASE_ANON_KEY', '')

if not supabase_url or not supabase_anon_key:
    print('ERROR: SUPABASE_URL y SUPABASE_ANON_KEY deben estar en .env o en el entorno')
    raise SystemExit(1)

bundle = ''.join(parts)
bundle = bundle.replace('__SUPABASE_URL__', supabase_url)
bundle = bundle.replace('__SUPABASE_ANON_KEY__', supabase_anon_key)

out_path = os.path.join(BASE, 'js', 'bundle.js')
with open(out_path, 'w', encoding='utf-8') as f:
    f.write(bundle)

print(f'Bundle written to {out_path} ({len(bundle):,} bytes)')
print(f'  SUPABASE_URL injected: {supabase_url[:40]}...')
```

- [ ] **Verificar que el build funciona**

```bash
python build.py
```

Expected: `Bundle written to ... SUPABASE_URL injected: https://...`
Si falla con `ERROR: SUPABASE_URL...`, verificar que `.env` tiene `SUPABASE_URL` y `SUPABASE_ANON_KEY`.

- [ ] **Verificar que los placeholders fueron reemplazados en bundle.js**

```bash
python -c "import re; c=open('js/bundle.js').read(); print('URL OK' if 'supabase.co' in c else 'FAIL URL'); print('KEY OK' if '__SUPABASE_ANON_KEY__' not in c else 'FAIL KEY')"
```

Expected: `URL OK` y `KEY OK`

- [ ] **Commit**

```bash
git add build.py
git commit -m "feat: build.py injects SUPABASE_URL and SUPABASE_ANON_KEY from .env"
```

---

### Task 3: Inyección de credenciales en `build.mjs`

**Files:**
- Modify: `build.mjs`

- [ ] **Agregar imports y lógica de inyección en `build.mjs`**

Reemplazar el bloque de imports al inicio:

```js
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
```

- [ ] **Agregar función `readDotenv` después de la declaración de `BASE`**

```js
function readDotenv() {
  const env = {};
  const dotenvPath = join(BASE, '.env');
  if (existsSync(dotenvPath)) {
    readFileSync(dotenvPath, 'utf-8').split('\n').forEach(line => {
      line = line.trim();
      if (line && !line.startsWith('#') && line.includes('=')) {
        const [key, ...rest] = line.split('=');
        env[key.trim()] = rest.join('=').trim().replace(/^["']|["']$/g, '');
      }
    });
  }
  return env;
}

const dotenv = readDotenv();
const supabaseUrl = process.env.SUPABASE_URL || dotenv.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || dotenv.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('ERROR: SUPABASE_URL y SUPABASE_ANON_KEY deben estar en .env o en el entorno');
  process.exit(1);
}
```

- [ ] **Reemplazar el bloque final de escritura del bundle**

Reemplazar:

```js
const bundle = parts.join('');
const outPath = join(BASE, 'js', 'bundle.js');
writeFileSync(outPath, bundle, 'utf-8');
console.log(`Bundle written to ${outPath} (${bundle.length.toLocaleString()} bytes)`);
```

Por:

```js
let bundle = parts.join('');
bundle = bundle.replace(/__SUPABASE_URL__/g, supabaseUrl);
bundle = bundle.replace(/__SUPABASE_ANON_KEY__/g, supabaseAnonKey);

const outPath = join(BASE, 'js', 'bundle.js');
writeFileSync(outPath, bundle, 'utf-8');
console.log(`Bundle written to ${outPath} (${bundle.length.toLocaleString()} bytes)`);
console.log(`  SUPABASE_URL injected: ${supabaseUrl.slice(0, 40)}...`);
```

- [ ] **Commit**

```bash
git add build.mjs
git commit -m "feat: build.mjs injects SUPABASE_URL and SUPABASE_ANON_KEY from .env"
```

---

### Task 4: Limpiar `auth.js` — eliminar sección de configuración

**Files:**
- Modify: `js/auth.js`

- [ ] **Eliminar `const cfg = SupabaseClient.getConfig();` de `showScreen`**

En `showScreen` (línea ~33), eliminar:

```js
    const cfg = SupabaseClient.getConfig();
```

La línea desaparece completamente.

- [ ] **Eliminar el bloque `<details class="auth-config-details">` del HTML**

Eliminar este bloque completo del template:

```js
        <details class="auth-config-details" ${cfg.url ? '' : 'open'}>
          <summary><i data-lucide="settings"></i> Configuración de Supabase</summary>
          <div class="auth-config-body">
            <p class="text-xs text-muted" style="margin-bottom:10px">
              Ingresa las credenciales de tu proyecto Supabase.<br>
              Las encuentras en <strong>Settings → API</strong> dentro de tu proyecto.
            </p>
            <div class="form-group">
              <label class="form-label">Project URL</label>
              <input class="form-control" id="auth-sb-url" type="url" placeholder="https://xxxx.supabase.co" value="${cfg.url}">
            </div>
            <div class="form-group">
              <label class="form-label">Anon / Public key</label>
              <input class="form-control" id="auth-sb-key" type="password" placeholder="eyJ..." value="${cfg.anonKey}">
            </div>
            <button class="btn btn--secondary btn--sm auth-btn" id="auth-save-config">
              <i data-lucide="save"></i> Guardar configuración
            </button>
            <div id="auth-config-msg" class="auth-error hidden" style="margin-top:8px"></div>
          </div>
        </details>
```

- [ ] **Eliminar el event listener `#auth-save-config`**

Eliminar este bloque completo de los listeners al final de `showScreen`:

```js
    // Save Supabase config
    overlay.querySelector('#auth-save-config').addEventListener('click', () => {
      const url = overlay.querySelector('#auth-sb-url').value.trim();
      const key = overlay.querySelector('#auth-sb-key').value.trim();
      const msgEl = overlay.querySelector('#auth-config-msg');
      if (!url || !key) {
        msgEl.textContent = 'Ingresa URL y anon key.';
        msgEl.classList.remove('hidden');
        return;
      }
      SupabaseClient.saveConfig(url, key);
      msgEl.textContent = '✓ Configuración guardada. Ahora puedes iniciar sesión.';
      msgEl.classList.remove('hidden');
      msgEl.style.color = 'var(--success)';
    });
```

- [ ] **Commit**

```bash
git add js/auth.js
git commit -m "feat: remove Supabase config from login screen — SaaS mode"
```

---

### Task 5: Limpiar `settings.js` — eliminar card de Supabase

**Files:**
- Modify: `js/modules/settings.js`

- [ ] **Eliminar las 4 variables de Supabase al inicio de `renderSettings`**

Eliminar estas líneas (aprox. líneas 20–31):

```js
  // Supabase status — compute before template literal to avoid IIFE-in-backtick issues
  const _sbCfg = SupabaseClient.getConfig();
  const _sbUser = Auth.getCurrentUser();
  const _sbConfigured = SupabaseClient.isConfigured();
  const _sbStatusBadge = _sbConfigured && _sbUser
    ? `<div class="alert alert--success" style="margin-bottom:16px"><i data-lucide="check-circle-2"></i> <span>Conectado como <strong>${_sbUser.email}</strong></span></div>`
    : _sbConfigured
    ? `<div class="alert alert--warning" style="margin-bottom:16px"><i data-lucide="alert-circle"></i> <span>Supabase configurado — sin sesión activa.</span></div>`
    : `<div class="alert alert--info" style="margin-bottom:16px"><i data-lucide="info"></i> <span>Configura Supabase para sincronizar tus datos entre dispositivos.</span></div>`;
  const _sbSyncBtn = _sbConfigured && _sbUser
    ? `<button class="btn btn--ghost btn--sm" id="sb-sync-now"><i data-lucide="refresh-cw"></i> Sincronizar ahora</button>`
    : '';
```

- [ ] **Eliminar la card `#supabase-card` del HTML**

Eliminar este bloque completo del template:

```js
      <!-- Supabase Cloud Sync -->
      <div class="card" id="supabase-card">
        <div class="card__header"><span class="card__title"><i data-lucide="cloud"></i> Sincronización en la nube (Supabase)</span></div>
        <div class="card__body">
          ${_sbStatusBadge}
          <div class="form-row form-row--2">
            <div class="form-group">
              <label class="form-label">Project URL</label>
              <input class="form-control" id="sb-url" type="url" placeholder="https://xxxx.supabase.co" value="${_sbCfg.url}">
            </div>
            <div class="form-group">
              <label class="form-label">Anon / Public key</label>
              <input class="form-control" id="sb-key" type="password" placeholder="eyJ..." value="${_sbCfg.anonKey}">
            </div>
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            <button class="btn btn--secondary btn--sm" id="sb-save-cfg"><i data-lucide="save"></i> Guardar configuración</button>
            ${_sbSyncBtn}
          </div>
        </div>
      </div>
```

- [ ] **Eliminar los dos event listeners de Supabase**

Eliminar este bloque completo (aprox. líneas 569–593):

```js
  // Supabase config save
  container.querySelector('#sb-save-cfg')?.addEventListener('click', () => {
    const url = container.querySelector('#sb-url')?.value.trim();
    const key = container.querySelector('#sb-key')?.value.trim();
    if (!url || !key) { showToast('Ingresa URL y anon key', 'error'); return; }
    SupabaseClient.saveConfig(url, key);
    showToast('Configuración de Supabase guardada. Recargando...');
    setTimeout(() => location.reload(), 1200);
  });

  // Sync now
  container.querySelector('#sb-sync-now')?.addEventListener('click', async () => {
    const client = SupabaseClient.get();
    const user = Auth.getCurrentUser();
    if (!client || !user) { showToast('No hay sesión activa', 'error'); return; }
    const btn = container.querySelector('#sb-sync-now');
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Sincronizando...';
    if (window.lucide) lucide.createIcons({ nodes: [btn] });
    await Store.pushToSupabase(client, user.id);
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="refresh-cw"></i> Sincronizar ahora';
    if (window.lucide) lucide.createIcons({ nodes: [btn] });
    showToast('Datos sincronizados con Supabase');
  });
```

- [ ] **Commit**

```bash
git add js/modules/settings.js
git commit -m "feat: remove Supabase config card from settings — SaaS mode"
```

---

### Task 6: Simplificar `app.js` — eliminar branch `isConfigured`

**Files:**
- Modify: `js/app.js`

- [ ] **Reemplazar la función `init()` completa**

Reemplazar:

```js
async function init() {
  const settings = Store.getSettings();
  document.documentElement.setAttribute('data-theme', settings.theme || 'dark');
  I18n.setLang(settings.lang || 'es');

  if (!SupabaseClient.isConfigured()) {
    Auth.showScreen(bootWithSession);
    return;
  }

  const session = await Auth.getSession();
  if (!session) {
    Auth.showScreen(bootWithSession);
    return;
  }
  await bootWithSession(session);
}
```

Por:

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

- [ ] **Commit**

```bash
git add js/app.js
git commit -m "refactor: simplify init() — remove isConfigured branch (always true in SaaS)"
```

---

### Task 7: Rebuild y verificación final

**Files:**
- Regenerate: `js/bundle.js`

- [ ] **Regenerar el bundle**

```bash
python build.py
```

Expected:
```
Bundle written to .../js/bundle.js (X,XXX bytes)
  SUPABASE_URL injected: https://...
```

- [ ] **Verificar que no quedan referencias a `getConfig` ni `saveConfig` en el bundle**

```bash
python -c "
c = open('js/bundle.js').read()
checks = {
  'getConfig gone': 'getConfig' not in c,
  'saveConfig gone': 'saveConfig' not in c,
  'auth-sb-url gone': 'auth-sb-url' not in c,
  'supabase-card gone': 'supabase-card' not in c,
  'URL injected': '__SUPABASE_URL__' not in c,
  'KEY injected': '__SUPABASE_ANON_KEY__' not in c,
}
for k, v in checks.items():
    print(f'  {\"OK\" if v else \"FAIL\"}: {k}')
"
```

Expected: todos en `OK`.

- [ ] **Commit bundle regenerado**

```bash
git add js/bundle.js
git commit -m "build: regenerate bundle — SaaS credentials injected, config UI removed"
```

- [ ] **Push**

```bash
git push
```
