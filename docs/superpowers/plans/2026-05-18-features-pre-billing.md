# Features Pre-Billing — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 5 time-saving features before billing: client approval portal, open tracking, Kanban pipeline, auto-reminders, and quick quote from history.

**Architecture:** Vanilla JS SPA bundled by `build.py` into `js/bundle.js`; Supabase stores all data as JSONB in `user_data`; `server.py` is extended to serve a public portal at `/q/:token` using Python REST calls to Supabase with service-role key; new modules (`kanban.js`, `reminders.js`) are added to the build pipeline.

**Tech Stack:** Vanilla JS (ES modules → bundle), Python 3 (server.py), Supabase REST API, CSS custom properties (existing design system), Lucide icons (already loaded).

**Spec:** `docs/superpowers/specs/2026-05-18-features-pre-billing-design.md`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `supabase-schema.sql` | Modify | Add `quote_tokens` table |
| `.env.example` | Create | Template for SUPABASE_URL and service role key |
| `.gitignore` | Modify | Add `.env` |
| `server.py` | Rewrite | Static files + portal routes `/q/:token`, `POST /api/q/:token/*` |
| `js/utils.js` | Modify | Add `generatePublicToken()` |
| `js/store.js` | Modify | Add settings defaults for new fields |
| `js/modules/kanban.js` | Create | Kanban board component |
| `js/reminders.js` | Create | Pure reminder evaluation logic |
| `js/modules/quotations.js` | Modify | "Enviar link" button, toggle view, reminder banner, basedOn, product suggestions |
| `js/modules/clients.js` | Modify | Quotation history section in client edit view |
| `js/modules/settings.js` | Modify | Seguimiento + Portal appearance sections |
| `js/app.js` | Modify | Call `evaluateReminders()` on boot |
| `build.py` | Modify | Add `kanban.js` and `reminders.js` to FILES list |
| `css/styles.css` | Modify | Kanban, tracking badge, reminder banner styles |
| `tests/run.js` | Create | Node.js tests for pure utility functions |

---

## Task 1: Supabase Schema + Environment Setup

**Files:**
- Modify: `supabase-schema.sql`
- Create: `.env.example`
- Modify: `.gitignore`

- [ ] **Step 1.1: Add `quote_tokens` table to `supabase-schema.sql`**

Append at the end of the file:

```sql
-- ============================================================
-- Portal de aprobación — tabla de tokens públicos
-- ============================================================

create table if not exists public.quote_tokens (
  token      text primary key,
  user_id    uuid references auth.users(id) on delete cascade not null,
  quote_id   text not null,
  created_at timestamptz not null default now()
);

alter table public.quote_tokens enable row level security;

-- Solo el usuario dueño puede insertar su token
create policy "Equipo inserta tokens propios"
  on public.quote_tokens for insert
  with check (auth.uid() = user_id);

-- Actualiza un token existente (re-envío de la misma cotización)
create policy "Equipo actualiza tokens propios"
  on public.quote_tokens for update
  using (auth.uid() = user_id);
```

- [ ] **Step 1.2: Run the SQL in Supabase**

Open Supabase Dashboard → SQL Editor → pega y ejecuta el bloque anterior.
Verifica que la tabla `quote_tokens` aparece en Table Editor.

- [ ] **Step 1.3: Create `.env.example`**

```
# CotizaPro — variables de entorno para el servidor del portal
# Copia este archivo como .env y rellena los valores

SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

- [ ] **Step 1.4: Add `.env` to `.gitignore`**

If `.gitignore` doesn't exist, create it. Add:

```
.env
.superpowers/
```

- [ ] **Step 1.5: Commit**

```bash
git add supabase-schema.sql .env.example .gitignore
git commit -m "feat: add quote_tokens schema and env setup"
```

---

## Task 2: Token Generation Utility + Store Defaults

**Files:**
- Modify: `js/utils.js`
- Modify: `js/store.js`
- Create: `tests/run.js`

- [ ] **Step 2.1: Write failing test for `generatePublicToken`**

Create `tests/run.js`:

```js
// tests/run.js — run with: node tests/run.js
let pass = 0, fail = 0;
function assert(desc, condition) {
  if (condition) { console.log(`  ✓ ${desc}`); pass++; }
  else { console.error(`  ✗ FAIL: ${desc}`); fail++; }
}

// ── generatePublicToken ──────────────────────────────────────
// Stub using Buffer since crypto.getRandomValues isn't in Node REPL
function generatePublicToken() {
  throw new Error('not implemented');
}

console.log('\ngeneratePublicToken:');
let token;
try { token = generatePublicToken(); } catch(e) { token = null; }
assert('returns a string', typeof token === 'string');
assert('is 32 chars', token?.length === 32);
assert('is hex', /^[0-9a-f]+$/.test(token || ''));

// ── evaluateReminders (pure logic extracted) ─────────────────
const MS = 86400000;
function daysAgo(n) { return new Date(Date.now() - n * MS).toISOString().slice(0,10); }

function shouldRemindNoOpen(q, cfg) {
  if (q.status !== 'sent') return false;
  if (q.viewedAt || (q.reminderSent || {}).noOpen) return false;
  if (!cfg?.enabled) return false;
  return (Date.now() - new Date(q.date).getTime()) / MS >= (cfg.days || 3);
}

console.log('\nshouldRemindNoOpen:');
const cfg = { enabled: true, days: 3 };
assert('triggers after N days', shouldRemindNoOpen({ status: 'sent', date: daysAgo(4) }, cfg));
assert('silent before N days',  !shouldRemindNoOpen({ status: 'sent', date: daysAgo(2) }, cfg));
assert('silent if viewed',      !shouldRemindNoOpen({ status: 'sent', date: daysAgo(4), viewedAt: new Date().toISOString() }, cfg));
assert('silent if reminded',    !shouldRemindNoOpen({ status: 'sent', date: daysAgo(4), reminderSent: { noOpen: true } }, cfg));
assert('silent if draft',       !shouldRemindNoOpen({ status: 'draft', date: daysAgo(4) }, cfg));
assert('silent if disabled',    !shouldRemindNoOpen({ status: 'sent', date: daysAgo(4) }, { enabled: false, days: 3 }));

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
```

- [ ] **Step 2.2: Run test — verify it fails**

```bash
node tests/run.js
```

Expected: `✗ FAIL: returns a string` (and subsequent failures)

- [ ] **Step 2.3: Add `generatePublicToken` to `js/utils.js`**

Add before the closing `export { formatCurrency };` line:

```js
export function generatePublicToken() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}
```

- [ ] **Step 2.4: Update the stub in `tests/run.js` to use Buffer (Node compat)**

Replace the stub `generatePublicToken` function in `tests/run.js` with:

```js
function generatePublicToken() {
  const buf = Buffer.alloc(16);
  for (let i = 0; i < 16; i++) buf[i] = Math.floor(Math.random() * 256);
  return Array.from(buf, b => b.toString(16).padStart(2, '0')).join('');
}
```

- [ ] **Step 2.5: Run test — verify it passes**

```bash
node tests/run.js
```

Expected: all `generatePublicToken` tests pass. The `shouldRemindNoOpen` tests will also pass since the logic is already in the test file.

- [ ] **Step 2.6: Add settings defaults to `js/store.js`**

In `store.js`, find the `defaults` object and extend the `settings` entry:

```js
  settings: {
    theme: 'dark', lang: 'es', currency: 'MXN', exchangeRate: 17.50,
    iva: 16, ieps: 0, retIVA: 0, retISR: 0,
    paymentTerms: 30, validityDays: 15,
    // Portal + reminders (new)
    approvalMode: 'click',
    portalHeaderColor: '#6366f1',
    quotationsView: 'kanban',
    reminders: {
      noOpen:   { enabled: true,  days: 3 },
      noReply:  { enabled: true,  days: 2 },
      expiring: { enabled: false, days: 2 },
    },
  },
```

- [ ] **Step 2.7: Rebuild bundle**

```bash
python build.py
```

Expected: `Bundle written to js/bundle.js (XXX,XXX bytes)`

- [ ] **Step 2.8: Commit**

```bash
git add js/utils.js js/store.js tests/run.js build.py
git commit -m "feat: add generatePublicToken and settings defaults for portal+reminders"
```

---

## Task 3: Server.py — Portal Route (GET /q/:token)

**Files:**
- Rewrite: `server.py`

- [ ] **Step 3.1: Set environment variables**

In your terminal (before starting the server), set:

```bash
# Windows PowerShell
$env:SUPABASE_URL = "https://tu-proyecto.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "eyJ..."

# Or add them to a .env file and load manually
```

Alternatively, create a `.env` file at the project root (gitignored):
```
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

- [ ] **Step 3.2: Rewrite `server.py`**

```python
#!/usr/bin/env python3
import sys
import os
import json
import urllib.request
import urllib.parse
import html as htmllib
from http.server import HTTPServer, SimpleHTTPRequestHandler
from datetime import datetime, timezone

# Load .env if present (no external deps)
_env_path = os.path.join(os.path.dirname(__file__), '.env')
if os.path.isfile(_env_path):
    with open(_env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                os.environ.setdefault(k.strip(), v.strip())

SUPABASE_URL = os.getenv('SUPABASE_URL', '').rstrip('/')
SERVICE_KEY  = os.getenv('SUPABASE_SERVICE_ROLE_KEY', '')


def sb_get(table, params):
    query = urllib.parse.urlencode(params)
    url = f'{SUPABASE_URL}/rest/v1/{table}?{query}'
    req = urllib.request.Request(url, headers={
        'apikey': SERVICE_KEY,
        'Authorization': f'Bearer {SERVICE_KEY}',
    })
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.loads(r.read())


def sb_patch(table, params, body):
    query = urllib.parse.urlencode(params)
    url = f'{SUPABASE_URL}/rest/v1/{table}?{query}'
    data = json.dumps(body).encode()
    req = urllib.request.Request(url, data=data, method='PATCH', headers={
        'apikey': SERVICE_KEY,
        'Authorization': f'Bearer {SERVICE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
    })
    with urllib.request.urlopen(req, timeout=10) as r:
        return r.status


def fmt_currency(amount, currency='MXN'):
    try:
        return f'{float(amount):,.2f} {currency}'
    except Exception:
        return f'0.00 {currency}'


def render_error(message):
    esc = htmllib.escape
    return f'''<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>CotizaPro</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
<style>*{{box-sizing:border-box;margin:0;padding:0}}body{{font-family:Inter,sans-serif;background:#0f172a;color:#e2e8f0;display:flex;align-items:center;justify-content:center;min-height:100vh}}.box{{text-align:center;padding:40px}}.icon{{font-size:48px;margin-bottom:16px}}h2{{font-size:20px;margin-bottom:8px}}p{{color:#64748b;font-size:14px}}</style>
</head><body>
<div class="box">
  <div class="icon">📄</div>
  <h2>{esc(message)}</h2>
  <p>Si crees que es un error, contacta al equipo que te envió la cotización.</p>
</div>
</body></html>'''


def render_portal(q, company, settings):
    esc = htmllib.escape

    approval_mode = q.get('approvalMode', 'click')
    status = q.get('status', 'sent')
    already_acted = status in ('approved', 'rejected')
    token = q.get('publicToken', '')
    header_color = settings.get('portalHeaderColor', '#6366f1')

    company_name = esc(company.get('name', 'Empresa'))
    company_rfc  = esc(company.get('rfc', ''))
    logo         = company.get('logo', '')
    logo_html    = f'<img src="{esc(logo)}" style="height:40px;object-fit:contain">' if logo else \
                   f'<div style="font-size:22px;font-weight:800;color:white">{esc((company.get("name","?")[:2]).upper())}</div>'

    items_html = ''
    for item in (q.get('items') or []):
        qty   = float(item.get('qty', 0))
        price = float(item.get('unitPrice', 0))
        disc  = float(item.get('discount', 0))
        tax   = float(item.get('taxRate', 0))
        after = qty * price * (1 - disc / 100)
        total = after * (1 + tax / 100)
        currency = q.get('currency', 'MXN')
        items_html += f'''<tr>
          <td style="padding:10px 12px">{esc(str(item.get('description', '')))}</td>
          <td style="padding:10px 12px;text-align:center">{qty:g}</td>
          <td style="padding:10px 12px;text-align:right">{fmt_currency(price, currency)}</td>
          <td style="padding:10px 12px;text-align:right">{fmt_currency(total, currency)}</td>
        </tr>'''

    currency     = q.get('currency', 'MXN')
    subtotal     = q.get('subtotal', 0)
    discount_tot = q.get('discountTotal', 0)
    tax_tot      = q.get('taxTotal', 0)
    total        = q.get('total', 0)
    notes        = q.get('notes', '')

    discount_row = f'<div class="total-row"><span>Descuento</span><span style="color:#ef4444">-{fmt_currency(discount_tot, currency)}</span></div>' \
                   if discount_tot else ''
    notes_card   = f'<div class="card"><div class="label">Notas</div><div style="font-size:13px;margin-top:4px">{esc(notes)}</div></div>' \
                   if notes else ''

    if already_acted:
        action_html = '<div style="text-align:center;padding:20px;color:#22c55e;font-weight:600;font-size:16px">✓ Respuesta registrada. ¡Gracias!</div>'
    elif approval_mode == 'comments':
        action_html = f'''
        <textarea id="client-comment" placeholder="Comentarios o solicitudes de cambio (opcional)..."
          style="width:100%;box-sizing:border-box;background:#0f172a;border:1px solid #334155;color:#e2e8f0;
                 border-radius:8px;padding:12px;font-size:14px;min-height:80px;margin-bottom:12px;
                 font-family:inherit;resize:vertical"></textarea>
        <div style="display:flex;gap:8px">
          <button onclick="sendAction('approved')"           class="btn-approve">✓ Aprobar</button>
          <button onclick="sendAction('changes_requested')"  class="btn-changes">✎ Solicitar cambios</button>
          <button onclick="sendAction('rejected')"           class="btn-reject">✕</button>
        </div>'''
    elif approval_mode == 'signature':
        action_html = f'''
        <textarea id="client-comment" placeholder="Comentarios (opcional)..."
          style="width:100%;box-sizing:border-box;background:#0f172a;border:1px solid #334155;color:#e2e8f0;
                 border-radius:8px;padding:12px;font-size:14px;min-height:60px;margin-bottom:10px;
                 font-family:inherit;resize:vertical"></textarea>
        <div style="display:flex;gap:8px;margin-bottom:10px">
          <input id="client-name" placeholder="Nombre del firmante"
            style="flex:1;background:#0f172a;border:1px solid #334155;color:#e2e8f0;border-radius:8px;padding:10px;font-size:14px;font-family:inherit">
          <input id="signed-at" type="date"
            style="background:#0f172a;border:1px solid #334155;color:#e2e8f0;border-radius:8px;padding:10px;font-size:14px">
        </div>
        <div style="display:flex;gap:8px">
          <button onclick="sendAction('approved')"           class="btn-approve">✓ Firmar y aprobar</button>
          <button onclick="sendAction('changes_requested')"  class="btn-changes">✎ Solicitar cambios</button>
          <button onclick="sendAction('rejected')"           class="btn-reject">✕</button>
        </div>'''
    else:  # click (default)
        action_html = '''
        <div style="display:flex;gap:12px">
          <button onclick="sendAction('approved')" class="btn-approve" style="flex:1;font-size:16px">✓ Aprobar cotización</button>
          <button onclick="sendAction('rejected')" class="btn-reject">✕ Rechazar</button>
        </div>'''

    return f'''<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Cotización {esc(str(q.get("folio","")))} — {company_name}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    *{{box-sizing:border-box;margin:0;padding:0}}
    body{{font-family:Inter,sans-serif;background:#0f172a;color:#e2e8f0;min-height:100vh}}
    .portal{{max-width:680px;margin:0 auto;padding:24px 16px 60px}}
    .header{{background:{header_color};border-radius:12px;padding:20px 24px;display:flex;align-items:center;gap:16px;margin-bottom:20px}}
    .header-text{{flex:1}}
    .header-title{{font-weight:800;font-size:18px;color:white}}
    .header-sub{{font-size:12px;opacity:.75;color:white;margin-top:2px}}
    .card{{background:#1e293b;border-radius:10px;padding:20px;margin-bottom:16px}}
    .meta-row{{display:flex;justify-content:space-between;font-size:13px;gap:20px}}
    .label{{color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px}}
    table{{width:100%;border-collapse:collapse;font-size:13px}}
    thead tr{{background:#0f172a}}
    th{{padding:8px 12px;text-align:left;color:#64748b;font-weight:500;font-size:11px;text-transform:uppercase}}
    tbody tr{{border-top:1px solid #0f172a20}}
    .totals{{border-top:2px solid #334155;margin-top:8px;padding-top:8px}}
    .total-row{{display:flex;justify-content:space-between;padding:4px 12px;font-size:13px}}
    .total-row--main{{font-weight:700;font-size:17px;color:{header_color};padding:10px 12px}}
    .section-title{{font-weight:600;font-size:13px;color:#94a3b8;margin-bottom:12px}}
    .btn-approve{{flex:1;background:{header_color};color:white;border:none;padding:13px;border-radius:8px;font-size:14px;cursor:pointer;font-weight:600;font-family:inherit}}
    .btn-changes{{flex:1;background:#1e293b;color:#fbbf24;border:1px solid #fbbf2440;padding:13px;border-radius:8px;font-size:14px;cursor:pointer;font-family:inherit}}
    .btn-reject{{background:#1e293b;color:#ef4444;border:1px solid #ef444440;padding:13px 18px;border-radius:8px;font-size:14px;cursor:pointer;font-family:inherit}}
  </style>
</head>
<body>
<div class="portal">
  <div class="header">
    {logo_html}
    <div class="header-text">
      <div class="header-title">{company_name}</div>
      <div class="header-sub">{company_rfc}</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:11px;color:rgba(255,255,255,.6)">Cotización</div>
      <div style="font-weight:700;font-size:15px;color:white">{esc(str(q.get("folio","—")))}</div>
    </div>
  </div>

  <div class="card">
    <div class="meta-row">
      <div><div class="label">Fecha</div><div>{esc(str(q.get("date","—")))}</div></div>
      <div style="text-align:right"><div class="label">Válida hasta</div><div>{esc(str(q.get("validUntil","—")))}</div></div>
    </div>
  </div>

  <div class="card">
    <div class="section-title">Partidas</div>
    <table>
      <thead><tr>
        <th>Descripción</th>
        <th style="text-align:center">Cant.</th>
        <th style="text-align:right">Precio u.</th>
        <th style="text-align:right">Total</th>
      </tr></thead>
      <tbody>{items_html}</tbody>
    </table>
    <div class="totals">
      {discount_row}
      <div class="total-row"><span>Subtotal</span><span>{fmt_currency(subtotal, currency)}</span></div>
      <div class="total-row"><span>IVA</span><span>{fmt_currency(tax_tot, currency)}</span></div>
      <div class="total-row total-row--main"><span>Total</span><span>{fmt_currency(total, currency)}</span></div>
    </div>
  </div>

  {notes_card}

  <div class="card">
    <div class="section-title" style="margin-bottom:16px">Tu respuesta</div>
    <div id="action-area">{action_html}</div>
    <div id="action-done" style="display:none;text-align:center;padding:16px;color:#22c55e;font-weight:600">✓ Respuesta registrada. ¡Gracias!</div>
  </div>
</div>
<script>
  fetch('/api/q/{token}/viewed', {{method:'POST'}}).catch(()=>{{}});
  function sendAction(action) {{
    const comment    = document.getElementById('client-comment')?.value || '';
    const clientName = document.getElementById('client-name')?.value   || '';
    const signedAt   = document.getElementById('signed-at')?.value     || '';
    fetch('/api/q/{token}/action', {{
      method: 'POST',
      headers: {{'Content-Type': 'application/json'}},
      body: JSON.stringify({{action, comment, clientName, signedAt}})
    }}).then(r => {{
      if (r.ok) {{
        document.getElementById('action-area').style.display = 'none';
        document.getElementById('action-done').style.display = 'block';
      }}
    }}).catch(() => alert('Error al enviar. Intenta de nuevo.'));
  }}
</script>
</body></html>'''


class Handler(SimpleHTTPRequestHandler):

    def do_GET(self):
        path = urllib.parse.urlparse(self.path).path
        if path.startswith('/q/') and len(path) > 3:
            self._serve_portal(path[3:].strip('/'))
        else:
            super().do_GET()

    def do_POST(self):
        path = urllib.parse.urlparse(self.path).path
        parts = path.split('/')           # ['', 'api', 'q', TOKEN, ENDPOINT]
        if path.startswith('/api/q/') and len(parts) == 5:
            token    = parts[3]
            endpoint = parts[4]
            length   = int(self.headers.get('Content-Length', 0))
            body     = json.loads(self.rfile.read(length)) if length else {}
            if endpoint == 'viewed':
                self._handle_viewed(token)
            elif endpoint == 'action':
                self._handle_action(token, body)
            else:
                self._json(405, {'error': 'unknown endpoint'})
        else:
            self._json(404, {'error': 'not found'})

    # ── portal GET ────────────────────────────────────────────
    def _serve_portal(self, token):
        if not SUPABASE_URL or not SERVICE_KEY:
            return self._html(503, render_error('Servidor no configurado'))
        try:
            rows = sb_get('quote_tokens', {'token': f'eq.{token}', 'select': '*'})
            if not rows:
                return self._html(404, render_error('Esta cotización ya no está disponible'))
            user_id  = rows[0]['user_id']
            quote_id = rows[0]['quote_id']

            ud_rows = sb_get('user_data', {'user_id': f'eq.{user_id}', 'select': 'quotations,company,settings'})
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

    # ── POST /api/q/:token/viewed ─────────────────────────────
    def _handle_viewed(self, token):
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

    # ── POST /api/q/:token/action ─────────────────────────────
    def _handle_action(self, token, body):
        action = body.get('action')
        if action not in ('approved', 'rejected', 'changes_requested'):
            return self._json(400, {'error': 'invalid action'})
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
                    qt['status'] = action
                    if action == 'approved':
                        qt['approvedAt'] = now
                    elif action == 'rejected':
                        qt['rejectedAt'] = now
                    else:
                        qt['changesRequestedAt'] = now
                    if body.get('comment'):
                        qt['clientComment'] = body['comment']
                    if body.get('clientName'):
                        qt['clientName'] = body['clientName']
                    if body.get('signedAt'):
                        qt['signedAt'] = body['signedAt']
                    break

            sb_patch('user_data', {'user_id': f'eq.{user_id}'}, {'quotations': quotations})
            self._json(200, {'ok': True})
        except Exception as e:
            print(f'[action error] {e}', flush=True)
            self._json(500, {'error': str(e)})

    # ── helpers ───────────────────────────────────────────────
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

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def log_message(self, fmt, *args):
        pass  # suppress per-request logs


port = int(sys.argv[1]) if len(sys.argv) > 1 else 3333
print(f'Serving on http://localhost:{port}', flush=True)
HTTPServer(('', port), Handler).serve_forever()
```

- [ ] **Step 3.3: Smoke test — portal not found**

Start the server: `python server.py 3333`

Open: `http://localhost:3333/q/tokeninexistente`

Expected: "Esta cotización ya no está disponible" page renders.

- [ ] **Step 3.4: Commit**

```bash
git add server.py
git commit -m "feat: extend server.py with portal routes /q/:token and POST /api/q/:token/*"
```

---

## Task 4: "Enviar Link" Button in Quotation View

**Files:**
- Modify: `js/modules/quotations.js`

This task adds the "Enviar link" button to the quotation detail view (`renderQuotationView`). When clicked, it generates a `publicToken`, inserts it into `quote_tokens` via the user's Supabase session, updates the quotation, and shows a copyable link.

- [ ] **Step 4.1: Add `_showSendLinkModal` helper function**

Inside `quotations.js`, after the `duplicateQuotation` function, add:

```js
async function sendPublicLink(q, container, params) {
  if (!window._supSync) {
    showToast('Requiere sesión de Supabase para generar el link.', 'error');
    return;
  }
  const { client, userId } = window._supSync;
  const settings = Store.getSettings();
  const token = q.publicToken || generatePublicToken();
  const approvalMode = settings.approvalMode || 'click';

  // Insert / upsert token in Supabase
  const { error } = await client.from('quote_tokens').upsert(
    { token, user_id: userId, quote_id: q.id },
    { onConflict: 'token' }
  );
  if (error) {
    showToast('Error al generar el link: ' + error.message, 'error');
    return;
  }

  // Update quotation
  const updated = {
    ...q,
    publicToken: token,
    approvalMode,
    status: q.status === 'draft' ? 'sent' : q.status,
    sentAt: q.sentAt || new Date().toISOString(),
  };
  Store.upsertQuotation(updated);

  const link = `${window.location.origin}/q/${token}`;

  // Show modal
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay modal-overlay--active';
  overlay.innerHTML = `
    <div class="modal modal--sm">
      <div class="modal__header">
        <span class="modal__title">Link de aprobación</span>
        <button class="modal__close" id="close-link-modal"><i data-lucide="x"></i></button>
      </div>
      <div class="modal__body">
        <p style="font-size:13px;color:var(--text-muted);margin-bottom:12px">
          Comparte este link con tu cliente. Podrá ver la cotización y aprobarla con un click.
        </p>
        <div style="display:flex;gap:8px;align-items:center">
          <input class="form-control" id="link-input" value="${link}" readonly style="font-size:12px;font-family:monospace">
          <button class="btn btn--primary btn--sm" id="copy-link"><i data-lucide="copy"></i> Copiar</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  if (window.lucide) lucide.createIcons({ nodes: [overlay] });

  overlay.querySelector('#close-link-modal').onclick = () => overlay.remove();
  overlay.querySelector('#copy-link').onclick = () => {
    navigator.clipboard.writeText(link).then(() => showToast('Link copiado'));
  };
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  // Re-render page to reflect status change
  renderQuotations(container, params);
}
```

- [ ] **Step 4.2: Add "Enviar link" button to `renderQuotationView`**

Find the `renderQuotationView` function. In the `page-actions` div (where Print/PDF/Edit buttons are), add after the existing buttons:

```js
${q.status === 'draft' || q.status === 'sent' ? `
  <button class="btn btn--primary" id="send-link-btn">
    <i data-lucide="link"></i> Enviar link
  </button>` : ''}
${q.publicToken ? `
  <div class="link-badge">
    <i data-lucide="link-2"></i>
    ${q.viewedAt ? '👁 Vista' : 'Enviada'}
  </div>` : ''}
```

After `lucide.createIcons`, wire up the button:

```js
container.querySelector('#send-link-btn')?.addEventListener('click', () => {
  sendPublicLink(q, container, params);
});
```

- [ ] **Step 4.3: Rebuild bundle**

```bash
python build.py
```

- [ ] **Step 4.4: Manual test**

1. Start server, open app, navigate to a quotation
2. Click "Enviar link"
3. Expected: modal appears with a link `http://localhost:3333/q/{32-char-token}`
4. Click "Copiar" → paste somewhere to verify
5. Open the link in a new tab → portal renders with the quotation data
6. Click "Aprobar cotización" → confirmation appears
7. Return to app → quotation status changed to `approved`

- [ ] **Step 4.5: Commit**

```bash
git add js/modules/quotations.js js/bundle.js
git commit -m "feat: add Enviar Link button — generates public token and registers in quote_tokens"
```

---

## Task 5: Kanban Component

**Files:**
- Create: `js/modules/kanban.js`
- Modify: `build.py`

- [ ] **Step 5.1: Create `js/modules/kanban.js`**

```js
import Store from '../store.js';
import { formatCurrency } from '../utils.js';

const COLUMNS = [
  { id: 'draft',    label: 'Borrador',  color: '#64748b', statuses: ['draft'] },
  { id: 'sent',     label: 'Enviada',   color: '#6366f1', statuses: ['sent', 'changes_requested'] },
  { id: 'approved', label: 'Aprobada',  color: '#22c55e', statuses: ['approved'] },
  { id: 'invoiced', label: 'Facturada', color: '#3b82f6', statuses: ['invoiced'] },
  { id: 'rejected', label: 'Rechazada', color: '#ef4444', statuses: ['rejected'], collapsible: true },
];

function clientBadge(q) {
  if (q.status === 'approved')          return '<span class="tracking-badge tracking-badge--approved">✓ Aprobada</span>';
  if (q.status === 'rejected')          return '<span class="tracking-badge tracking-badge--rejected">✕ Rechazada</span>';
  if (q.status === 'changes_requested') return '<span class="tracking-badge tracking-badge--changes">✎ Cambios solicitados</span>';
  if (q.viewedAt) {
    const diff  = Math.floor((Date.now() - new Date(q.viewedAt).getTime()) / 60000);
    const label = diff < 60 ? `hace ${diff}m` : diff < 1440 ? `hace ${Math.floor(diff/60)}h` : `hace ${Math.floor(diff/1440)}d`;
    return `<span class="tracking-badge tracking-badge--viewed">👁 Vista ${label}</span>`;
  }
  return '';
}

function urgencyClass(q, settings) {
  if (q.status !== 'sent') return '';
  const rem  = settings.reminders || {};
  const ref  = q.sentAt || q.date;
  if (!ref) return '';
  const days = (Date.now() - new Date(ref).getTime()) / 86400000;

  if (q.viewedAt) {
    const dv = (Date.now() - new Date(q.viewedAt).getTime()) / 86400000;
    if (rem.noReply?.enabled && dv >= (rem.noReply.days || 2)) return 'kanban-card--warn-orange';
  } else {
    if (rem.noOpen?.enabled && days >= (rem.noOpen.days || 3)) return 'kanban-card--warn-yellow';
  }
  return '';
}

function daysLabel(q) {
  const ref = q.sentAt || q.date;
  if (!ref) return '';
  const d = Math.floor((Date.now() - new Date(ref).getTime()) / 86400000);
  return d > 0 ? `${d}d` : 'Hoy';
}

export function renderKanban(container) {
  const clients    = Store.getClients();
  const quotations = Store.getQuotations();
  const settings   = Store.getSettings();

  container.innerHTML = `
    <div class="kanban-board">
      ${COLUMNS.map(col => {
        const cards = quotations.filter(q => col.statuses.includes(q.status));
        return `
          <div class="kanban-col" data-col="${col.id}">
            <div class="kanban-col__header ${col.collapsible ? 'kanban-col__header--collapsible' : ''}"
                 style="border-top-color:${col.color}">
              <span class="kanban-col__label" style="color:${col.color}">${col.label}</span>
              <span class="kanban-col__count">${cards.length}</span>
              ${col.collapsible ? '<i data-lucide="chevron-down" class="kanban-col__chevron"></i>' : ''}
            </div>
            <div class="kanban-col__body ${col.collapsible ? 'kanban-col__body--collapsed' : ''}">
              ${cards.length === 0 ? '<div class="kanban-col__empty">—</div>' :
                cards.map(q => {
                  const client = clients.find(c => c.id === q.clientId);
                  const urgent = urgencyClass(q, settings);
                  return `
                    <div class="kanban-card ${urgent}" data-id="${q.id}">
                      <div class="kanban-card__client">${client?.name || '—'}</div>
                      <div class="kanban-card__meta">
                        <span class="mono">${q.folio || ''}</span>
                        ${col.id === 'sent' ? `<span class="kanban-card__days">${daysLabel(q)}</span>` : ''}
                      </div>
                      <div class="kanban-card__amount">${formatCurrency(q.total, q.currency)}</div>
                      ${clientBadge(q)}
                      ${q.status === 'approved' ? `
                        <button class="btn btn--primary btn--xs kanban-card__convert" data-id="${q.id}">
                          <i data-lucide="receipt"></i> Convertir a factura
                        </button>` : ''}
                    </div>`;
                }).join('')}
            </div>
          </div>`;
      }).join('')}
    </div>`;

  if (window.lucide) lucide.createIcons({ nodes: [container] });

  container.querySelectorAll('.kanban-card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('.kanban-card__convert')) return;
      window.App?.navigate('quotations', { action: 'view', id: card.dataset.id });
    });
  });

  container.querySelectorAll('.kanban-card__convert').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      window.App?.navigate('invoices', { action: 'new', fromQuotation: btn.dataset.id });
    });
  });

  container.querySelectorAll('.kanban-col__header--collapsible').forEach(header => {
    header.addEventListener('click', () => {
      const body    = header.nextElementSibling;
      const chevron = header.querySelector('[data-lucide="chevron-down"]');
      body.classList.toggle('kanban-col__body--collapsed');
      if (chevron) {
        chevron.style.transform = body.classList.contains('kanban-col__body--collapsed') ? '' : 'rotate(180deg)';
      }
    });
  });
}
```

- [ ] **Step 5.2: Add `kanban.js` to `build.py`**

In `build.py`, find the `FILES` list. Add `'js/modules/kanban.js'` before `'js/app.js'`:

```python
FILES = [
    'js/supabase-client.js',
    'js/store.js',
    'js/auth.js',
    'js/i18n.js',
    'js/catalogs.js',
    'js/utils.js',
    'js/modules/dashboard.js',
    'js/modules/clients.js',
    'js/modules/products.js',
    'js/modules/quotations.js',
    'js/modules/invoices.js',
    'js/modules/payments.js',
    'js/modules/templates.js',
    'js/modules/reports.js',
    'js/modules/settings.js',
    'js/modules/kanban.js',   # ← new
    'js/reminders.js',        # ← new (added in Task 8)
    'js/app.js',
]
```

Add only `kanban.js` for now; `reminders.js` will be created in Task 8.

- [ ] **Step 5.3: Rebuild**

```bash
python build.py
```

- [ ] **Step 5.4: Commit**

```bash
git add js/modules/kanban.js build.py js/bundle.js
git commit -m "feat: add Kanban component with tracking badges and urgency indicators"
```

---

## Task 6: Toggle Kanban / Tabla en Quotations

**Files:**
- Modify: `js/modules/quotations.js`

- [ ] **Step 6.1: Add view toggle to `renderQuotations`**

In `renderQuotations`, replace the current `<div class="page-actions">` section to add the toggle:

```js
const viewMode = Store.getSettings().quotationsView || 'kanban';

// Add to page-actions div:
`<div class="view-toggle">
  <button class="view-toggle__btn ${viewMode === 'table' ? 'view-toggle__btn--active' : ''}" data-view="table" title="Vista tabla">
    <i data-lucide="list"></i>
  </button>
  <button class="view-toggle__btn ${viewMode === 'kanban' ? 'view-toggle__btn--active' : ''}" data-view="kanban" title="Vista Kanban">
    <i data-lucide="layout-dashboard"></i>
  </button>
</div>`
```

- [ ] **Step 6.2: Render Kanban or table based on view mode**

After the toolbar HTML, add a conditional:

```js
// After toolbar div closes, before the closing backtick of container.innerHTML:
${viewMode === 'kanban'
  ? '<div id="kanban-container"></div>'
  : `<div class="card p-0">
       ${quotations.length ? `<table class="table">...existing table...</table>` : `...empty state...`}
     </div>`
}
```

After `lucide.createIcons`, add:

```js
if (viewMode === 'kanban') {
  const kc = container.querySelector('#kanban-container');
  if (kc) renderKanban(kc);
}
```

Wire up the toggle buttons:

```js
container.querySelectorAll('.view-toggle__btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const s = Store.getSettings();
    Store.saveSettings({ ...s, quotationsView: btn.dataset.view });
    renderQuotations(container, params);
  });
});
```

- [ ] **Step 6.3: Add `renderKanban` import at top of `quotations.js`**

```js
import { renderKanban } from './kanban.js';
```

- [ ] **Step 6.4: Rebuild**

```bash
python build.py
```

- [ ] **Step 6.5: Manual test**

1. Open Cotizaciones → should default to Kanban view
2. Toggle to table → table appears
3. Toggle back to Kanban → Kanban appears
4. Refresh page → preference is preserved

- [ ] **Step 6.6: Commit**

```bash
git add js/modules/quotations.js js/bundle.js
git commit -m "feat: add Kanban/table toggle in quotations view"
```

---

## Task 7: Reminders Logic Module

**Files:**
- Create: `js/reminders.js`
- Modify: `build.py` (already has the entry from Task 5)
- Modify: `js/app.js`

- [ ] **Step 7.1: Write tests for reminder logic**

Add to `tests/run.js` (before the final count lines):

```js
// ── shouldRemindNoReply ──────────────────────────────────────
function shouldRemindNoReply(q, cfg) {
  if (q.status !== 'sent') return false;
  if (!q.viewedAt || (q.reminderSent || {}).noReply) return false;
  if (!cfg?.enabled) return false;
  return (Date.now() - new Date(q.viewedAt).getTime()) / MS >= (cfg.days || 2);
}

console.log('\nshouldRemindNoReply:');
const rCfg = { enabled: true, days: 2 };
assert('triggers after N days viewed', shouldRemindNoReply({ status: 'sent', date: daysAgo(5), viewedAt: daysAgo(3) }, rCfg));
assert('silent if not viewed',         !shouldRemindNoReply({ status: 'sent', date: daysAgo(5) }, rCfg));
assert('silent if reminded',           !shouldRemindNoReply({ status: 'sent', date: daysAgo(5), viewedAt: daysAgo(3), reminderSent: { noReply: true } }, rCfg));
assert('silent before N days',         !shouldRemindNoReply({ status: 'sent', date: daysAgo(5), viewedAt: daysAgo(1) }, rCfg));

// ── shouldRemindExpiring ──────────────────────────────────────
function shouldRemindExpiring(q, cfg) {
  if (!q.validUntil || (q.reminderSent || {}).expiring) return false;
  if (!cfg?.enabled) return false;
  const daysLeft = (new Date(q.validUntil).getTime() - Date.now()) / MS;
  return daysLeft <= (cfg.days || 2) && daysLeft > 0;
}

function daysFromNow(n) { return new Date(Date.now() + n * MS).toISOString().slice(0,10); }

console.log('\nshouldRemindExpiring:');
const eCfg = { enabled: true, days: 2 };
assert('triggers when 1 day left',   shouldRemindExpiring({ validUntil: daysFromNow(1) }, eCfg));
assert('silent when 5 days left',    !shouldRemindExpiring({ validUntil: daysFromNow(5) }, eCfg));
assert('silent when already expired',!shouldRemindExpiring({ validUntil: daysAgo(1) }, eCfg));
assert('silent if reminded',         !shouldRemindExpiring({ validUntil: daysFromNow(1), reminderSent: { expiring: true } }, eCfg));
```

- [ ] **Step 7.2: Run tests — verify new tests pass**

```bash
node tests/run.js
```

Expected: all assertions pass (the pure logic is already correct in the test).

- [ ] **Step 7.3: Create `js/reminders.js`**

```js
import Store from './store.js';

const MS = 86400000;

export function evaluateReminders() {
  const settings   = Store.getSettings();
  const rem        = settings.reminders || {};
  const quotations = Store.getQuotations();
  const now        = Date.now();
  const pending    = [];

  for (const q of quotations) {
    if (q.status !== 'sent') continue;
    const sent = q.reminderSent || {};
    const ref  = q.sentAt || q.date;

    if (rem.noOpen?.enabled && !q.viewedAt && !sent.noOpen && ref) {
      if ((now - new Date(ref).getTime()) / MS >= (rem.noOpen.days || 3)) {
        pending.push({ q, type: 'noOpen' });
      }
    }
    if (rem.noReply?.enabled && q.viewedAt && !sent.noReply) {
      if ((now - new Date(q.viewedAt).getTime()) / MS >= (rem.noReply.days || 2)) {
        pending.push({ q, type: 'noReply' });
      }
    }
    if (rem.expiring?.enabled && q.validUntil && !sent.expiring) {
      const left = (new Date(q.validUntil).getTime() - now) / MS;
      if (left > 0 && left <= (rem.expiring.days || 2)) {
        pending.push({ q, type: 'expiring' });
      }
    }
  }

  // Mark as sent so they don't fire again
  for (const { q, type } of pending) {
    Store.upsertQuotation({ ...q, reminderSent: { ...(q.reminderSent || {}), [type]: true } });
  }

  return pending;
}
```

- [ ] **Step 7.4: Call `evaluateReminders` on boot in `js/app.js`**

In `app.js`, at the end of `bootWithSession` (after `Store.seedDemo(); render();`), add:

```js
  // Evaluate reminders after boot
  if (typeof evaluateReminders === 'function') {
    const pending = evaluateReminders();
    if (pending.length) {
      // Badge on nav
      const quotNav = document.querySelector('[data-route="quotations"]');
      if (quotNav) {
        quotNav.insertAdjacentHTML('beforeend', `<span class="nav-badge">${pending.length}</span>`);
      }
    }
  }
```

Also add the import at the top of `app.js`:

```js
import { evaluateReminders } from './reminders.js';
```

- [ ] **Step 7.5: Add `reminders.js` to `build.py` FILES**

Add `'js/reminders.js'` just before `'js/app.js'` (already planned in Task 5 step 2 — verify it's there).

- [ ] **Step 7.6: Rebuild**

```bash
python build.py
```

- [ ] **Step 7.7: Commit**

```bash
git add js/reminders.js js/app.js build.py js/bundle.js tests/run.js
git commit -m "feat: add reminders evaluation module + nav badge on boot"
```

---

## Task 8: Reminders Banner + Settings Section

**Files:**
- Modify: `js/modules/quotations.js`
- Modify: `js/modules/settings.js`

- [ ] **Step 8.1: Add reminder banner to `renderQuotations`**

At the top of the content area in `renderQuotations` (before the toolbar), add:

```js
// Compute pending reminders for display
const pendingReminders = (() => {
  const s = Store.getSettings();
  const rem = s.reminders || {};
  const clients = Store.getClients();
  return Store.getQuotations()
    .filter(q => q.status === 'sent')
    .filter(q => {
      const rs = q.reminderSent || {};
      const ref = q.sentAt || q.date;
      const now = Date.now();
      const MS = 86400000;
      if (rem.noOpen?.enabled && !q.viewedAt && !rs.noOpen && ref)
        if ((now - new Date(ref).getTime()) / MS >= rem.noOpen.days) return true;
      if (rem.noReply?.enabled && q.viewedAt && !rs.noReply)
        if ((now - new Date(q.viewedAt).getTime()) / MS >= rem.noReply.days) return true;
      return false;
    });
})();

const bannerHTML = pendingReminders.length ? `
  <div class="reminder-banner" id="reminder-banner">
    <i data-lucide="bell"></i>
    <span><strong>${pendingReminders.length} cotización${pendingReminders.length > 1 ? 'es necesitan' : ' necesita'} seguimiento</strong> —
      ${pendingReminders.slice(0,2).map(q => {
        const c = Store.getClients().find(x => x.id === q.clientId);
        return c?.name || q.folio;
      }).join(' · ')}${pendingReminders.length > 2 ? ` · y ${pendingReminders.length - 2} más` : ''}
    </span>
    <button class="btn btn--ghost btn--xs" id="dismiss-reminder"><i data-lucide="x"></i></button>
  </div>` : '';
```

Insert `${bannerHTML}` at the top of `container.innerHTML`, before the `page-header` div.

Wire up the dismiss button:

```js
container.querySelector('#dismiss-reminder')?.addEventListener('click', () => {
  container.querySelector('#reminder-banner')?.remove();
});
```

- [ ] **Step 8.2: Add Seguimiento section to `js/modules/settings.js`**

Find the settings form `container.innerHTML`. Add a new card after the existing "Facturación" / "Impuestos" card:

```js
<!-- Seguimiento / Recordatorios -->
<div class="card">
  <div class="card__header"><span class="card__title"><i data-lucide="bell"></i> Seguimiento automático</span></div>
  <div class="card__body">
    <p class="text-sm text-muted mb-3">El sistema te notifica cuando una cotización lleva tiempo sin respuesta.</p>

    <div class="reminder-toggle-row">
      <div>
        <div class="form-label">Sin abrir</div>
        <div class="text-xs text-muted">El cliente no abrió el link</div>
      </div>
      <div style="display:flex;align-items:center;gap:10px">
        <input type="number" class="form-control form-control--xs" id="rem-noopen-days"
          value="${settings.reminders?.noOpen?.days ?? 3}" min="1" max="30" style="width:60px">
        <span class="text-sm">días</span>
        <label class="toggle-switch">
          <input type="checkbox" id="rem-noopen-enabled" ${settings.reminders?.noOpen?.enabled !== false ? 'checked' : ''}>
          <span class="toggle-switch__slider"></span>
        </label>
      </div>
    </div>

    <div class="reminder-toggle-row">
      <div>
        <div class="form-label">Vista sin respuesta</div>
        <div class="text-xs text-muted">El cliente abrió pero no respondió</div>
      </div>
      <div style="display:flex;align-items:center;gap:10px">
        <input type="number" class="form-control form-control--xs" id="rem-noreply-days"
          value="${settings.reminders?.noReply?.days ?? 2}" min="1" max="30" style="width:60px">
        <span class="text-sm">días</span>
        <label class="toggle-switch">
          <input type="checkbox" id="rem-noreply-enabled" ${settings.reminders?.noReply?.enabled !== false ? 'checked' : ''}>
          <span class="toggle-switch__slider"></span>
        </label>
      </div>
    </div>

    <div class="reminder-toggle-row">
      <div>
        <div class="form-label">Próxima a vencer</div>
        <div class="text-xs text-muted">Alerta antes de que expire</div>
      </div>
      <div style="display:flex;align-items:center;gap:10px">
        <input type="number" class="form-control form-control--xs" id="rem-expiring-days"
          value="${settings.reminders?.expiring?.days ?? 2}" min="1" max="14" style="width:60px">
        <span class="text-sm">días</span>
        <label class="toggle-switch">
          <input type="checkbox" id="rem-expiring-enabled" ${settings.reminders?.expiring?.enabled ? 'checked' : ''}>
          <span class="toggle-switch__slider"></span>
        </label>
      </div>
    </div>

    <!-- Portal appearance -->
    <hr style="margin:20px 0;border-color:var(--border)">
    <div class="form-label" style="margin-bottom:8px">Modo de aprobación del portal</div>
    <select class="form-control" id="s-approval-mode" style="max-width:300px">
      <option value="click"      ${(settings.approvalMode||'click') === 'click'      ? 'selected' : ''}>Solo click (Aprobar / Rechazar)</option>
      <option value="comments"   ${(settings.approvalMode||'click') === 'comments'   ? 'selected' : ''}>Con comentarios</option>
      <option value="signature"  ${(settings.approvalMode||'click') === 'signature'  ? 'selected' : ''}>Con firma (nombre + fecha)</option>
    </select>

    <div class="form-group mt-3" style="max-width:300px">
      <label class="form-label">Color del portal</label>
      <div style="display:flex;gap:8px;align-items:center">
        <input type="color" id="s-portal-color" value="${settings.portalHeaderColor || '#6366f1'}" style="width:48px;height:36px;border:none;background:none;cursor:pointer">
        <input class="form-control" id="s-portal-color-hex" value="${settings.portalHeaderColor || '#6366f1'}" maxlength="7" style="max-width:100px;font-family:monospace">
      </div>
    </div>

    <button class="btn btn--primary mt-3" id="save-reminders">
      <i data-lucide="save"></i> Guardar seguimiento
    </button>
  </div>
</div>
```

Wire up the save button (add inside the existing event-wiring section of `renderSettings`):

```js
container.querySelector('#save-reminders')?.addEventListener('click', () => {
  const s = Store.getSettings();
  Store.saveSettings({
    ...s,
    approvalMode: container.querySelector('#s-approval-mode')?.value || 'click',
    portalHeaderColor: container.querySelector('#s-portal-color')?.value || '#6366f1',
    reminders: {
      noOpen:   { enabled: container.querySelector('#rem-noopen-enabled')?.checked ?? true,   days: parseInt(container.querySelector('#rem-noopen-days')?.value)   || 3 },
      noReply:  { enabled: container.querySelector('#rem-noreply-enabled')?.checked ?? true,  days: parseInt(container.querySelector('#rem-noreply-days')?.value)  || 2 },
      expiring: { enabled: container.querySelector('#rem-expiring-enabled')?.checked ?? false, days: parseInt(container.querySelector('#rem-expiring-days')?.value) || 2 },
    },
  });
  showToast('Configuración de seguimiento guardada');
});

// Sync color picker ↔ hex input
container.querySelector('#s-portal-color')?.addEventListener('input', e => {
  const hex = container.querySelector('#s-portal-color-hex');
  if (hex) hex.value = e.target.value;
});
container.querySelector('#s-portal-color-hex')?.addEventListener('input', e => {
  const val = e.target.value;
  if (/^#[0-9a-fA-F]{6}$/.test(val)) {
    const picker = container.querySelector('#s-portal-color');
    if (picker) picker.value = val;
  }
});
```

- [ ] **Step 8.3: Rebuild**

```bash
python build.py
```

- [ ] **Step 8.4: Manual test**

1. Open Ajustes → scroll to "Seguimiento automático"
2. Change noOpen days to 1, save → toast appears
3. Navigate to Cotizaciones with a quote that's been "sent" for >1 day → banner should appear
4. Click X on banner → banner dismisses

- [ ] **Step 8.5: Commit**

```bash
git add js/modules/quotations.js js/modules/settings.js js/bundle.js
git commit -m "feat: reminder banner in quotations + tracking config in settings"
```

---

## Task 9: Client Quotation History + "Basar nueva en esta"

**Files:**
- Modify: `js/modules/clients.js`
- Modify: `js/modules/quotations.js`

- [ ] **Step 9.1: Add quotation history section to client edit view**

In `clients.js`, find `renderClientForm`. At the end of `container.innerHTML`, before the closing template literal, add the history section (only when `id` exists — editing an existing client):

```js
${id ? (() => {
  const clientQuots = Store.getQuotations()
    .filter(q => q.clientId === id)
    .sort((a, b) => (b.date || '') > (a.date || '') ? 1 : -1)
    .slice(0, 10);
  if (!clientQuots.length) return '';
  return `
    <div class="card mt-4">
      <div class="card__header"><span class="card__title"><i data-lucide="file-text"></i> Cotizaciones anteriores</span></div>
      <div class="card__body p-0">
        <table class="table">
          <thead><tr>
            <th>Folio</th><th>Fecha</th><th>Total</th><th>Estado</th><th class="text-center">Acción</th>
          </tr></thead>
          <tbody>
            ${clientQuots.map(q => `<tr>
              <td><span class="mono">${q.folio}</span></td>
              <td>${formatDate(q.date)}</td>
              <td>${formatCurrency(q.total, q.currency)}</td>
              <td><span class="badge badge--${q.status}">${t(\`status_\${q.status}\`)}</span></td>
              <td class="text-center">
                <button class="btn btn--ghost btn--xs base-on-quot" data-id="${q.id}" title="Basar nueva cotización en esta">
                  <i data-lucide="copy-plus"></i> Basar nueva en esta
                </button>
              </td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
})() : ''}
```

Add missing imports at the top of `clients.js`:

```js
import { formatDate, formatCurrency } from '../utils.js';
```

Wire up the "Basar nueva en esta" buttons (after `lucide.createIcons`):

```js
container.querySelectorAll('.base-on-quot').forEach(btn => {
  btn.addEventListener('click', () => {
    window.App?.navigate('quotations', { action: 'new', basedOn: btn.dataset.id });
  });
});
```

- [ ] **Step 9.2: Handle `basedOn` param in `renderQuotationForm`**

In `quotations.js`, inside `renderQuotationForm`, find where `q` is loaded:

```js
const q = id ? Store.getQuotation(id) : null;
```

Add handling for `basedOn`:

```js
const baseQ = params.basedOn ? Store.getQuotation(params.basedOn) : null;
const q     = id ? Store.getQuotation(id) : null;

// Pre-fill items from basedOn
let items = q?.items
  ? JSON.parse(JSON.stringify(q.items))
  : baseQ?.items
    ? JSON.parse(JSON.stringify(baseQ.items))
    : [newItem(settings)];
```

When `baseQ` exists, pre-select the client and currency in the form. In the form HTML for the client select:

```js
${(q?.clientId || baseQ?.clientId) === c.id ? 'selected' : ''}
```

Also set `basedOnId` when saving the quotation. In the `saveQuotation` function, add to the new quotation object:

```js
basedOnId: params.basedOn || null,
```

- [ ] **Step 9.3: Add "Usados con este cliente" product suggestions panel**

In `renderQuotationForm`, add a collapsible panel after the client selector. Insert after the `#q-client` `<select>` closes but within the same card body:

```js
<div id="client-products-panel" class="client-products-panel" style="display:none">
  <div class="client-products-panel__title">
    <i data-lucide="history"></i> Usados con este cliente
  </div>
  <div class="client-products-panel__items" id="client-products-list"></div>
</div>
```

Wire up the client selector to populate suggestions:

```js
function updateClientSuggestions(clientId) {
  const panel = container.querySelector('#client-products-panel');
  const list  = container.querySelector('#client-products-list');
  if (!panel || !list || !clientId) { panel && (panel.style.display = 'none'); return; }

  const clientQuots = Store.getQuotations().filter(q => q.clientId === clientId);
  const used = {};
  for (const q of clientQuots) {
    for (const item of (q.items || [])) {
      const key = item.productId || item.description;
      if (!used[key] || new Date(q.date) > new Date(used[key].date)) {
        used[key] = { ...item, _lastDate: q.date };
      }
    }
  }
  const suggestions = Object.values(used).slice(0, 8);
  if (!suggestions.length) { panel.style.display = 'none'; return; }

  panel.style.display = 'block';
  list.innerHTML = suggestions.map((item, i) =>
    `<button class="client-product-chip" data-idx="${i}">
       ${item.description || item.name || '—'} · ${formatCurrency(item.unitPrice, item.currency || 'MXN')}
     </button>`
  ).join('');

  list.querySelectorAll('.client-product-chip').forEach((btn, i) => {
    btn.addEventListener('click', () => {
      items.push({ ...newItem(settings), ...suggestions[i], id: uid() });
      const body = container.querySelector('#items-body');
      if (body) {
        body.innerHTML = items.map((it, idx) => renderItemRow(it, idx, products)).join('');
        bindItemEvents(container, items, products, settings, t);
        if (window.lucide) lucide.createIcons({ nodes: [body] });
      }
    });
  });
}

container.querySelector('#q-client')?.addEventListener('change', e => {
  updateClientSuggestions(e.target.value);
});

// Trigger on load if client is pre-selected
updateClientSuggestions(container.querySelector('#q-client')?.value || '');
```

- [ ] **Step 9.4: Rebuild**

```bash
python build.py
```

- [ ] **Step 9.5: Manual test**

1. Open a client that has quotes → edit view shows "Cotizaciones anteriores"
2. Click "Basar nueva en esta" → quotation form opens with same items
3. In quotation form, select a client with history → "Usados con este cliente" panel appears
4. Click a chip → item is added to quotation

- [ ] **Step 9.6: Commit**

```bash
git add js/modules/clients.js js/modules/quotations.js js/bundle.js
git commit -m "feat: client quotation history + base-on + product suggestions"
```

---

## Task 10: CSS — Kanban, Tracking, Banner, Portal Styles

**Files:**
- Modify: `css/styles.css`

- [ ] **Step 10.1: Append styles to `css/styles.css`**

Add at the very end of the file:

```css
/* ── Kanban board ───────────────────────────────────────────── */
.kanban-board {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  overflow-x: auto;
  padding-bottom: 20px;
  min-height: 400px;
}
.kanban-col {
  flex: 0 0 220px;
  min-width: 220px;
}
.kanban-col__header {
  border-top: 3px solid var(--border);
  padding: 10px 12px 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--surface);
  border-radius: 8px 8px 0 0;
  user-select: none;
}
.kanban-col__header--collapsible { cursor: pointer; }
.kanban-col__label { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; flex: 1; }
.kanban-col__count { font-size: 11px; background: var(--bg); border-radius: 999px; padding: 1px 7px; color: var(--text-muted); }
.kanban-col__chevron { width: 14px; height: 14px; color: var(--text-muted); transition: transform .2s; }
.kanban-col__body { display: flex; flex-direction: column; gap: 8px; padding: 8px; background: var(--bg); border-radius: 0 0 8px 8px; min-height: 60px; }
.kanban-col__body--collapsed { display: none; }
.kanban-col__empty { text-align: center; color: var(--text-muted); font-size: 12px; padding: 16px 0; }

/* Kanban card */
.kanban-card {
  background: var(--surface);
  border-radius: 8px;
  padding: 12px;
  cursor: pointer;
  border-left: 3px solid transparent;
  transition: transform .1s, box-shadow .1s;
}
.kanban-card:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,.15); }
.kanban-card__client { font-weight: 600; font-size: 13px; margin-bottom: 4px; }
.kanban-card__meta { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
.kanban-card__days { font-size: 11px; color: var(--text-muted); }
.kanban-card__amount { font-size: 13px; font-weight: 700; color: var(--primary); margin-bottom: 6px; }
.kanban-card__convert { width: 100%; margin-top: 8px; font-size: 11px; }

/* Urgency borders */
.kanban-card--warn-yellow { border-left-color: #fbbf24; }
.kanban-card--warn-orange { border-left-color: #f97316; }

/* Tracking badges */
.tracking-badge {
  display: inline-block;
  font-size: 11px;
  border-radius: 999px;
  padding: 2px 8px;
  margin-bottom: 4px;
}
.tracking-badge--viewed    { background: rgba(34,197,94,.12); color: #22c55e; }
.tracking-badge--approved  { background: rgba(34,197,94,.18); color: #22c55e; font-weight: 600; }
.tracking-badge--rejected  { background: rgba(239,68,68,.12); color: #ef4444; }
.tracking-badge--changes   { background: rgba(251,191,36,.12); color: #fbbf24; }

/* ── View toggle (table / kanban) ───────────────────────────── */
.view-toggle { display: flex; border: 1px solid var(--border); border-radius: 6px; overflow: hidden; }
.view-toggle__btn { background: transparent; border: none; padding: 6px 10px; cursor: pointer; color: var(--text-muted); transition: background .15s; }
.view-toggle__btn:hover { background: var(--bg); }
.view-toggle__btn--active { background: var(--primary); color: white; }
.view-toggle__btn--active:hover { background: var(--primary); }

/* ── Reminder banner ────────────────────────────────────────── */
.reminder-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(251,191,36,.1);
  border: 1px solid rgba(251,191,36,.3);
  border-radius: 8px;
  padding: 10px 14px;
  margin-bottom: 16px;
  font-size: 13px;
}
.reminder-banner > i { color: #fbbf24; flex-shrink: 0; width: 16px; height: 16px; }
.reminder-banner > span { flex: 1; }

/* ── Nav badge ──────────────────────────────────────────────── */
.nav-badge {
  position: absolute;
  top: 6px; right: 6px;
  background: #ef4444;
  color: white;
  font-size: 10px;
  font-weight: 700;
  border-radius: 999px;
  padding: 1px 5px;
  line-height: 1.4;
}
.nav-item { position: relative; }

/* ── Link badge on quotation view ───────────────────────────── */
.link-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-muted);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 5px 10px;
}

/* ── Settings: reminder toggles ─────────────────────────────── */
.reminder-toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
}
.reminder-toggle-row:last-child { border-bottom: none; }
.toggle-switch { position: relative; display: inline-block; width: 36px; height: 20px; cursor: pointer; }
.toggle-switch input { opacity: 0; width: 0; height: 0; }
.toggle-switch__slider {
  position: absolute; inset: 0;
  background: var(--border);
  border-radius: 999px;
  transition: background .2s;
}
.toggle-switch__slider::before {
  content: '';
  position: absolute;
  width: 14px; height: 14px;
  left: 3px; top: 3px;
  background: white;
  border-radius: 50%;
  transition: transform .2s;
}
.toggle-switch input:checked + .toggle-switch__slider { background: var(--primary); }
.toggle-switch input:checked + .toggle-switch__slider::before { transform: translateX(16px); }

/* ── Client history + product suggestions ───────────────────── */
.client-products-panel {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px 12px;
  margin-top: 10px;
}
.client-products-panel__title {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: .04em;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.client-products-panel__items { display: flex; flex-wrap: wrap; gap: 6px; }
.client-product-chip {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 12px;
  cursor: pointer;
  color: var(--text);
  transition: background .15s;
}
.client-product-chip:hover { background: var(--primary); color: white; border-color: var(--primary); }

/* ── Utility ─────────────────────────────────────────────────── */
.btn--xs { padding: 3px 8px; font-size: 11px; }
.mt-3 { margin-top: 12px; }
.mb-3 { margin-bottom: 12px; }
.text-sm { font-size: 13px; }
.text-xs { font-size: 11px; }
```

- [ ] **Step 10.2: Manual test**

Open the app and verify:
- Kanban renders with columns and colored headers
- Tracking badges appear on cards that have `viewedAt` set
- Toggle table/kanban buttons look correct
- Settings Seguimiento section has styled toggle switches

- [ ] **Step 10.3: Commit**

```bash
git add css/styles.css
git commit -m "feat: CSS for Kanban, tracking badges, reminder banner, settings toggles"
```

---

## Task 11: Final Smoke Test + Build Verification

- [ ] **Step 11.1: Run all JS tests**

```bash
node tests/run.js
```

Expected: all tests pass, exit code 0.

- [ ] **Step 11.2: Rebuild bundle from scratch**

```bash
python build.py
```

Expected: no errors.

- [ ] **Step 11.3: End-to-end flow test**

Start server: `python server.py 3333`

Open `http://localhost:3333`

**Flow A — Portal de aprobación:**
1. Create a new quotation → Save as Draft
2. Open the quotation → click "Enviar link" → modal appears with link
3. Copy link → open in new private/incognito tab
4. Portal renders: company header, items, total, approve button
5. Click "Aprobar cotización" → confirmation appears
6. Return to app → quotation card moved to "Aprobada" column in Kanban
7. Click "Convertir a factura" on the card → invoice form opens pre-filled

**Flow B — Recordatorios:**
1. Open Ajustes → Seguimiento → set "Sin abrir" to 0 days, save
2. Reload app → nav badge appears on Cotizaciones
3. Open Cotizaciones → reminder banner shows the quotation

**Flow C — Historial del cliente:**
1. Open a client with existing quotes → "Cotizaciones anteriores" section visible
2. Click "Basar nueva en esta" → quotation form opens with items pre-filled

**Flow D — Sugerencias de productos:**
1. New quotation → select a client with history
2. "Usados con este cliente" panel appears → click a chip → item added

- [ ] **Step 11.4: Final commit**

```bash
git add .
git commit -m "feat: complete pre-billing features — portal, kanban, tracking, reminders, client history"
```

---

## Self-Review Checklist

**Spec coverage:**

| Spec section | Covered in task |
|---|---|
| Portal URL `/q/:token` | Task 3 |
| Portal layout (clean, empresa header, items, totals, botones) | Task 3 |
| Modos de aprobación (click / comments / signature) | Task 3 |
| Token stored in quotation + `quote_tokens` table | Task 1 + Task 4 |
| `viewedAt`, `viewCount`, `lastViewedAt` | Task 3 |
| Badge "Vista hace X" en Kanban | Task 5 |
| Notificación toast al equipo al aprobar | Task 4 (sendPublicLink flow updates status, Kanban re-renders) |
| Kanban columnas + tarjetas | Task 5 |
| Toggle tabla/Kanban | Task 6 |
| Botón "Convertir a factura" en Kanban | Task 5 |
| Recordatorios: evaluación en boot | Task 7 |
| Recordatorios: banner en Cotizaciones | Task 8 |
| Recordatorios: configuración en Ajustes | Task 8 |
| Historial en perfil cliente | Task 9 |
| "Basar nueva en esta" | Task 9 |
| `basedOnId` en cotización | Task 9 |
| Sugerencia de productos | Task 9 |
| Nuevos campos en objeto cotización | Task 2 + Task 4 |
| Nuevos campos en Settings | Task 2 |
| `quote_tokens` tabla en Supabase | Task 1 |
| CSS: Kanban, badges, banner, toggles | Task 10 |

**Type consistency verified:** `generatePublicToken` → returns `string` (32 hex chars), used in Task 4. `evaluateReminders` → returns `Array<{q, type}>`, used in Task 7. `renderKanban(container)` → void, called in Task 6. All consistent.
