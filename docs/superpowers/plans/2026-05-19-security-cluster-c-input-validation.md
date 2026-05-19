# Security Cluster C: Input Validation & Secure Storage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent three input validation holes in `settings.js`: SVG logos carrying `<script>`, CSS injection via an unvalidated portal color value, and backup restore accepting arbitrary JSON with unknown keys or oversized payloads.

**Architecture:** All changes are in `js/modules/settings.js`. Each fix is a guard added before storing or rendering user-supplied data. After changes, `bundle.js` is rebuilt with `python build.py`.

**Tech Stack:** Vanilla JS, Python build script (`build.py`).

---

## Files Modified
- `js/modules/settings.js`
- `js/bundle.js` — rebuilt artifact

---

### Task 1: Logo upload validation + `portalHeaderColor` save validation

**Files:**
- Modify: `js/modules/settings.js`

#### Part A: Logo upload — reject SVG and validate data URL format

- [ ] **Step 1: Find the logo upload listener in `settings.js` (around line 312).**

Current code:
```js
container.querySelector('#logo-file')?.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 1048576) { showToast('El archivo es demasiado grande (máx 1 MB)', 'error'); return; }
  const reader = new FileReader();
  reader.onload = (ev) => {
    const preview = container.querySelector('#logo-preview');
    if (preview.tagName === 'IMG') { preview.src = ev.target.result; }
    else { preview.outerHTML = `<img src="${ev.target.result}" id="logo-preview" class="logo-preview">`; }
  };
  reader.readAsDataURL(file);
});
```

Replace with (adds MIME type pre-check before reading + data URL regex after reading):

```js
container.querySelector('#logo-file')?.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 1048576) { showToast('El archivo es demasiado grande (máx 1 MB)', 'error'); return; }
  if (!['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(file.type)) {
    showToast('Formato no permitido. Usa PNG, JPG, GIF o WebP.', 'error');
    return;
  }
  const reader = new FileReader();
  reader.onload = (ev) => {
    const result = ev.target.result;
    const SAFE_IMG_RE = /^data:image\/(png|jpeg|gif|webp);base64,[A-Za-z0-9+/=]+$/;
    if (!SAFE_IMG_RE.test(result)) {
      showToast('El archivo no es una imagen válida.', 'error');
      return;
    }
    const preview = container.querySelector('#logo-preview');
    if (preview.tagName === 'IMG') { preview.src = result; }
    else { preview.outerHTML = `<img src="${result}" id="logo-preview" class="logo-preview">`; }
  };
  reader.readAsDataURL(file);
});
```

- [ ] **Step 2: Test logo validation.**
  1. Try uploading an SVG file (e.g., rename any `.svg` to test). Expected: toast error "Formato no permitido."
  2. Try uploading a valid PNG. Expected: logo preview updates normally.

#### Part B: `portalHeaderColor` — validate hex before saving

- [ ] **Step 3: Find where `portalHeaderColor` is read from the form and saved (around line 283 in the `#save-reminders` listener).**

The save listener is:
```js
container.querySelector('#save-reminders')?.addEventListener('click', () => {
  const s = Store.getSettings();
  Store.saveSettings({
    ...s,
    approvalMode: container.querySelector('#s-approval-mode')?.value || 'click',
    portalHeaderColor: container.querySelector('#s-portal-color')?.value || '#6366f1',
    ...
  });
});
```

Replace the listener body to validate the color before saving:

```js
container.querySelector('#save-reminders')?.addEventListener('click', () => {
  const s = Store.getSettings();
  const HEX_RE = /^#[0-9a-fA-F]{6}$/;
  const rawColor = container.querySelector('#s-portal-color')?.value || '#6366f1';
  const safeColor = HEX_RE.test(rawColor) ? rawColor : '#6366f1';
  Store.saveSettings({
    ...s,
    approvalMode: container.querySelector('#s-approval-mode')?.value || 'click',
    portalHeaderColor: safeColor,
    reminders: {
      noOpen:   { enabled: container.querySelector('#rem-noopen-enabled')?.checked ?? true,   days: parseInt(container.querySelector('#rem-noopen-days')?.value)   || 3 },
      noReply:  { enabled: container.querySelector('#rem-noreply-enabled')?.checked ?? true,  days: parseInt(container.querySelector('#rem-noreply-days')?.value)  || 2 },
      expiring: { enabled: container.querySelector('#rem-expiring-enabled')?.checked ?? false, days: parseInt(container.querySelector('#rem-expiring-days')?.value) || 2 },
    },
  });
  showToast('Configuración de seguimiento guardada');
});
```

- [ ] **Step 4: Test `portalHeaderColor` validation.**

Open browser DevTools console while on the Settings page. Run:
```js
document.querySelector('#s-portal-color').value = 'red';  // not a valid hex
document.querySelector('#save-reminders').click();
```

Then inspect: `Store.getSettings().portalHeaderColor`. Expected: `'#6366f1'` (fallback), not `'red'`.

- [ ] **Step 5: Commit.**

```
git add js/modules/settings.js
git commit -m "feat(security): validate logo upload MIME type and portalHeaderColor hex in settings"
```

---

### Task 2: Backup restore — schema validation before applying

**Files:**
- Modify: `js/modules/settings.js`

- [ ] **Step 1: Find the backup restore listener (around line 402).**

Current code:
```js
container.querySelector('#restore-json')?.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const backup = JSON.parse(ev.target.result);
      if (!backup?.data) throw new Error('Formato inválido');
      const KEYS = { company: 'cot_company', clients: 'cot_clients', products: 'cot_products', quotations: 'cot_quotations', invoices: 'cot_invoices', payments: 'cot_payments', templates: 'cot_templates', settings: 'cot_settings' };
      if (!confirm(`¿Restaurar respaldo del ${backup.exportedAt?.slice(0,10) || '?'}?\nEsto REEMPLAZARÁ todos los datos actuales.`)) return;
      Object.entries(KEYS).forEach(([k, v]) => {
        if (backup.data[k] !== undefined && backup.data[k] !== null) {
          localStorage.setItem(v, JSON.stringify(backup.data[k]));
        }
      });
      showToast('Respaldo restaurado. Recargando...');
      setTimeout(() => location.reload(), 1200);
    } catch (err) {
      showToast('Error al leer el respaldo: ' + err.message, 'error');
    }
  };
  reader.readAsText(file);
});
```

Replace with the validated version:

```js
container.querySelector('#restore-json')?.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const MAX_BACKUP_SIZE = 2 * 1024 * 1024; // 2 MB
  if (file.size > MAX_BACKUP_SIZE) {
    showToast('Archivo demasiado grande (máx 2 MB).', 'error');
    return;
  }
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const VALID_KEYS = { company: 'cot_company', clients: 'cot_clients', products: 'cot_products', quotations: 'cot_quotations', invoices: 'cot_invoices', payments: 'cot_payments', templates: 'cot_templates', settings: 'cot_settings' };
      const VALID_KEY_SET = new Set(Object.keys(VALID_KEYS));

      let backup;
      try { backup = JSON.parse(ev.target.result); }
      catch { showToast('Archivo inválido: no es JSON.', 'error'); return; }

      if (!backup || typeof backup !== 'object' || !backup.data || typeof backup.data !== 'object') {
        showToast('Formato de respaldo inválido.', 'error'); return;
      }
      const unknownKeys = Object.keys(backup.data).filter(k => !VALID_KEY_SET.has(k));
      if (unknownKeys.length > 0) {
        showToast(`Respaldo contiene claves no reconocidas: ${unknownKeys.join(', ')}`, 'error'); return;
      }
      for (const [k, v] of Object.entries(backup.data)) {
        if (v !== null && typeof v !== 'object') {
          showToast(`Campo "${k}" tiene formato incorrecto.`, 'error'); return;
        }
      }

      if (!confirm(`¿Restaurar respaldo del ${backup.exportedAt?.slice(0,10) || '?'}?\nEsto REEMPLAZARÁ todos los datos actuales.`)) return;

      Object.entries(VALID_KEYS).forEach(([k, v]) => {
        if (backup.data[k] !== undefined && backup.data[k] !== null) {
          localStorage.setItem(v, JSON.stringify(backup.data[k]));
        }
      });
      showToast('Respaldo restaurado. Recargando...');
      setTimeout(() => location.reload(), 1200);
    } catch (err) {
      showToast('Error al leer el respaldo: ' + err.message, 'error');
    }
  };
  reader.readAsText(file);
});
```

- [ ] **Step 2: Test backup restore validation.**

Create a file `bad-backup.json` with this content:
```json
{"data": {"company": {"name": "OK"}, "INJECTED": {"evil": true}}}
```

Try importing it in Settings → Importar respaldo. Expected: toast error about unrecognized keys, no data modified.

Create a valid backup file first by using the "Exportar respaldo" button, then import it. Expected: normal restore flow.

- [ ] **Step 3: Commit.**

```
git add js/modules/settings.js
git commit -m "feat(security): backup restore schema validation — whitelist keys, size cap, type check"
```

---

### Task 3: Rebuild bundle + final verification

**Files:**
- Rebuild: `js/bundle.js`

- [ ] **Step 1: Rebuild the bundle.**

```
python build.py
```

Expected output: `Bundle written to js/bundle.js (NNN,NNN bytes)`

- [ ] **Step 2: Verify the validation code is in the bundle.**

```powershell
Select-String -Path js/bundle.js -Pattern "SAFE_IMG_RE"
```
Expected: one match (logo validation regex).

```powershell
Select-String -Path js/bundle.js -Pattern "VALID_KEY_SET"
```
Expected: one match (backup restore whitelist).

- [ ] **Step 3: Smoke test in browser.**
  1. Try uploading an SVG logo → expect error toast
  2. Try importing the `bad-backup.json` created in Task 2 → expect error toast about unknown keys
  3. Export a real backup and re-import it → expect successful restore

- [ ] **Step 4: Commit and push.**

```
git add js/bundle.js
git commit -m "build: rebuild bundle with input validation for logo, color, and backup restore"
git push
```
