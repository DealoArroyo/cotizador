# Refresh Cotizaciones + Eliminación EmailJS — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar botón de actualización + auto-poll de 60s en la vista de cotizaciones, y eliminar EmailJS de toda la app.

**Architecture:** El refresh llama `Store.syncFromSupabase` y re-renderiza solo la vista de cotizaciones. Un `setInterval` hace lo mismo cada 60s mientras la vista está montada; se auto-limpia si el container sale del DOM. EmailJS se elimina de 3 archivos: `settings.js`, `quotations.js` e `index.html`.

**Tech Stack:** Vanilla JS, Python build script

---

### Task 1: Botón refresh + auto-poll en `quotations.js`

**Files:**
- Modify: `js/modules/quotations.js`

- [ ] **Agregar variable de módulo `_quotPollTimer` junto a las existentes (línea 7)**

Reemplazar:
```js
let quotsFilter = '';
let quotsSearch = '';
```
Por:
```js
let quotsFilter = '';
let quotsSearch = '';
let _quotPollTimer = null;
```

- [ ] **Agregar botón "Actualizar" en `page-actions` del HTML de `renderQuotations`**

Reemplazar:
```js
        <button class="btn btn--ghost btn--sm" id="export-quot"><i data-lucide="download"></i> ${t('btn_export')}</button>
        <button class="btn btn--primary" id="new-quot"><i data-lucide="file-plus"></i> ${t('quot_new')}</button>
```
Por:
```js
        <button class="btn btn--ghost btn--sm" id="sync-quot" title="Sincronizar con la nube"><i data-lucide="refresh-cw"></i> Actualizar</button>
        <button class="btn btn--ghost btn--sm" id="export-quot"><i data-lucide="download"></i> ${t('btn_export')}</button>
        <button class="btn btn--primary" id="new-quot"><i data-lucide="file-plus"></i> ${t('quot_new')}</button>
```

- [ ] **Agregar función `_syncAndRefresh` justo antes de `export function renderQuotations`**

```js
async function _syncAndRefresh(container, params) {
  if (!window._supSync) return;
  const btn = container.querySelector('#sync-quot');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Actualizando...';
    if (window.lucide) lucide.createIcons({ nodes: [btn] });
  }
  const { client, userId } = window._supSync;
  await Store.syncFromSupabase(client, userId);
  renderQuotations(container, params);
}
```

- [ ] **Limpiar timer anterior al inicio de `renderQuotations` (justo antes del primer `const t = ...`)**

```js
  if (_quotPollTimer) { clearInterval(_quotPollTimer); _quotPollTimer = null; }
```

- [ ] **Agregar listener del botón y arrancar auto-poll al final del bloque de listeners de `renderQuotations`**

Busca el bloque de listeners (cerca del final de `renderQuotations`, después de los listeners de filtros y botones). Agrega al final de ese bloque:

```js
  container.querySelector('#sync-quot')?.addEventListener('click', () => _syncAndRefresh(container, params));

  if (window._supSync) {
    _quotPollTimer = setInterval(() => {
      if (!document.body.contains(container)) {
        clearInterval(_quotPollTimer);
        _quotPollTimer = null;
        return;
      }
      _syncAndRefresh(container, params);
    }, 60000);
  }
```

- [ ] **Verificar que no hay errores de sintaxis**

```bash
node --input-type=module < js/modules/quotations.js 2>&1 | head -5
```
Expected: sin output (o solo warnings de imports no resueltos, no errores de sintaxis).

- [ ] **Commit**

```bash
git add js/modules/quotations.js
git commit -m "feat: add refresh button + 60s auto-poll to quotations view"
```

---

### Task 2: Eliminar EmailJS de `settings.js`

**Files:**
- Modify: `js/modules/settings.js`

- [ ] **Eliminar las 5 variables de EmailJS al inicio de `renderSettings` (líneas 11–18)**

Eliminar este bloque completo:
```js
  // EmailJS config — compute before template literal
  const _ejsKey = localStorage.getItem('cot_emailjs_public_key') || '';
  const _ejsSvc = localStorage.getItem('cot_emailjs_service_id') || '';
  const _ejsTpl = localStorage.getItem('cot_emailjs_template_id') || '';
  const _ejsConfigured = !!((_ejsKey && _ejsSvc && _ejsTpl));
  const _ejsBadge = _ejsConfigured
    ? `<div class="alert alert--success" style="margin-bottom:16px"><i data-lucide="check-circle-2"></i> <span>EmailJS configurado — envío de correos activo.</span></div>`
    : `<div class="alert alert--info" style="margin-bottom:16px"><i data-lucide="info"></i> <span>Configura EmailJS para enviar cotizaciones por correo. Gratis hasta 200 correos/mes en <strong>emailjs.com</strong></span></div>`;
```

- [ ] **Eliminar la card `#emailjs-card` del HTML (líneas 196–227)**

Eliminar este bloque completo:
```js
      <!-- EmailJS -->
      <div class="card" id="emailjs-card">
        <div class="card__header"><span class="card__title"><i data-lucide="mail"></i> Envío de correos (EmailJS)</span></div>
        <div class="card__body">
          ${_ejsBadge}
          <div class="form-row form-row--3">
            <div class="form-group">
              <label class="form-label">Public Key</label>
              <input class="form-control" id="ejs-key" placeholder="user_xxxx..." value="${_ejsKey}">
            </div>
            <div class="form-group">
              <label class="form-label">Service ID</label>
              <input class="form-control" id="ejs-svc" placeholder="service_xxxx" value="${_ejsSvc}">
            </div>
            <div class="form-group">
              <label class="form-label">Template ID</label>
              <input class="form-control" id="ejs-tpl" placeholder="template_xxxx" value="${_ejsTpl}">
            </div>
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
            <button class="btn btn--secondary btn--sm" id="ejs-save"><i data-lucide="save"></i> Guardar configuración</button>
            <a href="https://www.emailjs.com" target="_blank" class="btn btn--ghost btn--sm"><i data-lucide="external-link"></i> Crear cuenta gratis</a>
          </div>
          <details style="margin-top:16px">
            <summary style="font-size:12px;color:var(--text-2);cursor:pointer;padding:4px 0">📋 Plantilla HTML para pegar en EmailJS</summary>
            <div style="margin-top:10px">
              <p class="text-xs text-muted" style="margin-bottom:8px">En EmailJS → Email Templates → Create New → pega este HTML en el body y configura "To Email" como <code style="background:var(--bg-3);padding:2px 4px;border-radius:4px">{{to_email}}</code></p>
              <textarea class="form-control" style="font-size:11px;font-family:monospace;height:160px" readonly id="ejs-template-html"></textarea>
            </div>
          </details>
        </div>
      </div>
```

- [ ] **Eliminar el bloque de template preview + listener `#ejs-save` (líneas 488–532)**

Eliminar este bloque completo:
```js
  // EmailJS template preview
  const ejsTplArea = container.querySelector('#ejs-template-html');
  if (ejsTplArea) {
    ejsTplArea.value = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1)">
  <div style="background:#6366f1;padding:24px 32px;color:#fff">
    <h1 style="margin:0;font-size:22px">{{empresa_nombre}}</h1>
    <p style="margin:4px 0 0;opacity:.8;font-size:13px">RFC: {{empresa_rfc}}</p>
  </div>
  <div style="padding:32px">
    <p style="color:#333;margin-top:0">Hola <strong>{{to_name}}</strong>,</p>
    <p style="color:#555">Compartimos la cotización <strong>{{folio}}</strong>:</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px">
      <tr style="background:#f8f8f8"><td style="padding:8px 12px;color:#888">Folio</td><td style="padding:8px 12px;font-weight:600">{{folio}}</td></tr>
      <tr><td style="padding:8px 12px;color:#888">Fecha</td><td style="padding:8px 12px">{{fecha}}</td></tr>
      <tr style="background:#f8f8f8"><td style="padding:8px 12px;color:#888">Válida hasta</td><td style="padding:8px 12px">{{valida_hasta}}</td></tr>
    </table>
    <div style="background:#f8faff;border:1px solid #e0e7ff;border-radius:6px;padding:16px;margin:16px 0">
      <p style="margin:0 0 8px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px">Conceptos</p>
      <pre style="margin:0;font-size:13px;font-family:Arial,sans-serif;white-space:pre-wrap">{{conceptos}}</pre>
    </div>
    <div style="text-align:right;border-top:2px solid #6366f1;padding-top:12px">
      <span style="font-size:20px;font-weight:700;color:#6366f1">TOTAL: {{total}}</span>
    </div>
    <p style="color:#555;margin-top:24px">Para cualquier duda, estamos a tus órdenes.</p>
    <p style="margin:2px 0;font-weight:600">{{empresa_nombre}}</p>
    <p style="margin:2px 0;color:#888;font-size:13px">{{empresa_email}}</p>
    <p style="margin:2px 0;color:#888;font-size:13px">{{empresa_tel}}</p>
  </div>
  <div style="background:#f8f8f8;padding:12px 32px;text-align:center;font-size:11px;color:#aaa">Generado con CotizaPro</div>
</div></body></html>`;
  }

  // EmailJS save
  container.querySelector('#ejs-save')?.addEventListener('click', () => {
    const key = container.querySelector('#ejs-key')?.value.trim();
    const svc = container.querySelector('#ejs-svc')?.value.trim();
    const tpl = container.querySelector('#ejs-tpl')?.value.trim();
    if (!key || !svc || !tpl) { showToast('Ingresa los 3 valores de EmailJS', 'error'); return; }
    localStorage.setItem('cot_emailjs_public_key', key);
    localStorage.setItem('cot_emailjs_service_id', svc);
    localStorage.setItem('cot_emailjs_template_id', tpl);
    showToast('Configuración de EmailJS guardada ✓');
  });
```

- [ ] **Verificar**

```bash
python -c "
c = open('js/modules/settings.js').read()
checks = [
  ('_ejsKey gone', '_ejsKey' not in c),
  ('emailjs-card gone', 'emailjs-card' not in c),
  ('ejs-save gone', 'ejs-save' not in c),
  ('ejs-template-html gone', 'ejs-template-html' not in c),
]
[print(f'  {\"OK\" if v else \"FAIL\"}: {k}') for k,v in checks]
"
```
Expected: todos OK.

- [ ] **Commit**

```bash
git add js/modules/settings.js
git commit -m "feat: remove EmailJS card from settings"
```

---

### Task 3: Eliminar EmailJS de `quotations.js`

**Files:**
- Modify: `js/modules/quotations.js`

- [ ] **Eliminar el botón `#btn-email` del HTML en `renderQuotationView` (~línea 640)**

Eliminar esta línea:
```js
        <button class="btn btn--ghost btn--sm" id="btn-email" title="Enviar por correo"><i data-lucide="mail"></i> Correo</button>
```

- [ ] **Eliminar el listener de `#btn-email` (~línea 698)**

Eliminar esta línea:
```js
  container.querySelector('#btn-email')?.addEventListener('click', () => sendEmail(q, client, company, settings));
```

- [ ] **Eliminar la función `sendEmail` completa (líneas 1025–1092)**

Eliminar desde el comentario hasta el cierre de la función:
```js
// ─── EMAIL (EmailJS) ───────────────────────────────────────────────────────────
async function sendEmail(q, client, company, settings) {
  if (!client?.email) {
    showToast('Este cliente no tiene correo registrado. Agrégalo en Clientes.', 'error');
    return;
  }
  const ejsCfg = {
    publicKey: localStorage.getItem('cot_emailjs_public_key') || '',
    serviceId:  localStorage.getItem('cot_emailjs_service_id') || '',
    templateId: localStorage.getItem('cot_emailjs_template_id') || '',
  };
  if (!ejsCfg.publicKey || !ejsCfg.serviceId || !ejsCfg.templateId) {
    showToast('Configura EmailJS en Configuración → Envío de correos.', 'error');
    window.App?.navigate('settings');
    return;
  }
  if (!window.emailjs) { showToast('EmailJS no está cargado.', 'error'); return; }

  const btn = document.getElementById('btn-email');
  _setBtnLoading(btn, 'Generando PDF...');
  try {
    // 1. Generate PDF
    const blob = await _generatePDFBlob(q, client, company, settings);
    const filename = `Cotizacion_${q.folio}.pdf`;


    const conceptos = (q.items || []).map(item => {
      const base = (item.qty || 0) * (item.unitPrice || 0);
      const disc = base * ((item.discount || 0) / 100);
      const total = (base - disc) * (1 + (item.taxRate || 0) / 100);
      return `${item.description || 'Concepto'} (x${item.qty}) — $${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
    }).join('\n');

    _setBtnLoading(btn, 'Enviando correo...');
    if (window.lucide) lucide.createIcons({ nodes: [btn] });

    emailjs.init({ publicKey: ejsCfg.publicKey });
    await emailjs.send(ejsCfg.serviceId, ejsCfg.templateId, {
      to_email:       client.email,
      to_name:        client.name || '',
      from_name:      company.name || 'CotizaPro',
      reply_to:       company.email || '',
      folio:          q.folio,
      fecha:          formatDate(q.date),
      valida_hasta:   formatDate(q.validUntil),
      total:          formatCurrency(q.total, q.currency),
      moneda:         q.currency,
      conceptos,
      notas:          q.notes || '',
      terminos:       q.terms || '',
      empresa_nombre: company.name || '',
      empresa_rfc:    company.rfc || '',
      empresa_email:  company.email || '',
      empresa_tel:    company.telefono || '',
    });

    // Download PDF locally — user can forward the email with the PDF attached
    _downloadBlob(blob, filename);
    _markSentHistory(q, `Correo enviado a ${client.email}`);
    showToast(`Correo enviado a ${client.email} ✓ · PDF descargado para adjuntar`);

  } catch (err) {
    console.error('Email PDF error:', err);
    showToast('Error: ' + (err?.text || err?.message || 'revisa la configuración de EmailJS'), 'error');
  } finally {
    _resetBtn(btn);
  }
}
```

- [ ] **Verificar**

```bash
python -c "
c = open('js/modules/quotations.js').read()
checks = [
  ('btn-email gone', 'btn-email' not in c),
  ('sendEmail gone', 'sendEmail' not in c),
  ('cot_emailjs gone', 'cot_emailjs' not in c),
  ('_syncAndRefresh present', '_syncAndRefresh' in c),
  ('_quotPollTimer present', '_quotPollTimer' in c),
]
[print(f'  {\"OK\" if v else \"FAIL\"}: {k}') for k,v in checks]
"
```
Expected: todos OK.

- [ ] **Commit**

```bash
git add js/modules/quotations.js
git commit -m "feat: remove EmailJS button and sendEmail function from quotations"
```

---

### Task 4: Eliminar script de EmailJS de `index.html`

**Files:**
- Modify: `index.html`

- [ ] **Eliminar la línea del script de EmailJS (~línea 23)**

Eliminar esta línea:
```html
  <script src="https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js"></script>
```

- [ ] **Verificar**

```bash
python -c "c=open('index.html').read(); print('OK: emailjs gone' if 'emailjs' not in c else 'FAIL: emailjs still present')"
```
Expected: `OK: emailjs gone`

- [ ] **Commit**

```bash
git add index.html
git commit -m "feat: remove EmailJS SDK from index.html"
```

---

### Task 5: Rebuild bundle y verificación final

**Files:**
- Regenerate: `js/bundle.js`

- [ ] **Rebuild**

```bash
python build.py
```
Expected: `Bundle written to ... SUPABASE_URL injected: https://...`

- [ ] **Verificar que el bundle está limpio**

```bash
python -c "
c = open('js/bundle.js').read()
checks = {
  'emailjs gone': 'emailjs' not in c.lower(),
  'btn-email gone': 'btn-email' not in c,
  'ejs-save gone': 'ejs-save' not in c,
  'sync-quot present': 'sync-quot' in c,
  '_quotPollTimer present': '_quotPollTimer' in c,
  'URL injected': '__SUPABASE_URL__' not in c,
}
all_ok = True
for k, v in checks.items():
    if not v: all_ok = False
    print(f'  {\"OK\" if v else \"FAIL\"}: {k}')
print()
print('RESULT:', 'ALL CHECKS PASSED' if all_ok else 'SOME CHECKS FAILED')
"
```
Expected: todos OK y `ALL CHECKS PASSED`.

- [ ] **Commit y push**

```bash
git add js/bundle.js
git commit -m "build: regenerate bundle — refresh button, EmailJS removed"
git push
```
