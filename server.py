#!/usr/bin/env python3
import sys
import os
import json
import urllib.request
import urllib.parse
import html as htmllib
from http.server import HTTPServer, SimpleHTTPRequestHandler
from datetime import datetime, timezone
import re
import time
from collections import defaultdict

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

TOKEN_RE = re.compile(r'^[a-f0-9]{32}$')
HEX_COLOR_RE = re.compile(r'^#[0-9a-fA-F]{6}$')
MAX_BODY_BYTES = 8 * 1024  # 8 KB

_rate_limit: dict = defaultdict(list)
RATE_LIMIT_MAX = 30
RATE_LIMIT_WINDOW = 60  # seconds


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


def _check_rate_limit(ip: str) -> bool:
    now = time.time()
    window_start = now - RATE_LIMIT_WINDOW
    _rate_limit[ip] = [t for t in _rate_limit[ip] if t > window_start]
    if len(_rate_limit[ip]) >= RATE_LIMIT_MAX:
        return False
    _rate_limit[ip].append(now)
    return True


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
    _raw_color = settings.get('portalHeaderColor', '#6366f1')
    header_color = _raw_color if HEX_COLOR_RE.match(_raw_color) else '#6366f1'

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
            ip = self.client_address[0]
            if not _check_rate_limit(ip):
                self.send_response(429)
                self.send_header('Content-Type', 'text/plain')
                self.send_header('Content-Length', len(b'Too many requests'))
                self.send_header('Retry-After', '60')
                self.end_headers()
                self.wfile.write(b'Too many requests')
                return
            self._serve_portal(path[3:].strip('/'))
        else:
            super().do_GET()

    def do_POST(self):
        path = urllib.parse.urlparse(self.path).path
        parts = path.split('/')           # ['', 'api', 'q', TOKEN, ENDPOINT]
        if path.startswith('/api/q/') and len(parts) == 5:
            ip = self.client_address[0]
            if not _check_rate_limit(ip):
                data = json.dumps({'error': 'Too many requests'}).encode()
                self.send_response(429)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Content-Length', len(data))
                self.send_header('Retry-After', '60')
                self.end_headers()
                self.wfile.write(data)
                return
            token    = parts[3]
            endpoint = parts[4]
            length   = int(self.headers.get('Content-Length', 0))
            if length > MAX_BODY_BYTES:
                self._json(413, {'error': 'Payload too large'})
                return
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
        if not TOKEN_RE.match(token):
            return self._html(404, render_error('Esta cotización ya no está disponible'))
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
        if not TOKEN_RE.match(token):
            return self._json(404, {'error': 'not found'})
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
        if not TOKEN_RE.match(token):
            return self._json(404, {'error': 'not found'})
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

            # Field length limits
            comment     = str(body.get('comment', ''))[:1000].strip()
            client_name = str(body.get('clientName', ''))[:100].strip()
            signed_at   = str(body.get('signedAt', ''))[:40].strip()

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
            print(f'[portal:action] {time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())} ip={self.client_address[0]} token={token_prefix}... action={action}', flush=True)
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

    def _send_security_headers(self):
        self.send_header('X-Frame-Options', 'DENY')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Referrer-Policy', 'no-referrer')
        self.send_header('Strict-Transport-Security', 'max-age=31536000')

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        self._send_security_headers()
        super().end_headers()


port = int(sys.argv[1]) if len(sys.argv) > 1 else 3333
print(f'Serving on http://localhost:{port}', flush=True)
HTTPServer(('', port), Handler).serve_forever()
