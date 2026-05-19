import Store from '../store.js';
import I18n from '../i18n.js';
import { showToast, escapeHTML } from '../utils.js';
import { REGIMENES_FISCALES, CURRENCIES } from '../catalogs.js';

export function renderSettings(container) {
  const t = I18n.t.bind(I18n);
  const company = Store.getCompany();
  const settings = Store.getSettings();

  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">${t('set_title')}</h1>
    </div>

    <div class="settings-grid">
      <!-- Company -->
      <div class="card">
        <div class="card__header"><span class="card__title"><i data-lucide="building-2"></i> ${t('set_company')}</span></div>
        <div class="card__body">
          <div class="logo-upload-area" id="logo-area">
            ${company.logo ? `<img src="${company.logo}" id="logo-preview" class="logo-preview">` : `<div class="logo-placeholder" id="logo-preview"><i data-lucide="image"></i></div>`}
            <div>
              <label class="btn btn--ghost btn--sm">
                <i data-lucide="upload"></i> Subir logotipo
                <input type="file" id="logo-file" accept="image/*" class="hidden">
              </label>
              ${company.logo ? `<button class="btn btn--ghost btn--sm btn-icon--danger" id="remove-logo"><i data-lucide="trash-2"></i> Quitar</button>` : ''}
              <p class="text-xs text-muted mt-1">PNG, JPG · Máx 1 MB · Recomendado 200×60px</p>
            </div>
          </div>

          <div class="form-row form-row--2">
            <div class="form-group">
              <label class="form-label required">${t('set_company_name')}</label>
              <input class="form-control" id="s-name" value="${escapeHTML(company.name || '')}">
            </div>
            <div class="form-group">
              <label class="form-label required">${t('set_rfc')}</label>
              <input class="form-control mono" id="s-rfc" value="${escapeHTML(company.rfc || '')}" maxlength="13" placeholder="RFC000000XXX">
            </div>
          </div>
          <div class="form-row form-row--2">
            <div class="form-group">
              <label class="form-label required">${t('set_regimen')}</label>
              <select class="form-control" id="s-regimen">
                ${REGIMENES_FISCALES.map(r => `<option value="${r.clave}" ${company.regimenFiscal === r.clave ? 'selected' : ''}>${r.clave} – ${r.descripcion}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label required">${t('set_cp')}</label>
              <input class="form-control" id="s-cp" value="${escapeHTML(company.codigoPostal || '')}" maxlength="5" placeholder="06600">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Domicilio fiscal</label>
            <input class="form-control" id="s-dom" value="${escapeHTML(company.domicilioFiscal || '')}">
          </div>
          <div class="form-row form-row--2">
            <div class="form-group">
              <label class="form-label">Correo electrónico</label>
              <input class="form-control" id="s-email" type="email" value="${escapeHTML(company.email || '')}">
            </div>
            <div class="form-group">
              <label class="form-label">Teléfono</label>
              <input class="form-control" id="s-tel" value="${escapeHTML(company.telefono || '')}">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Sitio web</label>
            <input class="form-control" id="s-web" value="${escapeHTML(company.website || '')}">
          </div>
          <div class="form-row form-row--2">
            <div class="form-group">
              <label class="form-label">${t('set_banco')}</label>
              <input class="form-control" id="s-banco" value="${escapeHTML(company.banco || '')}">
            </div>
            <div class="form-group">
              <label class="form-label">${t('set_cuenta')}</label>
              <input class="form-control mono" id="s-cuenta" value="${escapeHTML(company.cuenta || '')}" maxlength="18">
            </div>
          </div>
        </div>
      </div>

      <!-- Fiscal / Documents -->
      <div class="card">
        <div class="card__header"><span class="card__title"><i data-lucide="file-check"></i> ${t('set_fiscal')}</span></div>
        <div class="card__body">
          <div class="form-row form-row--3">
            <div class="form-group">
              <label class="form-label">${t('set_serie')}</label>
              <input class="form-control mono" id="s-serie" value="${escapeHTML(company.serie || 'A')}" maxlength="3">
            </div>
            <div class="form-group">
              <label class="form-label">${t('set_folio_cot')}</label>
              <input class="form-control" id="s-folio-cot" type="number" value="${company.folioInicial || 1}" min="1">
            </div>
            <div class="form-group">
              <label class="form-label">${t('set_folio_fac')}</label>
              <input class="form-control" id="s-folio-fac" type="number" value="${company.folioFacturaInicial || 1}" min="1">
            </div>
          </div>
          <div class="form-row form-row--2">
            <div class="form-group">
              <label class="form-label">${t('set_iva')}</label>
              <input class="form-control" id="s-iva" type="number" value="${settings.iva ?? 16}" min="0" max="100">
            </div>
            <div class="form-group">
              <label class="form-label">${t('set_payment_terms')}</label>
              <input class="form-control" id="s-terms" type="number" value="${settings.paymentTerms || 30}" min="0">
            </div>
          </div>
          <div class="form-row form-row--2">
            <div class="form-group">
              <label class="form-label">${t('set_validity')}</label>
              <input class="form-control" id="s-validity" type="number" value="${settings.validityDays || 15}" min="1">
            </div>
            <div class="form-group">
              <label class="form-label">${t('set_exchange')}</label>
              <input class="form-control" id="s-exrate" type="number" value="${settings.exchangeRate || 17.50}" min="0" step="0.01">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">${t('set_currency')}</label>
            <select class="form-control" id="s-currency">
              ${CURRENCIES.map(c => `<option value="${c.code}" ${settings.currency === c.code ? 'selected' : ''}>${c.code} – ${c.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Términos y condiciones predeterminados</label>
            <textarea class="form-control" id="s-default-terms" rows="3">${settings.defaultTerms || ''}</textarea>
          </div>
        </div>
      </div>

      <!-- Appearance -->
      <div class="card">
        <div class="card__header"><span class="card__title"><i data-lucide="palette"></i> ${t('set_appearance')}</span></div>
        <div class="card__body">
          <div class="form-group">
            <label class="form-label">${t('set_theme')}</label>
            <div class="theme-toggle-group">
              <button class="theme-option ${settings.theme === 'dark' ? 'active' : ''}" data-theme="dark">
                <i data-lucide="moon"></i> ${t('set_theme_dark')}
              </button>
              <button class="theme-option ${settings.theme === 'light' ? 'active' : ''}" data-theme="light">
                <i data-lucide="sun"></i> ${t('set_theme_light')}
              </button>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">${t('set_language')}</label>
            <div class="theme-toggle-group">
              <button class="theme-option ${settings.lang === 'es' ? 'active' : ''}" data-lang="es">
                <i data-lucide="globe"></i> Español
              </button>
              <button class="theme-option ${settings.lang === 'en' ? 'active' : ''}" data-lang="en">
                <i data-lucide="globe"></i> English
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Backup / Restore -->
      <div class="card">
        <div class="card__header"><span class="card__title"><i data-lucide="database"></i> Respaldo de datos</span></div>
        <div class="card__body">
          <div class="alert alert--info" style="margin-bottom:16px">
            <i data-lucide="info"></i>
            <span>Los datos se guardan en el <strong>localStorage</strong> de este navegador. Haz respaldos periódicos para no perder información.</span>
          </div>
          <div style="display:flex;gap:12px;flex-wrap:wrap">
            <button class="btn btn--secondary" id="backup-json">
              <i data-lucide="download"></i> Exportar respaldo completo (.json)
            </button>
            <label class="btn btn--secondary" style="cursor:pointer">
              <i data-lucide="upload"></i> Importar respaldo (.json)
              <input type="file" id="restore-json" accept=".json" class="hidden">
            </label>
          </div>
          <div id="backup-info" class="text-xs text-muted mt-1" style="margin-top:10px"></div>
        </div>
      </div>

      <!-- Card: Seguimiento automático -->
      <div class="card">
        <div class="card__header">
          <span class="card__title"><i data-lucide="bell"></i> Seguimiento automático</span>
        </div>
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

          <hr style="margin:20px 0;border-color:var(--border)">

          <div class="form-label" style="margin-bottom:8px">Modo de aprobación del portal</div>
          <select class="form-control" id="s-approval-mode" style="max-width:300px">
            <option value="click"     ${(settings.approvalMode||'click') === 'click'     ? 'selected' : ''}>Solo click (Aprobar / Rechazar)</option>
            <option value="comments"  ${(settings.approvalMode||'click') === 'comments'  ? 'selected' : ''}>Con comentarios</option>
            <option value="signature" ${(settings.approvalMode||'click') === 'signature' ? 'selected' : ''}>Con firma (nombre + fecha)</option>
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

      <!-- Danger Zone -->
      <div class="card card--danger">
        <div class="card__header"><span class="card__title"><i data-lucide="alert-triangle"></i> Zona peligrosa</span></div>
        <div class="card__body">
          <p class="text-sm text-muted mb-4">Elimina todos los datos del sistema. Esta acción no se puede deshacer.</p>
          <button class="btn btn--danger" id="reset-all"><i data-lucide="trash-2"></i> Borrar todos los datos</button>
        </div>
      </div>

      <div class="settings-save-bar">
        <button class="btn btn--primary btn--lg" id="save-settings"><i data-lucide="save"></i> ${t('set_save')}</button>
      </div>
    </div>`;

  if (window.lucide) lucide.createIcons({ nodes: [container] });

  // Save reminders settings
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

  // Logo upload
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
  container.querySelector('#remove-logo')?.addEventListener('click', () => {
    container.querySelector('#logo-preview').outerHTML = `<div class="logo-placeholder" id="logo-preview"><i data-lucide="image"></i></div>`;
    if (window.lucide) lucide.createIcons({ nodes: [container.querySelector('#logo-area')] });
  });

  // Theme / lang toggles
  container.querySelectorAll('.theme-option[data-theme]').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.theme-option[data-theme]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.documentElement.setAttribute('data-theme', btn.dataset.theme);
    });
  });
  container.querySelectorAll('.theme-option[data-lang]').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.theme-option[data-lang]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Save
  container.querySelector('#save-settings')?.addEventListener('click', () => {
    const logoImg = container.querySelector('#logo-preview');
    const logoSrc = logoImg?.tagName === 'IMG' ? logoImg.src : '';

    Store.saveCompany({
      ...company,
      name: container.querySelector('#s-name').value.trim(),
      rfc: container.querySelector('#s-rfc').value.trim().toUpperCase(),
      regimenFiscal: container.querySelector('#s-regimen').value,
      codigoPostal: container.querySelector('#s-cp').value.trim(),
      domicilioFiscal: container.querySelector('#s-dom').value.trim(),
      email: container.querySelector('#s-email').value.trim(),
      telefono: container.querySelector('#s-tel').value.trim(),
      website: container.querySelector('#s-web').value.trim(),
      banco: container.querySelector('#s-banco').value.trim(),
      cuenta: container.querySelector('#s-cuenta').value.trim(),
      serie: container.querySelector('#s-serie').value.trim().toUpperCase() || 'A',
      folioInicial: parseInt(container.querySelector('#s-folio-cot').value) || 1,
      folioFacturaInicial: parseInt(container.querySelector('#s-folio-fac').value) || 1,
      logo: logoSrc,
    });

    const activeTheme = container.querySelector('.theme-option[data-theme].active')?.dataset.theme || settings.theme;
    const activeLang = container.querySelector('.theme-option[data-lang].active')?.dataset.lang || settings.lang;

    Store.saveSettings({
      ...settings,
      iva: parseFloat(container.querySelector('#s-iva').value) || 16,
      paymentTerms: parseInt(container.querySelector('#s-terms').value) || 30,
      validityDays: parseInt(container.querySelector('#s-validity').value) || 15,
      exchangeRate: parseFloat(container.querySelector('#s-exrate').value) || 17.50,
      currency: container.querySelector('#s-currency').value,
      defaultTerms: container.querySelector('#s-default-terms').value,
      theme: activeTheme,
      lang: activeLang,
    });

    document.documentElement.setAttribute('data-theme', activeTheme);
    if (window.App?.setLang) window.App.setLang(activeLang);
    showToast(t('success_saved'));
  });

  // Backup export
  container.querySelector('#backup-json')?.addEventListener('click', () => {
    const KEYS = { company: 'cot_company', clients: 'cot_clients', products: 'cot_products', quotations: 'cot_quotations', invoices: 'cot_invoices', payments: 'cot_payments', templates: 'cot_templates', settings: 'cot_settings' };
    const backup = { version: '1.0', exportedAt: new Date().toISOString(), data: {} };
    Object.entries(KEYS).forEach(([k, v]) => { try { backup.data[k] = JSON.parse(localStorage.getItem(v) || 'null'); } catch {} });
    const counts = Object.entries(backup.data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.length : (v ? 1 : 0)}`).join(', ');
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `cotizapro_respaldo_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast(`Respaldo exportado · ${counts}`);
  });

  // Backup import / restore
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

  // Backup info
  const infoEl = container.querySelector('#backup-info');
  if (infoEl) {
    const q = Store.getQuotations().length;
    const i = Store.getInvoices().length;
    const c = Store.getClients().length;
    const p = Store.getProducts().length;
    infoEl.textContent = `Datos actuales: ${c} clientes, ${p} productos, ${q} cotizaciones, ${i} facturas`;
  }

  // Reset
  container.querySelector('#reset-all')?.addEventListener('click', () => {
    if (confirm('¿Estás seguro? Se eliminarán TODOS los datos. Esta acción no se puede deshacer.')) {
      Object.values({ company: 'cot_company', clients: 'cot_clients', products: 'cot_products', quotations: 'cot_quotations', invoices: 'cot_invoices', payments: 'cot_payments', templates: 'cot_templates', settings: 'cot_settings' }).forEach(k => localStorage.removeItem(k));
      showToast('Datos eliminados. Recargando...');
      setTimeout(() => location.reload(), 1500);
    }
  });

}
