import Store from '../store.js';
import I18n from '../i18n.js';
import { uid, showToast, confirmDialog, exportCSV, importCSV, debounce, formatDate, formatCurrency, escapeHTML } from '../utils.js';
import { REGIMENES_FISCALES, USOS_CFDI, CURRENCIES } from '../catalogs.js';

let clientsSearch = '';

export function renderClients(container, params = {}) {
  const t = I18n.t.bind(I18n);
  if (params.action === 'new' || params.action === 'edit') {
    return renderClientForm(container, params.id);
  }
  const clients = Store.getClients().filter(c =>
    !clientsSearch || c.name?.toLowerCase().includes(clientsSearch) || c.rfc?.toLowerCase().includes(clientsSearch) || c.email?.toLowerCase().includes(clientsSearch)
  );

  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">${t('cli_title')}</h1>
      <div class="page-actions">
        <label class="btn btn--ghost btn--sm" title="Importar CSV">
          <i data-lucide="upload"></i> ${t('btn_import')}
          <input type="file" accept=".csv" id="import-clients-file" class="hidden">
        </label>
        <button class="btn btn--ghost btn--sm" id="export-clients"><i data-lucide="download"></i> ${t('btn_export')}</button>
        <button class="btn btn--primary" id="new-client"><i data-lucide="user-plus"></i> ${t('cli_new')}</button>
      </div>
    </div>

    <div class="toolbar">
      <div class="search-box">
        <i data-lucide="search" class="search-box__icon"></i>
        <input type="text" class="search-box__input" placeholder="${t('search_placeholder')}" id="client-search" value="${clientsSearch}">
      </div>
      <span class="record-count">${clients.length} registros</span>
    </div>

    <div class="card p-0">
      ${clients.length ? `
      <table class="table">
        <thead><tr>
          <th>${t('cli_name')}</th>
          <th>${t('cli_rfc')}</th>
          <th>${t('cli_email')}</th>
          <th>${t('cli_phone')}</th>
          <th>${t('cli_regimen')}</th>
          <th class="text-center">Acciones</th>
        </tr></thead>
        <tbody>
          ${clients.map(c => `
          <tr>
            <td>
              <div class="cell-with-avatar">
                <div class="avatar avatar--sm">${(c.name || '?')[0].toUpperCase()}</div>
                <div>
                  <div class="cell-primary">${escapeHTML(c.name || '')}</div>
                  <div class="cell-secondary">${escapeHTML(c.address || '')}</div>
                </div>
              </div>
            </td>
            <td><span class="mono">${escapeHTML(c.rfc || '—')}</span></td>
            <td>${escapeHTML(c.email || '—')}</td>
            <td>${escapeHTML(c.phone || '—')}</td>
            <td><span class="text-xs">${REGIMENES_FISCALES.find(r => r.clave === c.regimenFiscal)?.descripcion?.slice(0, 30) || c.regimenFiscal || '—'}</span></td>
            <td class="text-center">
              <div class="action-buttons">
                <button class="btn-icon" title="Editar" data-action="edit" data-id="${c.id}"><i data-lucide="pencil"></i></button>
                <button class="btn-icon btn-icon--danger" title="Eliminar" data-action="delete" data-id="${c.id}"><i data-lucide="trash-2"></i></button>
              </div>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>` : `
      <div class="empty-state">
        <i data-lucide="users" class="empty-state__icon"></i>
        <h3>Sin clientes</h3>
        <p>Agrega tu primer cliente para comenzar</p>
        <button class="btn btn--primary" id="new-client-empty"><i data-lucide="user-plus"></i> ${t('cli_new')}</button>
      </div>`}
    </div>`;

  if (window.lucide) lucide.createIcons({ nodes: [container] });

  container.querySelector('#new-client')?.addEventListener('click', () => window.App?.navigate('clients', { action: 'new' }));
  container.querySelector('#new-client-empty')?.addEventListener('click', () => window.App?.navigate('clients', { action: 'new' }));
  container.querySelector('#export-clients')?.addEventListener('click', () => exportClients(clients));
  container.querySelector('#client-search')?.addEventListener('input', debounce(e => {
    clientsSearch = e.target.value.toLowerCase();
    renderClients(container, params);
  }));
  container.querySelector('#import-clients-file')?.addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const rows = await importCSV(file);
      let imported = 0;
      rows.forEach(row => {
        if (row.rfc || row.RFC || row.name || row['Razón social']) {
          Store.upsertClient({
            id: uid(), name: row.name || row['Razón social'] || '', rfc: row.rfc || row.RFC || '',
            email: row.email || row.Email || '', phone: row.phone || row.Teléfono || '',
            address: row.address || row.Domicilio || '', regimenFiscal: row.regimenFiscal || '601',
            usoCFDI: row.usoCFDI || 'G03', currency: row.currency || 'MXN', createdAt: new Date().toISOString(),
          });
          imported++;
        }
      });
      showToast(`${imported} clientes importados`);
      renderClients(container, params);
    } catch { showToast('Error al importar', 'error'); }
  });
  container.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const { action, id } = btn.dataset;
      if (action === 'edit') window.App?.navigate('clients', { action: 'edit', id });
      if (action === 'delete') {
        if (await confirmDialog(t('confirm_delete'))) {
          Store.deleteClient(id);
          showToast(t('success_deleted'));
          renderClients(container, params);
        }
      }
    });
  });
}

function exportClients(clients) {
  const headers = ['Razón social', 'RFC', 'Régimen fiscal', 'Email', 'Teléfono', 'Domicilio', 'Uso CFDI', 'Moneda'];
  const rows = clients.map(c => [c.name, c.rfc, c.regimenFiscal, c.email, c.phone, c.address, c.usoCFDI, c.currency]);
  exportCSV(headers, rows, 'clientes.csv');
}

function renderClientForm(container, id) {
  const t = I18n.t.bind(I18n);
  const client = id ? Store.getClient(id) : null;
  const c = client || {};
  const isNew = !id;

  container.innerHTML = `
    <div class="page-header">
      <button class="btn btn--ghost btn--sm" id="back-clients"><i data-lucide="arrow-left"></i> ${t('cli_title')}</button>
      <h1 class="page-title">${isNew ? t('cli_new') : t('cli_edit')}</h1>
    </div>

    <div class="form-grid">
      <div class="card form-card">
        <div class="card__header"><span class="card__title">Información general</span></div>
        <div class="card__body">
          <div class="form-row form-row--2">
            <div class="form-group">
              <label class="form-label required">${t('cli_name')}</label>
              <input class="form-control" id="c-name" value="${escapeHTML(c.name || '')}" placeholder="Mi Empresa S.A. de C.V.">
            </div>
            <div class="form-group">
              <label class="form-label required">${t('cli_rfc')}</label>
              <input class="form-control mono" id="c-rfc" value="${escapeHTML(c.rfc || '')}" placeholder="XAXX010101000" maxlength="13">
            </div>
          </div>
          <div class="form-row form-row--2">
            <div class="form-group">
              <label class="form-label required">${t('cli_regimen')}</label>
              <select class="form-control" id="c-regimen">
                <option value="">Seleccionar...</option>
                ${REGIMENES_FISCALES.map(r => `<option value="${r.clave}" ${c.regimenFiscal === r.clave ? 'selected' : ''}>${r.clave} – ${r.descripcion}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">${t('cli_uso_cfdi')}</label>
              <select class="form-control" id="c-uso">
                ${USOS_CFDI.map(u => `<option value="${u.clave}" ${c.usoCFDI === u.clave ? 'selected' : ''}>${u.clave} – ${u.descripcion}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-row form-row--2">
            <div class="form-group">
              <label class="form-label">${t('cli_email')}</label>
              <input class="form-control" id="c-email" type="email" value="${escapeHTML(c.email || '')}">
            </div>
            <div class="form-group">
              <label class="form-label">${t('cli_phone')}</label>
              <input class="form-control" id="c-phone" value="${escapeHTML(c.phone || '')}">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">${t('cli_address')}</label>
            <input class="form-control" id="c-address" value="${escapeHTML(c.address || '')}" placeholder="Av. Reforma 123, Col. Centro, CDMX, CP 06000">
          </div>
          <div class="form-row form-row--2">
            <div class="form-group">
              <label class="form-label">${t('cli_currency')}</label>
              <select class="form-control" id="c-currency">
                ${CURRENCIES.map(cur => `<option value="${cur.code}" ${c.currency === cur.code ? 'selected' : ''}>${cur.code} – ${cur.name}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Código postal fiscal</label>
              <input class="form-control" id="c-cp" value="${escapeHTML(c.cp || '')}" maxlength="5">
            </div>
          </div>
        </div>
        <div class="card__footer">
          <button class="btn btn--ghost" id="cancel-client">${t('btn_cancel')}</button>
          <button class="btn btn--primary" id="save-client"><i data-lucide="save"></i> ${t('btn_save')}</button>
        </div>
      </div>

      ${id ? (() => {
        const clientQuots = Store.getQuotations()
          .filter(q => q.clientId === id)
          .sort((a, b) => (b.date || '') > (a.date || '') ? 1 : -1)
          .slice(0, 10);
        if (!clientQuots.length) return '';
        const getStatus = (s) => ({ draft:'Borrador', sent:'Enviada', approved:'Aprobada', invoiced:'Facturada', rejected:'Rechazada' })[s] || s;
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
                    <td><span class="mono">${escapeHTML(q.folio || '')}</span></td>
                    <td>${formatDate(q.date)}</td>
                    <td>${formatCurrency(q.total, q.currency)}</td>
                    <td>${getStatus(q.status)}</td>
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
    </div>`;

  if (window.lucide) lucide.createIcons({ nodes: [container] });

  container.querySelectorAll('.base-on-quot').forEach(btn => {
    btn.addEventListener('click', () => {
      window.App?.navigate('quotations', { action: 'new', basedOn: btn.dataset.id });
    });
  });

  container.querySelector('#back-clients')?.addEventListener('click', () => window.App?.navigate('clients'));
  container.querySelector('#cancel-client')?.addEventListener('click', () => window.App?.navigate('clients'));
  container.querySelector('#save-client')?.addEventListener('click', () => {
    const name = container.querySelector('#c-name').value.trim();
    const rfc = container.querySelector('#c-rfc').value.trim().toUpperCase();
    const regimen = container.querySelector('#c-regimen').value;
    if (!name || !rfc || !regimen) { showToast('Nombre, RFC y Régimen son requeridos', 'error'); return; }
    Store.upsertClient({
      id: c.id || uid(),
      name, rfc, regimenFiscal: regimen,
      usoCFDI: container.querySelector('#c-uso').value,
      email: container.querySelector('#c-email').value,
      phone: container.querySelector('#c-phone').value,
      address: container.querySelector('#c-address').value,
      currency: container.querySelector('#c-currency').value,
      cp: container.querySelector('#c-cp').value,
      createdAt: c.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    showToast(t('success_saved'));
    window.App?.navigate('clients');
  });
}
