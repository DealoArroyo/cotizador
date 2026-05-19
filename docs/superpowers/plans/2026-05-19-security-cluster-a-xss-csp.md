# Security Cluster A: XSS Escaping + CSP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate stored XSS across all JS modules by introducing an `escapeHTML` helper, applying it to every user-supplied value interpolated into innerHTML, and adding a Content Security Policy + SRI hashes to `index.html`.

**Architecture:** Add `escapeHTML(str)` to `js/utils.js`. Apply it in five view modules wherever user data (client names, folios, descriptions, notes, etc.) is interpolated inside `innerHTML` template literals. Move the one inline `<script>` block in `index.html` to `js/init.js`. Pin all four CDN scripts to exact versions, add SRI integrity hashes, and add a CSP meta tag. Rebuild `bundle.js`.

**Tech Stack:** Vanilla JS, Python build script (`build.py`), PowerShell for hash generation.

---

## Files Modified
- `js/utils.js` — add `escapeHTML`
- `js/modules/quotations.js` — escape user values (most complex, ~20 occurrences)
- `js/modules/clients.js` — escape client fields in list + form
- `js/modules/invoices.js` — escape invoice + client fields
- `js/modules/settings.js` — escape company fields in input values
- `index.html` — CSP meta, pinned CDNs, SRI hashes, move inline script
- `js/init.js` — new file: extracted inline script
- `js/bundle.js` — rebuilt artifact

---

### Task 1: Add `escapeHTML` to `js/utils.js`

**Files:**
- Modify: `js/utils.js`

The file already has `escapeXml` (line 63). Add `escapeHTML` right after it. This function will be used by all modules inside the bundle (same IIFE scope).

- [ ] **Step 1: Open `js/utils.js` and locate `escapeXml` at line 63.**

- [ ] **Step 2: Add `escapeHTML` immediately after `escapeXml` (after its closing brace on line 70).**

Insert this code between `escapeXml` and `generateCFDIXml`:

```js
export function escapeHTML(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
```

- [ ] **Step 3: Verify the file compiles (no syntax error).** Open `js/utils.js` and confirm the function is between `escapeXml` and `generateCFDIXml`.

- [ ] **Step 4: Commit.**

```
git add js/utils.js
git commit -m "feat(security): add escapeHTML helper to utils.js"
```

---

### Task 2: Apply `escapeHTML` in `js/modules/quotations.js`

**Files:**
- Modify: `js/modules/quotations.js`

This module has the largest XSS surface because:
1. It renders `buildDocumentPreview` with company/client/item data
2. The view shows `clientComment`, `clientName`, history events written by external users
3. The list shows folios and client names in a table

**Context:** `escapeHTML` is available in scope because `utils.js` is bundled before the modules. You do NOT need to import it.

- [ ] **Step 1: Apply `escapeHTML` in `buildDocumentPreview` function (starts around line 782).**

Find this block and apply escaping to every user-supplied value. The complete escaped version of the problematic fields:

```js
// In buildDocumentPreview — company header section (around line 788–793):
// BEFORE:
<h2>${company.name || 'Mi Empresa'}</h2>
<p>RFC: ${company.rfc || '—'}</p>
<p>${company.domicilioFiscal || ''}</p>
<p>${company.email || ''} ${company.telefono ? '· ' + company.telefono : ''}</p>

// AFTER:
<h2>${escapeHTML(company.name) || 'Mi Empresa'}</h2>
<p>RFC: ${escapeHTML(company.rfc) || '—'}</p>
<p>${escapeHTML(company.domicilioFiscal) || ''}</p>
<p>${escapeHTML(company.email) || ''} ${company.telefono ? '· ' + escapeHTML(company.telefono) : ''}</p>
```

```js
// In buildDocumentPreview — folio/client section (around line 799–812):
// BEFORE:
<tr><td>Folio:</td><td class="mono">${q.folio}</td></tr>
...
<h3>${client?.name || '—'}</h3>
<p>RFC: ${client?.rfc || '—'}</p>
<p>${client?.address || ''}</p>
<p>${client?.email || ''}</p>

// AFTER:
<tr><td>Folio:</td><td class="mono">${escapeHTML(q.folio)}</td></tr>
...
<h3>${escapeHTML(client?.name) || '—'}</h3>
<p>RFC: ${escapeHTML(client?.rfc) || '—'}</p>
<p>${escapeHTML(client?.address) || ''}</p>
<p>${escapeHTML(client?.email) || ''}</p>
```

```js
// In buildDocumentPreview — items table (around line 827):
// BEFORE:
<td>${item.description || ''}</td>

// AFTER:
<td>${escapeHTML(item.description) || ''}</td>
```

```js
// In buildDocumentPreview — notes/terms/payment (around line 845–848):
// BEFORE:
${q.notes ? `<div class="doc-notes"><div class="doc-section-label">NOTAS</div><p>${q.notes}</p></div>` : ''}
${q.terms ? `<div class="doc-terms"><div class="doc-section-label">TÉRMINOS Y CONDICIONES</div><p>${q.terms}</p></div>` : ''}
${company.cuenta ? `<div class="doc-payment"><div class="doc-section-label">DATOS DE PAGO</div><p>${company.banco ? company.banco + ' · ' : ''}${company.cuenta}</p></div>` : ''}

// AFTER:
${q.notes ? `<div class="doc-notes"><div class="doc-section-label">NOTAS</div><p>${escapeHTML(q.notes)}</p></div>` : ''}
${q.terms ? `<div class="doc-terms"><div class="doc-section-label">TÉRMINOS Y CONDICIONES</div><p>${escapeHTML(q.terms)}</p></div>` : ''}
${company.cuenta ? `<div class="doc-payment"><div class="doc-section-label">DATOS DE PAGO</div><p>${escapeHTML(company.banco) ? escapeHTML(company.banco) + ' · ' : ''}${escapeHTML(company.cuenta)}</p></div>` : ''}
```

- [ ] **Step 2: Apply `escapeHTML` in the list view template (around line 124–138).**

```js
// BEFORE:
<td><span class="mono link-cell" data-action="view" data-id="${q.id}">${q.folio}</span></td>
<td>${client?.name || '—'}</td>

// AFTER:
<td><span class="mono link-cell" data-action="view" data-id="${q.id}">${escapeHTML(q.folio)}</span></td>
<td>${escapeHTML(client?.name) || '—'}</td>
```

- [ ] **Step 3: Apply `escapeHTML` in the view template (around line 668–724).**

```js
// BEFORE (line 671):
<h1 class="page-title">${q.folio} <span class="badge badge--${q.status} badge--lg">

// AFTER:
<h1 class="page-title">${escapeHTML(q.folio)} <span class="badge badge--${q.status} badge--lg">

// BEFORE (line 701):
<dt>Folio</dt><dd class="mono">${q.folio}</dd>

// AFTER:
<dt>Folio</dt><dd class="mono">${escapeHTML(q.folio)}</dd>

// BEFORE (line 717):
<p class="timeline-event">${h.event}</p>

// AFTER:
<p class="timeline-event">${escapeHTML(h.event)}</p>
```

- [ ] **Step 4: Apply `escapeHTML` in the edit form client/template options (around line 374, 387).**

```js
// BEFORE (line 374):
${clients.map(c => `<option value="${c.id}" ${c.id === (q?.clientId || baseQ?.clientId) ? 'selected' : ''}>${c.name} – ${c.rfc}</option>`).join('')}

// AFTER:
${clients.map(c => `<option value="${c.id}" ${c.id === (q?.clientId || baseQ?.clientId) ? 'selected' : ''}>${escapeHTML(c.name)} – ${escapeHTML(c.rfc)}</option>`).join('')}

// BEFORE (line 387):
${templates.map(tp => `<option value="${tp.id}">${tp.name}</option>`).join('')}

// AFTER:
${templates.map(tp => `<option value="${tp.id}">${escapeHTML(tp.name)}</option>`).join('')}
```

- [ ] **Step 5: Apply `escapeHTML` to product suggestions (around line 462–464).**

```js
// BEFORE:
`<button class="client-product-chip" data-idx="${i}">
   ${item.description || item.name || '—'} · ${formatCurrency(item.unitPrice || 0, item.currency || 'MXN')}

// AFTER:
`<button class="client-product-chip" data-idx="${i}">
   ${escapeHTML(item.description || item.name || '—')} · ${formatCurrency(item.unitPrice || 0, item.currency || 'MXN')}
```

- [ ] **Step 6: Commit.**

```
git add js/modules/quotations.js
git commit -m "feat(security): apply escapeHTML in quotations module"
```

---

### Task 3: Apply `escapeHTML` in `clients.js`, `invoices.js`, `products.js`, `settings.js`

**Files:**
- Modify: `js/modules/clients.js`
- Modify: `js/modules/invoices.js`
- Modify: `js/modules/products.js`
- Modify: `js/modules/settings.js`

#### clients.js

- [ ] **Step 1: Escape client values in the list table (around lines 54–64).**

```js
// BEFORE:
<div class="cell-primary">${c.name}</div>
<div class="cell-secondary">${c.address || ''}</div>
...
<td><span class="mono">${c.rfc || '—'}</span></td>
<td>${c.email || '—'}</td>
<td>${c.phone || '—'}</td>

// AFTER:
<div class="cell-primary">${escapeHTML(c.name)}</div>
<div class="cell-secondary">${escapeHTML(c.address) || ''}</div>
...
<td><span class="mono">${escapeHTML(c.rfc) || '—'}</span></td>
<td>${escapeHTML(c.email) || '—'}</td>
<td>${escapeHTML(c.phone) || '—'}</td>
```

- [ ] **Step 2: Escape client values in the form template `value=""` attributes (around lines 152–186).**

```js
// BEFORE:
<input class="form-control" id="c-name" value="${c.name || ''}" ...>
<input class="form-control mono" id="c-rfc" value="${c.rfc || ''}" ...>
<input class="form-control" id="c-email" type="email" value="${c.email || ''}">
<input class="form-control" id="c-phone" value="${c.phone || ''}">
<input class="form-control" id="c-address" value="${c.address || ''}" ...>

// AFTER:
<input class="form-control" id="c-name" value="${escapeHTML(c.name) || ''}" ...>
<input class="form-control mono" id="c-rfc" value="${escapeHTML(c.rfc) || ''}" ...>
<input class="form-control" id="c-email" type="email" value="${escapeHTML(c.email) || ''}">
<input class="form-control" id="c-phone" value="${escapeHTML(c.phone) || ''}">
<input class="form-control" id="c-address" value="${escapeHTML(c.address) || ''}" ...>
```

#### invoices.js

- [ ] **Step 3: Escape invoice fields in the view template (around line 414–470).**

```js
// BEFORE (line 417):
<h1 class="page-title">${inv.folio} <span class="badge badge--${inv.status}...

// AFTER:
<h1 class="page-title">${escapeHTML(inv.folio)} <span class="badge badge--${inv.status}...

// BEFORE (line 440):
<dt>UUID</dt><dd class="mono text-xs">${inv.uuid || '—'}</dd>

// AFTER:
<dt>UUID</dt><dd class="mono text-xs">${escapeHTML(inv.uuid) || '—'}</dd>

// BEFORE (line 444–445):
<dt>RFC emisor</dt><dd class="mono">${company.rfc || '—'}</dd>
<dt>RFC receptor</dt><dd class="mono">${inv.clientRfc || client?.rfc || '—'}</dd>

// AFTER:
<dt>RFC emisor</dt><dd class="mono">${escapeHTML(company.rfc) || '—'}</dd>
<dt>RFC receptor</dt><dd class="mono">${escapeHTML(inv.clientRfc || client?.rfc) || '—'}</dd>

// BEFORE (line 469):
<pre class="cadena-text">${inv.cadenaOriginal}</pre>

// AFTER:
<pre class="cadena-text">${escapeHTML(inv.cadenaOriginal)}</pre>
```

- [ ] **Step 4: Find and escape any user-supplied values in `buildCFDIPreview` function.** Run:

```
grep -n "client\?\." js/modules/invoices.js | grep -v "//\|find\|id\|status\|currency"
```

Apply `escapeHTML()` to every `client?.name`, `client?.rfc`, `inv.clientName`, `inv.clientRfc`, `company.name`, `company.rfc`, item `description` fields found in `buildCFDIPreview`.

#### settings.js

- [ ] **Step 5: Escape company values in the settings form `value=""` attributes (around lines 36–52).**

```js
// BEFORE:
<input class="form-control" id="s-name" value="${company.name || ''}">
<input class="form-control mono" id="s-rfc" value="${company.rfc || ''}" ...>
<input class="form-control" id="s-cp" value="${company.codigoPostal || ''}" ...>

// AFTER:
<input class="form-control" id="s-name" value="${escapeHTML(company.name) || ''}">
<input class="form-control mono" id="s-rfc" value="${escapeHTML(company.rfc) || ''}" ...>
<input class="form-control" id="s-cp" value="${escapeHTML(company.codigoPostal) || ''}" ...>
```

Scan the rest of settings.js for other `value="${company.` patterns and apply the same.

#### products.js

- [ ] **Step 6: Escape product values in the grid list (around lines 39–56).**

```js
// BEFORE:
${categories.map(c => `<option value="${c}" ${prodsCatFilter === c ? 'selected' : ''}>${c}</option>`).join('')}
...
<span class="product-code">${p.code || '—'}</span>
${p.category ? `<span class="badge badge--category">${p.category}</span>` : ''}
...
<h3 class="product-name">${p.name}</h3>
<p class="product-desc">${p.description || ''}</p>
...
<span class="product-clave" title="ClaveProdServ"><i data-lucide="tag"></i> ${p.claveProdServ || '—'}</span>
<span class="product-unit" title="Unidad"><i data-lucide="ruler"></i> ${p.claveUnidad || '—'} / ${p.unit || ''}</span>

// AFTER:
${categories.map(c => `<option value="${escapeHTML(c)}" ${prodsCatFilter === c ? 'selected' : ''}>${escapeHTML(c)}</option>`).join('')}
...
<span class="product-code">${escapeHTML(p.code) || '—'}</span>
${p.category ? `<span class="badge badge--category">${escapeHTML(p.category)}</span>` : ''}
...
<h3 class="product-name">${escapeHTML(p.name)}</h3>
<p class="product-desc">${escapeHTML(p.description) || ''}</p>
...
<span class="product-clave" title="ClaveProdServ"><i data-lucide="tag"></i> ${escapeHTML(p.claveProdServ) || '—'}</span>
<span class="product-unit" title="Unidad"><i data-lucide="ruler"></i> ${escapeHTML(p.claveUnidad) || '—'} / ${escapeHTML(p.unit) || ''}</span>
```

Also apply `escapeHTML` to any user-supplied values in `value=""` attributes in the product form template (the `container.innerHTML` block starting around line 113) — particularly `p.name`, `p.description`, `p.code`, `p.unit`.

- [ ] **Step 7: Commit.**

```
git add js/modules/clients.js js/modules/invoices.js js/modules/products.js js/modules/settings.js
git commit -m "feat(security): apply escapeHTML in clients, invoices, products, settings modules"
```

---

### Task 4: Pin CDNs, add SRI hashes, add CSP, extract inline script in `index.html`

**Files:**
- Modify: `index.html`
- Create: `js/init.js`

The current `index.html` has four CDN scripts and one inline `<script>` block. A CSP without `unsafe-inline` in `script-src` would block the inline block, so we extract it first.

- [ ] **Step 1: Create `js/init.js` with the inline script content from `index.html` (lines 80–101).**

Create `js/init.js` with this exact content:

```js
// Re-run Lucide on mutations for dynamic icon rendering
const iconObserver = new MutationObserver(() => {
  if (window.lucide) {
    const newIcons = document.querySelectorAll('i[data-lucide]:not([data-rendered])');
    if (newIcons.length) {
      newIcons.forEach(el => el.setAttribute('data-rendered', '1'));
      lucide.createIcons({ nodes: [...newIcons].map(el => el.parentElement).filter(Boolean) });
    }
  }
});
iconObserver.observe(document.body, { childList: true, subtree: true });

// Mobile overlay
document.addEventListener('click', e => {
  const sidebar = document.getElementById('sidebar');
  const btn = document.getElementById('mobile-menu-btn');
  if (sidebar?.classList.contains('sidebar--open') && !sidebar.contains(e.target) && e.target !== btn && !btn?.contains(e.target)) {
    sidebar.classList.remove('sidebar--open');
  }
});
```

- [ ] **Step 2: Pin CDN versions and generate SRI hashes.**

Current CDN state in `index.html`:
- `lucide@latest` → **must pin** (unpinned = supply chain risk)
- `chart.js@4.4.0` → already pinned ✅
- `supabase-js@2` → **must pin to exact version**
- `html2pdf.js@0.10.1` on cdnjs → already pinned ✅

Run these PowerShell commands to generate SHA-384 hashes (run each separately, copy the hash output):

```powershell
# 1. Get current lucide version and pin it
$lucideVer = (Invoke-WebRequest "https://registry.npmjs.org/lucide/-/latest" -UseBasicParsing | ConvertFrom-Json).version
Write-Host "Lucide version: $lucideVer"
$bytes = (New-Object System.Net.WebClient).DownloadData("https://unpkg.com/lucide@$lucideVer/dist/umd/lucide.min.js")
$hash = [System.Security.Cryptography.SHA384]::Create().ComputeHash($bytes)
"sha384-" + [Convert]::ToBase64String($hash)
```

```powershell
# 2. chart.js@4.4.0
$bytes = (New-Object System.Net.WebClient).DownloadData("https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js")
$hash = [System.Security.Cryptography.SHA384]::Create().ComputeHash($bytes)
"sha384-" + [Convert]::ToBase64String($hash)
```

```powershell
# 3. supabase-js — get latest @2.x version
$supVer = ((Invoke-WebRequest "https://registry.npmjs.org/@supabase/supabase-js" -UseBasicParsing | ConvertFrom-Json).'dist-tags'.latest)
Write-Host "Supabase version: $supVer"
$bytes = (New-Object System.Net.WebClient).DownloadData("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@$supVer/dist/umd/supabase.min.js")
$hash = [System.Security.Cryptography.SHA384]::Create().ComputeHash($bytes)
"sha384-" + [Convert]::ToBase64String($hash)
```

```powershell
# 4. html2pdf.js@0.10.1
$bytes = (New-Object System.Net.WebClient).DownloadData("https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js")
$hash = [System.Security.Cryptography.SHA384]::Create().ComputeHash($bytes)
"sha384-" + [Convert]::ToBase64String($hash)
```

Save the four version strings and four `sha384-...` hashes — you will need them in the next step.

- [ ] **Step 3: Rewrite `index.html` head section.**

Replace the `<!-- Icons -->` through `<!-- Styles -->` block (currently lines 13–26) with the following, substituting `LUCIDE_VERSION`, `SUPABASE_VERSION`, and the four `HASH_N` placeholders with the values from Step 2:

```html
<!-- Content Security Policy -->
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self' https://cdn.jsdelivr.net https://unpkg.com https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src https://*.supabase.co; frame-ancestors 'none'; base-uri 'none'; form-action 'none'; object-src 'none';">

<!-- Icons -->
<script src="https://unpkg.com/lucide@LUCIDE_VERSION/dist/umd/lucide.min.js"
        integrity="HASH_1"
        crossorigin="anonymous"></script>

<!-- Charts -->
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"
        integrity="HASH_2"
        crossorigin="anonymous"></script>

<!-- Supabase -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@SUPABASE_VERSION/dist/umd/supabase.min.js"
        integrity="HASH_3"
        crossorigin="anonymous"></script>

<!-- html2pdf (client-side PDF generation) -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"
        integrity="HASH_4"
        crossorigin="anonymous"></script>

<!-- Styles -->
<link rel="stylesheet" href="css/styles.css">
```

- [ ] **Step 4: Replace the inline `<script>` block at the bottom of `index.html` (currently lines 80–101) with a reference to `js/init.js`.**

Replace:
```html
<script>
  // Re-run Lucide on mutations for dynamic icon rendering
  ...
  // Mobile overlay
  ...
</script>
```

With:
```html
<script src="js/init.js"></script>
```

- [ ] **Step 5: Open the app in a browser and verify it loads correctly.** Check: sidebar renders, Lucide icons show, navigation works, no console errors.

- [ ] **Step 6: Commit.**

```
git add index.html js/init.js
git commit -m "feat(security): CSP meta, SRI hashes, pin CDN versions, extract inline script"
```

---

### Task 5: Rebuild bundle + smoke test

**Files:**
- Rebuild: `js/bundle.js`

- [ ] **Step 1: Rebuild the bundle.**

```
python build.py
```

Expected output: `Bundle written to js/bundle.js (NNN,NNN bytes)`

If you see `ERROR: SUPABASE_URL y SUPABASE_ANON_KEY deben estar en .env` — the `.env` file is missing. Ask for help.

- [ ] **Step 2: Verify `escapeHTML` is in the bundle.**

```powershell
Select-String -Path js/bundle.js -Pattern "function escapeHTML"
```

Expected: one match.

- [ ] **Step 3: Verify no `__SUPABASE_URL__` placeholder remains.**

```powershell
Select-String -Path js/bundle.js -Pattern "__SUPABASE_URL__"
```

Expected: no matches.

- [ ] **Step 4: Open the app. Test XSS prevention manually.**
  1. Go to **Clients**, create a client with name: `<img src=x onerror="alert('XSS')">`
  2. Go back to the Clients list — the name should show as literal text, no alert fires
  3. Create a quotation for that client — the name should appear escaped in the document preview
  4. Verify the CSP is active: open browser DevTools → Application → Content Security Policy (or check Network response headers for the meta tag)

- [ ] **Step 5: Commit and push.**

```
git add js/bundle.js
git commit -m "build: rebuild bundle with escapeHTML and CSP"
git push
```
