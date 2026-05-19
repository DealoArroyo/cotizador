# Security Cluster B: Portal Server Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden `server.py` against token injection, oversized payloads, CSS injection via `portalHeaderColor`, brute-force enumeration, and missing security headers; restore audit logging.

**Architecture:** All changes are in `server.py`. No new dependencies — uses Python stdlib only (`re`, `time`, `collections.defaultdict`). Each concern is isolated: token validation at the top of each handler, field caps in `_handle_action`, rate limiter as a module-level dict + helper function, security headers in `end_headers`, CSS validation in `render_portal`, logging re-enabled via `print`.

**Tech Stack:** Python 3, stdlib only.

---

## Files Modified
- `server.py` only

---

### Task 1: Token validation + Content-Length cap + field length limits

**Files:**
- Modify: `server.py`

- [ ] **Step 1: Add imports at the top of `server.py` (after existing imports, before `SUPABASE_URL =`).**

Current imports end around line 9. Add `re` and `time` if not already present:

```python
import re
import time
from collections import defaultdict
```

- [ ] **Step 2: Add the token regex constant and rate-limit storage after the imports, before `def sb_get`.**

```python
TOKEN_RE = re.compile(r'^[a-f0-9]{32}$')
HEX_COLOR_RE = re.compile(r'^#[0-9a-fA-F]{6}$')
MAX_BODY_BYTES = 8 * 1024  # 8 KB

_rate_limit: dict = defaultdict(list)
RATE_LIMIT_MAX = 30
RATE_LIMIT_WINDOW = 60  # seconds
```

- [ ] **Step 3: Add the rate-limit helper function after the constants (before `def fmt_currency`).**

```python
def _check_rate_limit(ip: str) -> bool:
    now = time.time()
    window_start = now - RATE_LIMIT_WINDOW
    _rate_limit[ip] = [t for t in _rate_limit[ip] if t > window_start]
    if len(_rate_limit[ip]) >= RATE_LIMIT_MAX:
        return False
    _rate_limit[ip].append(now)
    return True
```

- [ ] **Step 4: Add token validation at the top of `_serve_portal` (after the `if not SUPABASE_URL` check, before the `try:`).**

Current `_serve_portal` starts around line 281. Add after line 283 (`return self._html(503, ...)`):

```python
    def _serve_portal(self, token):
        if not SUPABASE_URL or not SERVICE_KEY:
            return self._html(503, render_error('Servidor no configurado'))
        if not TOKEN_RE.match(token):
            return self._html(404, render_error('Esta cotización ya no está disponible'))
        try:
            ...
```

- [ ] **Step 5: Add token validation at the top of `_handle_viewed` (before the `try:`).**

```python
    def _handle_viewed(self, token):
        if not TOKEN_RE.match(token):
            return self._json(404, {'error': 'not found'})
        try:
            ...
```

- [ ] **Step 6: Add Content-Length cap + token validation + field length limits in `do_POST` and `_handle_action`.**

Replace the `do_POST` body-reading block (currently around lines 269–270):

```python
# BEFORE:
length   = int(self.headers.get('Content-Length', 0))
body     = json.loads(self.rfile.read(length)) if length else {}

# AFTER:
length = int(self.headers.get('Content-Length', 0))
if length > MAX_BODY_BYTES:
    self._json(413, {'error': 'Payload too large'})
    return
body = json.loads(self.rfile.read(length)) if length else {}
```

Also add token validation at the top of `_handle_action` (after the `action` check):

```python
    def _handle_action(self, token, body):
        action = body.get('action')
        if action not in ('approved', 'rejected', 'changes_requested'):
            return self._json(400, {'error': 'invalid action'})
        if not TOKEN_RE.match(token):
            return self._json(404, {'error': 'not found'})
        ...
```

Add field length validation in `_handle_action`, after the `rows = sb_get(...)` call and before writing to `qt`:

```python
        # Field length validation
        comment     = str(body.get('comment', ''))[:1000].strip()
        client_name = str(body.get('clientName', ''))[:100].strip()
        signed_at   = str(body.get('signedAt', ''))[:40].strip()
```

Then replace the three `body.get(...)` usages when writing to `qt`:

```python
# BEFORE:
if body.get('comment'):
    qt['clientComment'] = body['comment']
if body.get('clientName'):
    qt['clientName'] = body['clientName']
if body.get('signedAt'):
    qt['signedAt'] = body['signedAt']

# AFTER:
if comment:
    qt['clientComment'] = comment
if client_name:
    qt['clientName'] = client_name
if signed_at:
    qt['signedAt'] = signed_at
```

- [ ] **Step 7: Test token validation with curl.**

```powershell
# Invalid token (not 32 hex chars) — expect 404
$r = Invoke-WebRequest "http://localhost:3333/q/invalid-token" -UseBasicParsing -ErrorAction SilentlyContinue
$r.StatusCode  # expected: 404

# Oversized POST body — start server first, then:
$body = "a" * 9000
$r = Invoke-WebRequest "http://localhost:3333/api/q/abcdef1234567890abcdef1234567890/action" -Method POST -Body $body -UseBasicParsing -ErrorAction SilentlyContinue
$r.StatusCode  # expected: 413
```

- [ ] **Step 8: Commit.**

```
git add server.py
git commit -m "feat(security): token validation, Content-Length cap, field length limits in server.py"
```

---

### Task 2: Fix CSS injection via `portalHeaderColor` in `render_portal`

**Files:**
- Modify: `server.py`

- [ ] **Step 1: Find `header_color` assignment in `render_portal` (around line 81).**

Current code:
```python
header_color = settings.get('portalHeaderColor', '#6366f1')
```

Replace with:
```python
_raw_color = settings.get('portalHeaderColor', '#6366f1')
header_color = _raw_color if HEX_COLOR_RE.match(_raw_color) else '#6366f1'
```

`HEX_COLOR_RE` was defined in Task 1 as `re.compile(r'^#[0-9a-fA-F]{6}$')`.

- [ ] **Step 2: Verify `header_color` is used in the CSS template** — look for all occurrences of `{header_color}` in `render_portal`. There should be three (`.header` background, `.total-row--main` color, `.btn-approve` background). All are now safe because the value is validated to be a 6-digit hex color.

- [ ] **Step 3: Test CSS injection prevention.**

Open the CotizaPro app, go to Settings → Portal, set the portal color to `red;}body{display:none`. Save. Send a quotation link and open it. The portal should still render normally (the injected CSS should not take effect — header will use `#6366f1` fallback).

- [ ] **Step 4: Commit.**

```
git add server.py
git commit -m "feat(security): validate portalHeaderColor before CSS interpolation"
```

---

### Task 3: Rate limiting on portal API endpoints

**Files:**
- Modify: `server.py`

The `_check_rate_limit` function and `_rate_limit` dict were added in Task 1. This task wires them into `do_GET` and `do_POST`.

- [ ] **Step 1: Add rate limit check in `do_GET` for portal routes.**

In `do_GET`, before calling `self._serve_portal(...)`:

```python
    def do_GET(self):
        path = urllib.parse.urlparse(self.path).path
        if path.startswith('/q/') and len(path) > 3:
            ip = self.client_address[0]
            if not _check_rate_limit(ip):
                self.send_response(429)
                self.send_header('Content-Type', 'text/plain')
                self.send_header('Retry-After', '60')
                self.end_headers()
                self.wfile.write(b'Too many requests')
                return
            self._serve_portal(path[3:].strip('/'))
        else:
            super().do_GET()
```

- [ ] **Step 2: Add rate limit check in `do_POST` for API routes.**

In `do_POST`, after parsing `parts` and before reading the body:

```python
    def do_POST(self):
        path = urllib.parse.urlparse(self.path).path
        parts = path.split('/')
        if path.startswith('/api/q/') and len(parts) == 5:
            ip = self.client_address[0]
            if not _check_rate_limit(ip):
                self._json(429, {'error': 'Too many requests'})
                self.send_header('Retry-After', '60')  # Note: header already sent by _json via end_headers
                return
            token    = parts[3]
            ...
```

Wait — `_json` calls `self.end_headers()` internally, so the `Retry-After` header must be added before calling `_json`. Instead, handle it inline:

```python
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
```

- [ ] **Step 3: Test rate limiting.**

Start the server, then run 31 quick requests:

```powershell
for ($i = 1; $i -le 31; $i++) {
    $r = Invoke-WebRequest "http://localhost:3333/q/abcdef1234567890abcdef1234567890" -UseBasicParsing -ErrorAction SilentlyContinue
    Write-Host "$i : $($r.StatusCode)"
}
```

Expected: first 30 return 404 (token not found), 31st returns 429.

- [ ] **Step 4: Commit.**

```
git add server.py
git commit -m "feat(security): in-memory rate limiting on portal endpoints (30 req/min/IP)"
```

---

### Task 4: Security headers + audit logging

**Files:**
- Modify: `server.py`

- [ ] **Step 1: Add a `_send_security_headers` helper method to the `Handler` class (before `end_headers`).**

```python
    def _send_security_headers(self):
        self.send_header('X-Frame-Options', 'DENY')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Referrer-Policy', 'no-referrer')
        self.send_header('Strict-Transport-Security', 'max-age=31536000')
```

- [ ] **Step 2: Call `_send_security_headers` from `end_headers` (which is already overridden).**

Current `end_headers`:
```python
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()
```

Replace with:
```python
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        self._send_security_headers()
        super().end_headers()
```

- [ ] **Step 3: Re-enable request logging by removing (or replacing) the `log_message` override.**

Current code (around line 398):
```python
    def log_message(self, fmt, *args):
        pass  # suppress per-request logs
```

Replace with: just delete the override entirely (or rename the method to something else). The default `BaseHTTPRequestHandler.log_message` writes to stderr — that's fine for a server log.

- [ ] **Step 4: Add explicit audit log lines in `_handle_action`.**

In `_handle_action`, after the `sb_patch` call and before `self._json(200, {'ok': True})`:

```python
            sb_patch('user_data', {'user_id': f'eq.{user_id}'}, {'quotations': quotations})
            token_prefix = token[:8]
            print(f'[portal:action] {time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())} ip={self.client_address[0]} token={token_prefix}... action={action}', flush=True)
            self._json(200, {'ok': True})
```

- [ ] **Step 5: Test security headers with curl.**

Start the server, then:

```powershell
$r = Invoke-WebRequest "http://localhost:3333/" -UseBasicParsing
$r.Headers["X-Frame-Options"]          # expected: DENY
$r.Headers["X-Content-Type-Options"]   # expected: nosniff
$r.Headers["Referrer-Policy"]          # expected: no-referrer
```

- [ ] **Step 6: Test audit log.**

Start the server. Send an action request to a valid portal URL. Check stdout for a line like:
```
[portal:action] 2026-05-19T... ip=127.0.0.1 token=abcdef12... action=approved
```

- [ ] **Step 7: Commit and push.**

```
git add server.py
git commit -m "feat(security): security headers, audit logging in server.py"
git push
```
