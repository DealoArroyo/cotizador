import Store from '../store.js';
import I18n from '../i18n.js';
import { uid, today, addDays, formatDate, calcQuotationTotals, showToast, confirmDialog, exportCSV, debounce, formatCurrency, generatePublicToken } from '../utils.js';
import { CURRENCIES } from '../catalogs.js';
import { renderKanban } from './kanban.js';

let quotsFilter = '';
let quotsSearch = '';

export function renderQuotations(container, params = {}) {
  const t = I18n.t.bind(I18n);
  if (params.action === 'new' || params.action === 'edit') return renderQuotationForm(container, params.id);
  if (params.action === 'view') return renderQuotationView(container, params.id);

  const clients = Store.getClients();
  const allQ = Store.getQuotations();
  const quotations = allQ.filter(q => {
    const matchStatus = !quotsFilter || q.status === quotsFilter;
    const client = clients.find(c => c.id === q.clientId);
    const matchSearch = !quotsSearch || q.folio?.toLowerCase().includes(quotsSearch) || client?.name?.toLowerCase().includes(quotsSearch);
    return matchStatus && matchSearch;
  }).sort((a, b) => (b.date || '') > (a.date || '') ? 1 : -1);

  const statuses = ['draft', 'sent', 'approved', 'rejected', 'invoiced'];
  const viewMode = Store.getSettings().quotationsView || 'kanban';

  // Compute pending reminders for display (without marking them sent)
  const pendingReminders = (() => {
    const s = Store.getSettings();
    const rem = s.reminders || {};
    const MS = 86400000;
    const now = Date.now();
    return Store.getQuotations()
      .filter(q => q.status === 'sent')
      .filter(q => {
        const rs = q.reminderSent || {};
        const ref = q.sentAt || q.date;
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

  container.innerHTML = `
    ${bannerHTML}
    <div class="page-header">
      <h1 class="page-title">${t('quot_title')}</h1>
      <div class="page-actions">
        <div class="view-toggle">
          <button class="view-toggle__btn ${viewMode === 'table' ? 'view-toggle__btn--active' : ''}" data-view="table" title="Vista tabla">
            <i data-lucide="list"></i>
          </button>
          <button class="view-toggle__btn ${viewMode === 'kanban' ? 'view-toggle__btn--active' : ''}" data-view="kanban" title="Vista Kanban">
            <i data-lucide="layout-dashboard"></i>
          </button>
        </div>
        <button class="btn btn--ghost btn--sm" id="export-quot"><i data-lucide="download"></i> ${t('btn_export')}</button>
        <button class="btn btn--primary" id="new-quot"><i data-lucide="file-plus"></i> ${t('quot_new')}</button>
      </div>
    </div>

    <div class="toolbar">
      <div class="search-box">
        <i data-lucide="search" class="search-box__icon"></i>
        <input type="text" class="search-box__input" id="quot-search" placeholder="${t('search_placeholder')}" value="${quotsSearch}">
      </div>
      <div class="status-filters">
        <button class="status-filter ${!quotsFilter ? 'active' : ''}" data-status="">Todos (${allQ.length})</button>
        ${statuses.map(s => `<button class="status-filter ${quotsFilter === s ? 'active' : ''}" data-status="${s}">${t(`status_${s}`)} (${allQ.filter(q => q.status === s).length})</button>`).join('')}
      </div>
    </div>

    ${viewMode === 'kanban'
      ? '<div id="kanban-container"></div>'
      : `<div class="card p-0">
      ${quotations.length ? `
      <table class="table">
        <thead><tr>
          <th>${t('quot_folio')}</th>
          <th>${t('quot_client')}</th>
          <th>${t('quot_date')}</th>
          <th>${t('quot_valid_until')}</th>
          <th>${t('quot_total')}</th>
          <th>${t('quot_status')}</th>
          <th class="text-center">Acciones</th>
        </tr></thead>
        <tbody>
          ${quotations.map(q => {
            const client = clients.find(c => c.id === q.clientId);
            const expired = q.validUntil && q.validUntil < today() && q.status === 'sent';
            return `<tr>
              <td><span class="mono link-cell" data-action="view" data-id="${q.id}">${q.folio}</span></td>
              <td>${client?.name || '—'}</td>
              <td>${formatDate(q.date)}</td>
              <td class="${expired ? 'text-danger' : ''}">${formatDate(q.validUntil)}</td>
              <td>${formatCurrency(q.total, q.currency)}</td>
              <td><span class="badge badge--${q.status}">${t(`status_${q.status}`)}</span></td>
              <td class="text-center">
                <div class="action-buttons">
                  <button class="btn-icon" title="Ver" data-action="view" data-id="${q.id}"><i data-lucide="eye"></i></button>
                  ${q.status === 'draft' || q.status === 'sent' ? `<button class="btn-icon" title="Editar" data-action="edit" data-id="${q.id}"><i data-lucide="pencil"></i></button>` : ''}
                  <button class="btn-icon" title="Duplicar" data-action="duplicate" data-id="${q.id}"><i data-lucide="copy"></i></button>
                  ${q.status === 'approved' ? `<button class="btn-icon btn-icon--success" title="Convertir a factura" data-action="convert" data-id="${q.id}"><i data-lucide="receipt"></i></button>` : ''}
                  <button class="btn-icon btn-icon--danger" title="Eliminar" data-action="delete" data-id="${q.id}"><i data-lucide="trash-2"></i></button>
                </div>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>` : `
      <div class="empty-state">
        <i data-lucide="file-text" class="empty-state__icon"></i>
        <h3>Sin cotizaciones</h3>
        <p>Crea tu primera cotización</p>
        <button class="btn btn--primary" id="new-quot-empty"><i data-lucide="file-plus"></i> ${t('quot_new')}</button>
      </div>`}
    </div>`}`;

  if (window.lucide) lucide.createIcons({ nodes: [container] });

  container.querySelector('#dismiss-reminder')?.addEventListener('click', () => {
    container.querySelector('#reminder-banner')?.remove();
  });

  if (viewMode === 'kanban') {
    const kc = container.querySelector('#kanban-container');
    if (kc) renderKanban(kc);
  }

  container.querySelectorAll('.view-toggle__btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const s = Store.getSettings();
      Store.saveSettings({ ...s, quotationsView: btn.dataset.view });
      renderQuotations(container, params);
    });
  });

  container.querySelector('#new-quot')?.addEventListener('click', () => window.App?.navigate('quotations', { action: 'new' }));
  container.querySelector('#new-quot-empty')?.addEventListener('click', () => window.App?.navigate('quotations', { action: 'new' }));
  container.querySelector('#quot-search')?.addEventListener('input', debounce(e => { quotsSearch = e.target.value.toLowerCase(); renderQuotations(container, params); }));
  container.querySelectorAll('.status-filter').forEach(btn => {
    btn.addEventListener('click', () => { quotsFilter = btn.dataset.status; renderQuotations(container, params); });
  });
  container.querySelector('#export-quot')?.addEventListener('click', () => {
    exportCSV(
      ['Folio', 'Cliente', 'Fecha', 'Válida hasta', 'Subtotal', 'Descuento', 'IVA', 'Total', 'Moneda', 'Estado'],
      quotations.map(q => {
        const c = clients.find(x => x.id === q.clientId);
        return [q.folio, c?.name || '', q.date, q.validUntil, q.subtotal, q.discountTotal, q.taxTotal, q.total, q.currency, q.status];
      }), 'cotizaciones.csv'
    );
  });
  container.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const { action, id } = btn.dataset;
      if (action === 'view') window.App?.navigate('quotations', { action: 'view', id });
      if (action === 'edit') window.App?.navigate('quotations', { action: 'edit', id });
      if (action === 'duplicate') duplicateQuotation(id, container, params);
      if (action === 'convert') window.App?.navigate('invoices', { action: 'new', fromQuotation: id });
      if (action === 'delete') {
        if (await confirmDialog(t('confirm_delete'))) {
          Store.deleteQuotation(id);
          showToast(t('success_deleted'));
          renderQuotations(container, params);
        }
      }
    });
  });
}

function duplicateQuotation(id, container, params) {
  const q = Store.getQuotation(id);
  if (!q) return;
  const newQ = { ...q, id: uid(), folio: Store.nextQuotationFolio(), date: today(), status: 'draft', history: [{ date: new Date().toISOString(), event: 'Cotización duplicada' }] };
  Store.upsertQuotation(newQ);
  showToast('Cotización duplicada');
  window.App?.navigate('quotations', { action: 'edit', id: newQ.id });
}

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

// ─── FORM ─────────────────────────────────────────────────────────────────────
function renderQuotationForm(container, id) {
  const t = I18n.t.bind(I18n);
  const q = id ? Store.getQuotation(id) : null;
  const settings = Store.getSettings();
  const clients = Store.getClients();
  const products = Store.getProducts();
  const templates = Store.getTemplates();

  let items = q?.items ? JSON.parse(JSON.stringify(q.items)) : [newItem(settings)];

  const renderItems = () => {
    const totals = calcQuotationTotals(items);
    return `
      <div class="items-table-wrap">
        <table class="table items-table">
          <thead><tr>
            <th>${t('quot_product')}</th>
            <th>${t('quot_description')}</th>
            <th>${t('quot_qty')}</th>
            <th>${t('quot_unit_price')}</th>
            <th>${t('quot_item_discount')}</th>
            <th>${t('quot_item_tax')}</th>
            <th>${t('quot_item_total')}</th>
            <th></th>
          </tr></thead>
          <tbody id="items-body">
            ${items.map((item, idx) => renderItemRow(item, idx, products)).join('')}
          </tbody>
        </table>
        <button class="btn btn--ghost btn--sm add-item-btn" id="add-item"><i data-lucide="plus"></i> ${t('quot_add_item')}</button>
      </div>
      <div class="totals-panel">
        <div class="totals-row"><span>Subtotal</span><span id="t-subtotal">${formatCurrency(totals.subtotal, 'MXN')}</span></div>
        <div class="totals-row"><span>Descuento</span><span id="t-discount" class="text-danger">-${formatCurrency(totals.discountTotal, 'MXN')}</span></div>
        <div class="totals-row"><span>IVA</span><span id="t-tax">${formatCurrency(totals.taxTotal, 'MXN')}</span></div>
        <div class="totals-row totals-row--total"><span>Total</span><span id="t-total">${formatCurrency(totals.total, 'MXN')}</span></div>
      </div>`;
  };

  container.innerHTML = `
    <div class="page-header">
      <button class="btn btn--ghost btn--sm" id="back-quot"><i data-lucide="arrow-left"></i> ${t('quot_title')}</button>
      <h1 class="page-title">${!id ? t('quot_new') : t('quot_edit')}</h1>
      <div class="page-actions">
        <button class="btn btn--ghost btn--sm" id="toggle-preview"><i data-lucide="eye"></i> ${t('quot_preview')}</button>
        <button class="btn btn--secondary" id="save-draft"><i data-lucide="save"></i> Guardar borrador</button>
        <button class="btn btn--primary" id="save-quot"><i data-lucide="send"></i> Guardar y enviar</button>
      </div>
    </div>

    <div class="quot-editor" id="quot-editor">
      <div class="quot-form-panel">
        <div class="card mb-4">
          <div class="card__header"><span class="card__title">Información general</span></div>
          <div class="card__body">
            <div class="form-row form-row--3">
              <div class="form-group">
                <label class="form-label">${t('quot_folio')}</label>
                <input class="form-control mono" id="q-folio" value="${q?.folio || Store.nextQuotationFolio()}" readonly>
              </div>
              <div class="form-group">
                <label class="form-label">${t('quot_date')}</label>
                <input class="form-control" id="q-date" type="date" value="${q?.date || today()}">
              </div>
              <div class="form-group">
                <label class="form-label">${t('quot_valid_until')}</label>
                <input class="form-control" id="q-valid" type="date" value="${q?.validUntil || addDays(today(), settings.validityDays || 15)}">
              </div>
            </div>
            <div class="form-row form-row--2">
              <div class="form-group">
                <label class="form-label required">${t('quot_client')}</label>
                <select class="form-control" id="q-client">
                  <option value="">Seleccionar cliente...</option>
                  ${clients.map(c => `<option value="${c.id}" ${q?.clientId === c.id ? 'selected' : ''}>${c.name} – ${c.rfc}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">${t('quot_template')}</label>
                <select class="form-control" id="q-template">
                  <option value="">Sin plantilla</option>
                  ${templates.map(tp => `<option value="${tp.id}">${tp.name}</option>`).join('')}
                </select>
              </div>
            </div>
            <div class="form-row form-row--2">
              <div class="form-group">
                <label class="form-label">${t('quot_currency')}</label>
                <select class="form-control" id="q-currency">
                  ${CURRENCIES.map(c => `<option value="${c.code}" ${(q?.currency || settings.currency) === c.code ? 'selected' : ''}>${c.code} – ${c.name}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">${t('quot_exchange_rate')} (MXN)</label>
                <input class="form-control" id="q-exrate" type="number" value="${q?.exchangeRate || settings.exchangeRate || 17.50}" step="0.01">
              </div>
            </div>
          </div>
        </div>

        <div class="card mb-4">
          <div class="card__header"><span class="card__title">${t('quot_items')}</span></div>
          <div class="card__body p-0" id="items-container">
            ${renderItems()}
          </div>
        </div>

        <div class="card mb-4">
          <div class="card__header"><span class="card__title">Notas y condiciones</span></div>
          <div class="card__body">
            <div class="form-group">
              <label class="form-label">${t('quot_notes')}</label>
              <textarea class="form-control" id="q-notes" rows="3" placeholder="Notas adicionales...">${q?.notes || ''}</textarea>
            </div>
            <div class="form-group">
              <label class="form-label">${t('quot_terms')}</label>
              <textarea class="form-control" id="q-terms" rows="3" placeholder="Términos y condiciones...">${q?.terms || settings.defaultTerms || 'Precios sujetos a cambio sin previo aviso. Vigencia según fecha indicada.'}</textarea>
            </div>
          </div>
        </div>
      </div>

      <div class="quot-preview-panel hidden" id="preview-panel">
        <div class="preview-toolbar">
          <span class="preview-label">Vista previa en vivo</span>
          <button class="btn btn--ghost btn--sm" id="print-preview"><i data-lucide="printer"></i> ${t('btn_print')}</button>
        </div>
        <div class="preview-frame" id="preview-content"></div>
      </div>
    </div>`;

  if (window.lucide) lucide.createIcons({ nodes: [container] });

  // Bind item events
  bindItemEvents(container, items, products, settings, t);

  // Live preview update
  const updatePreview = debounce(() => {
    const previewPanel = container.querySelector('#preview-panel');
    if (previewPanel.classList.contains('hidden')) return;
    renderPreviewContent(container, items, clients, settings);
  }, 400);

  container.addEventListener('input', updatePreview);
  container.addEventListener('change', updatePreview);

  container.querySelector('#back-quot')?.addEventListener('click', () => window.App?.navigate('quotations'));
  container.querySelector('#toggle-preview')?.addEventListener('click', () => {
    const panel = container.querySelector('#preview-panel');
    const editor = container.querySelector('#quot-editor');
    panel.classList.toggle('hidden');
    editor.classList.toggle('has-preview');
    if (!panel.classList.contains('hidden')) renderPreviewContent(container, items, clients, settings);
  });
  container.querySelector('#print-preview')?.addEventListener('click', () => printQuotation(container, items, clients, settings));
  container.querySelector('#save-draft')?.addEventListener('click', () => saveQuotation(container, items, q, 'draft'));
  container.querySelector('#save-quot')?.addEventListener('click', () => saveQuotation(container, items, q, 'sent'));
  container.querySelector('#q-template')?.addEventListener('change', e => {
    const tmpl = Store.getTemplates().find(t => t.id === e.target.value);
    if (tmpl?.items) {
      items.splice(0, items.length, ...JSON.parse(JSON.stringify(tmpl.items)));
      container.querySelector('#items-container').innerHTML = renderItems();
      if (window.lucide) lucide.createIcons({ nodes: [container.querySelector('#items-container')] });
      bindItemEvents(container, items, products, settings, t);
    }
  });
}

function newItem(settings) {
  return { id: uid(), productId: '', description: '', qty: 1, unit: 'Servicio', unitPrice: 0, discount: 0, taxRate: settings?.iva || 16, claveProdServ: '', claveUnidad: 'E48' };
}

function renderItemRow(item, idx, products) {
  const base = (item.qty || 0) * (item.unitPrice || 0);
  const disc = base * ((item.discount || 0) / 100);
  const total = (base - disc) * (1 + (item.taxRate || 0) / 100);
  return `<tr data-idx="${idx}" class="item-row">
    <td>
      <select class="form-control form-control--sm item-product" data-idx="${idx}">
        <option value="">Seleccionar...</option>
        ${products.map(p => `<option value="${p.id}" ${item.productId === p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
        <option value="__custom__">— Personalizado —</option>
      </select>
    </td>
    <td><input class="form-control form-control--sm item-desc" data-idx="${idx}" value="${item.description || ''}"></td>
    <td><input class="form-control form-control--sm item-qty text-right" data-idx="${idx}" type="number" value="${item.qty || 1}" min="0.001" step="0.001" style="width:70px"></td>
    <td><input class="form-control form-control--sm item-price text-right" data-idx="${idx}" type="number" value="${item.unitPrice || 0}" min="0" step="0.01" style="width:100px"></td>
    <td><input class="form-control form-control--sm item-disc text-right" data-idx="${idx}" type="number" value="${item.discount || 0}" min="0" max="100" style="width:65px"></td>
    <td><input class="form-control form-control--sm item-tax text-right" data-idx="${idx}" type="number" value="${item.taxRate ?? 16}" min="0" max="100" style="width:65px"></td>
    <td class="text-right item-total-cell" data-idx="${idx}">$${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
    <td><button class="btn-icon btn-icon--danger btn--sm item-delete" data-idx="${idx}"><i data-lucide="x"></i></button></td>
  </tr>`;
}

function bindItemEvents(container, items, products, settings, t) {
  const body = container.querySelector('#items-body');
  if (!body) return;
  if (window.lucide) lucide.createIcons({ nodes: [body] });

  const recalc = () => {
    const totals = calcQuotationTotals(items);
    const currency = container.querySelector('#q-currency')?.value || 'MXN';
    container.querySelector('#t-subtotal').textContent = formatCurrency(totals.subtotal, currency);
    container.querySelector('#t-discount').textContent = '-' + formatCurrency(totals.discountTotal, currency);
    container.querySelector('#t-tax').textContent = formatCurrency(totals.taxTotal, currency);
    container.querySelector('#t-total').textContent = formatCurrency(totals.total, currency);
    // update each row total
    items.forEach((item, idx) => {
      const base = (item.qty || 0) * (item.unitPrice || 0);
      const disc = base * ((item.discount || 0) / 100);
      const total = (base - disc) * (1 + (item.taxRate || 0) / 100);
      const cell = body.querySelector(`[data-idx="${idx}"].item-total-cell`);
      if (cell) cell.textContent = '$' + total.toLocaleString('es-MX', { minimumFractionDigits: 2 });
    });
  };

  body.addEventListener('change', e => {
    const target = e.target;
    const idx = parseInt(target.dataset.idx);
    if (isNaN(idx)) return;
    if (target.classList.contains('item-product')) {
      const prod = products.find(p => p.id === target.value);
      if (prod && target.value !== '__custom__') {
        items[idx].productId = prod.id;
        items[idx].description = prod.name;
        items[idx].unitPrice = prod.price;
        items[idx].unit = prod.unit;
        items[idx].taxRate = prod.taxRate;
        items[idx].claveProdServ = prod.claveProdServ;
        items[idx].claveUnidad = prod.claveUnidad;
        // Re-render row
        const row = body.querySelector(`tr[data-idx="${idx}"]`);
        if (row) { row.outerHTML = renderItemRow(items[idx], idx, products); bindItemEvents(container, items, products, settings, t); return; }
      }
    }
    if (target.classList.contains('item-desc')) items[idx].description = target.value;
    if (target.classList.contains('item-qty')) items[idx].qty = parseFloat(target.value) || 0;
    if (target.classList.contains('item-price')) items[idx].unitPrice = parseFloat(target.value) || 0;
    if (target.classList.contains('item-disc')) items[idx].discount = parseFloat(target.value) || 0;
    if (target.classList.contains('item-tax')) items[idx].taxRate = parseFloat(target.value) || 0;
    recalc();
  });

  body.addEventListener('input', e => {
    const target = e.target;
    const idx = parseInt(target.dataset.idx);
    if (isNaN(idx)) return;
    if (target.classList.contains('item-desc')) items[idx].description = target.value;
    if (target.classList.contains('item-qty')) { items[idx].qty = parseFloat(target.value) || 0; recalc(); }
    if (target.classList.contains('item-price')) { items[idx].unitPrice = parseFloat(target.value) || 0; recalc(); }
    if (target.classList.contains('item-disc')) { items[idx].discount = parseFloat(target.value) || 0; recalc(); }
    if (target.classList.contains('item-tax')) { items[idx].taxRate = parseFloat(target.value) || 0; recalc(); }
  });

  body.addEventListener('click', e => {
    const btn = e.target.closest('.item-delete');
    if (!btn) return;
    const idx = parseInt(btn.dataset.idx);
    if (items.length > 1) {
      items.splice(idx, 1);
      body.innerHTML = items.map((item, i) => renderItemRow(item, i, products)).join('');
      bindItemEvents(container, items, products, settings, t);
      recalc();
    }
  });

  container.querySelector('#add-item')?.addEventListener('click', () => {
    items.push(newItem(settings));
    body.innerHTML = items.map((item, i) => renderItemRow(item, i, products)).join('');
    bindItemEvents(container, items, products, settings, t);
    if (window.lucide) lucide.createIcons({ nodes: [body] });
    recalc();
  });
}

function saveQuotation(container, items, existing, status) {
  const t = I18n.t.bind(I18n);
  const clientId = container.querySelector('#q-client')?.value;
  if (!clientId) { showToast('Selecciona un cliente', 'error'); return; }
  const totals = calcQuotationTotals(items);
  const history = existing?.history ? [...existing.history] : [];
  if (!existing || existing.status !== status) history.push({ date: new Date().toISOString(), event: status === 'draft' ? 'Guardado como borrador' : 'Enviada al cliente' });

  const q = {
    id: existing?.id || uid(),
    folio: container.querySelector('#q-folio')?.value || Store.nextQuotationFolio(),
    date: container.querySelector('#q-date')?.value || today(),
    validUntil: container.querySelector('#q-valid')?.value,
    clientId,
    currency: container.querySelector('#q-currency')?.value || 'MXN',
    exchangeRate: parseFloat(container.querySelector('#q-exrate')?.value) || 17.5,
    notes: container.querySelector('#q-notes')?.value || '',
    terms: container.querySelector('#q-terms')?.value || '',
    items: items.map(i => ({ ...i })),
    subtotal: totals.subtotal, discountTotal: totals.discountTotal, taxTotal: totals.taxTotal, total: totals.total,
    status, history, updatedAt: new Date().toISOString(),
    createdAt: existing?.createdAt || new Date().toISOString(),
  };

  Store.upsertQuotation(q);
  showToast(t('success_saved'));
  window.App?.navigate('quotations', { action: 'view', id: q.id });
}

// ─── VIEW ──────────────────────────────────────────────────────────────────────
function renderQuotationView(container, id) {
  const t = I18n.t.bind(I18n);
  const q = Store.getQuotation(id);
  if (!q) { container.innerHTML = '<p>Cotización no encontrada</p>'; return; }
  const client = Store.getClients().find(c => c.id === q.clientId);
  const company = Store.getCompany();
  const settings = Store.getSettings();
  const actions = getStatusActions(q.status);

  container.innerHTML = `
    <div class="page-header">
      <button class="btn btn--ghost btn--sm" id="back-quot"><i data-lucide="arrow-left"></i> ${t('quot_title')}</button>
      <h1 class="page-title">${q.folio} <span class="badge badge--${q.status} badge--lg">${t(`status_${q.status}`)}</span></h1>
      <div class="page-actions">
        ${actions.map(a => `<button class="btn btn--${a.style}" data-action="${a.action}"><i data-lucide="${a.icon}"></i> ${a.label}</button>`).join('')}
        <button class="btn btn--ghost btn--sm" id="btn-whatsapp" title="Compartir por WhatsApp"><i data-lucide="message-circle"></i> WhatsApp</button>
        <button class="btn btn--ghost btn--sm" id="btn-email" title="Enviar por correo"><i data-lucide="mail"></i> Correo</button>
        <button class="btn btn--ghost btn--sm" id="print-quot"><i data-lucide="printer"></i> ${t('btn_print')}</button>
        ${q.status === 'draft' || q.status === 'sent' ? `
          <button class="btn btn--primary" id="send-link-btn">
            <i data-lucide="link"></i> Enviar link
          </button>` : ''}
        ${q.publicToken ? `
          <div class="link-badge">
            <i data-lucide="link-2"></i>
            ${q.viewedAt ? '👁 Vista' : 'Enviada'}
          </div>` : ''}
      </div>
    </div>

    <div class="view-grid">
      <div class="card">
        <div class="card__header"><span class="card__title">Detalle de la cotización</span></div>
        <div class="card__body p-0">
          ${buildDocumentPreview(q, client, company, settings)}
        </div>
      </div>

      <div class="side-panel">
        <div class="card mb-4">
          <div class="card__header"><span class="card__title"><i data-lucide="info"></i> Resumen</span></div>
          <div class="card__body">
            <dl class="info-list">
              <dt>Folio</dt><dd class="mono">${q.folio}</dd>
              <dt>Fecha</dt><dd>${formatDate(q.date)}</dd>
              <dt>Válida hasta</dt><dd>${formatDate(q.validUntil)}</dd>
              <dt>Moneda</dt><dd>${q.currency}</dd>
              <dt>Total</dt><dd class="text-xl font-bold">${formatCurrency(q.total, q.currency)}</dd>
            </dl>
          </div>
        </div>
        <div class="card">
          <div class="card__header"><span class="card__title"><i data-lucide="clock"></i> ${t('quot_history')}</span></div>
          <div class="card__body p-0">
            <div class="timeline">
              ${(q.history || []).map(h => `
                <div class="timeline-item">
                  <div class="timeline-dot"></div>
                  <div class="timeline-content">
                    <p class="timeline-event">${h.event}</p>
                    <span class="timeline-date">${new Date(h.date).toLocaleString('es-MX')}</span>
                  </div>
                </div>`).join('') || '<p class="text-muted p-4">Sin historial</p>'}
            </div>
          </div>
        </div>
      </div>
    </div>`;

  if (window.lucide) lucide.createIcons({ nodes: [container] });

  container.querySelector('#back-quot')?.addEventListener('click', () => window.App?.navigate('quotations'));
  container.querySelector('#print-quot')?.addEventListener('click', () => printDocumentFromHtml(buildDocumentPreview(q, client, company, settings), q.folio));
  container.querySelector('#btn-whatsapp')?.addEventListener('click', () => sendWhatsApp(q, client, company, settings));
  container.querySelector('#btn-email')?.addEventListener('click', () => sendEmail(q, client, company, settings));
  container.querySelector('#send-link-btn')?.addEventListener('click', () => {
    sendPublicLink(q, container, {});
  });

  container.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      if (action === 'approve') updateStatus(q, 'approved', container, id);
      if (action === 'reject') updateStatus(q, 'rejected', container, id);
      if (action === 'send') updateStatus(q, 'sent', container, id);
      if (action === 'edit') window.App?.navigate('quotations', { action: 'edit', id });
      if (action === 'convert') window.App?.navigate('invoices', { action: 'new', fromQuotation: id });
      if (action === 'duplicate') duplicateQuotation(id, container, {});
    });
  });
}

function updateStatus(q, status, container, id) {
  const event = { draft: 'Guardado como borrador', sent: 'Enviada al cliente', approved: 'Aprobada', rejected: 'Rechazada' }[status] || status;
  q.status = status;
  q.history = [...(q.history || []), { date: new Date().toISOString(), event }];
  Store.upsertQuotation(q);
  showToast(`Estado actualizado: ${event}`);
  renderQuotationView(container, id);
}

function getStatusActions(status) {
  const t = I18n.t.bind(I18n);
  const map = {
    draft: [
      { action: 'edit', label: t('btn_edit'), style: 'ghost btn--sm', icon: 'pencil' },
      { action: 'send', label: t('quot_send'), style: 'primary', icon: 'send' },
    ],
    sent: [
      { action: 'edit', label: t('btn_edit'), style: 'ghost btn--sm', icon: 'pencil' },
      { action: 'approve', label: t('quot_approve'), style: 'success', icon: 'check' },
      { action: 'reject', label: t('quot_reject'), style: 'danger', icon: 'x' },
    ],
    approved: [
      { action: 'convert', label: t('quot_convert'), style: 'primary', icon: 'receipt' },
      { action: 'duplicate', label: t('quot_duplicate'), style: 'ghost btn--sm', icon: 'copy' },
    ],
    rejected: [
      { action: 'duplicate', label: t('quot_duplicate'), style: 'ghost btn--sm', icon: 'copy' },
    ],
    invoiced: [],
  };
  return map[status] || [];
}

function buildDocumentPreview(q, client, company, settings) {
  const items = q.items || [];
  return `
    <div class="document-preview" id="document-content">
      <div class="doc-header">
        <div class="doc-company">
          ${company.logo ? `<img src="${company.logo}" class="doc-logo">` : `<div class="doc-logo-placeholder">${(company.name || 'E')[0]}</div>`}
          <div class="doc-company-info">
            <h2>${company.name || 'Mi Empresa'}</h2>
            <p>RFC: ${company.rfc || '—'}</p>
            <p>${company.domicilioFiscal || ''}</p>
            <p>${company.email || ''} ${company.telefono ? '· ' + company.telefono : ''}</p>
          </div>
        </div>
        <div class="doc-meta">
          <h1 class="doc-type">COTIZACIÓN</h1>
          <table class="doc-meta-table">
            <tr><td>Folio:</td><td class="mono">${q.folio}</td></tr>
            <tr><td>Fecha:</td><td>${formatDate(q.date)}</td></tr>
            <tr><td>Válida hasta:</td><td>${formatDate(q.validUntil)}</td></tr>
            <tr><td>Moneda:</td><td>${q.currency}</td></tr>
          </table>
        </div>
      </div>

      <div class="doc-client">
        <div class="doc-section-label">CLIENTE</div>
        <h3>${client?.name || '—'}</h3>
        <p>RFC: ${client?.rfc || '—'}</p>
        <p>${client?.address || ''}</p>
        <p>${client?.email || ''}</p>
      </div>

      <table class="doc-items">
        <thead><tr>
          <th>#</th><th>Descripción</th><th>Cant.</th><th>P. Unit.</th><th>Desc.</th><th>IVA</th><th>Total</th>
        </tr></thead>
        <tbody>
          ${items.map((item, i) => {
            const base = (item.qty || 0) * (item.unitPrice || 0);
            const disc = base * ((item.discount || 0) / 100);
            const taxAmt = (base - disc) * ((item.taxRate || 0) / 100);
            const total = base - disc + taxAmt;
            return `<tr>
              <td>${i + 1}</td>
              <td>${item.description || ''}</td>
              <td class="text-right">${item.qty}</td>
              <td class="text-right">$${(item.unitPrice || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
              <td class="text-right">${item.discount || 0}%</td>
              <td class="text-right">${item.taxRate || 0}%</td>
              <td class="text-right">$${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>

      <div class="doc-totals">
        <div class="doc-totals-row"><span>Subtotal</span><span>$${(q.subtotal || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></div>
        ${(q.discountTotal || 0) > 0 ? `<div class="doc-totals-row"><span>Descuento</span><span>-$${(q.discountTotal || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></div>` : ''}
        <div class="doc-totals-row"><span>IVA 16%</span><span>$${(q.taxTotal || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></div>
        <div class="doc-totals-row doc-totals-row--grand"><span>Total</span><span>$${(q.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })} ${q.currency}</span></div>
      </div>

      ${q.notes ? `<div class="doc-notes"><div class="doc-section-label">NOTAS</div><p>${q.notes}</p></div>` : ''}
      ${q.terms ? `<div class="doc-terms"><div class="doc-section-label">TÉRMINOS Y CONDICIONES</div><p>${q.terms}</p></div>` : ''}

      ${company.cuenta ? `<div class="doc-payment"><div class="doc-section-label">DATOS DE PAGO</div><p>${company.banco ? company.banco + ' · ' : ''}${company.cuenta}</p></div>` : ''}

      <div class="doc-footer">
        <p>Documento generado el ${new Date().toLocaleString('es-MX')}</p>
      </div>
    </div>`;
}

function renderPreviewContent(container, items, clients, settings) {
  const previewContent = container.querySelector('#preview-content');
  if (!previewContent) return;
  const clientId = container.querySelector('#q-client')?.value;
  const client = clients.find(c => c.id === clientId);
  const company = Store.getCompany();
  const totals = calcQuotationTotals(items);
  const fakeQ = {
    folio: container.querySelector('#q-folio')?.value,
    date: container.querySelector('#q-date')?.value,
    validUntil: container.querySelector('#q-valid')?.value,
    currency: container.querySelector('#q-currency')?.value || 'MXN',
    notes: container.querySelector('#q-notes')?.value,
    terms: container.querySelector('#q-terms')?.value,
    items, ...totals,
  };
  previewContent.innerHTML = buildDocumentPreview(fakeQ, client, company, settings);
}

function printDocumentFromHtml(html, title = 'documento') {
  const w = window.open('', '_blank', 'width=900,height=700');
  w.document.write(`<!DOCTYPE html><html><head><title>${title}</title><style>
    body { font-family: Arial, sans-serif; color: #111; margin: 0; padding: 20px; }
    .document-preview { max-width: 800px; margin: 0 auto; }
    .doc-header { display: flex; justify-content: space-between; margin-bottom: 24px; }
    .doc-company h2 { margin: 0 0 4px; } .doc-company p { margin: 2px 0; font-size: 12px; color: #555; }
    .doc-type { font-size: 28px; margin: 0 0 8px; color: #111; }
    .doc-meta-table td { padding: 2px 8px; font-size: 13px; }
    .doc-client { background: #f5f5f5; padding: 12px; border-radius: 6px; margin-bottom: 20px; }
    .doc-client h3 { margin: 0 0 4px; } .doc-client p { margin: 2px 0; font-size: 12px; color: #555; }
    .doc-section-label { font-size: 10px; font-weight: 700; letter-spacing: 1px; color: #888; margin-bottom: 4px; }
    .doc-items { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    .doc-items th { background: #111; color: #fff; padding: 8px; text-align: left; font-size: 12px; }
    .doc-items td { padding: 8px; border-bottom: 1px solid #eee; font-size: 13px; }
    .doc-items .text-right { text-align: right; }
    .doc-totals { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; margin-bottom: 16px; }
    .doc-totals-row { display: flex; gap: 24px; font-size: 13px; }
    .doc-totals-row--grand { font-weight: 700; font-size: 16px; border-top: 2px solid #111; padding-top: 6px; }
    .doc-notes, .doc-terms, .doc-payment { margin-top: 16px; font-size: 12px; color: #555; }
    .doc-footer { margin-top: 32px; text-align: center; font-size: 10px; color: #999; }
    .doc-logo { max-height: 60px; } .doc-logo-placeholder { width: 60px; height: 60px; background: #6366f1; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 700; border-radius: 8px; }
    @media print { @page { margin: 1cm; } }
  </style></head><body>${html}<script>window.onload=()=>setTimeout(()=>{window.print();window.close()},300)<\/script></body></html>`);
  w.document.close();
}

function printQuotation(container, items, clients, settings) {
  const clientId = container.querySelector('#q-client')?.value;
  const client = clients.find(c => c.id === clientId);
  const company = Store.getCompany();
  const totals = calcQuotationTotals(items);
  const fakeQ = {
    folio: container.querySelector('#q-folio')?.value,
    date: container.querySelector('#q-date')?.value,
    validUntil: container.querySelector('#q-valid')?.value,
    currency: container.querySelector('#q-currency')?.value || 'MXN',
    notes: container.querySelector('#q-notes')?.value,
    terms: container.querySelector('#q-terms')?.value,
    items, ...totals,
  };
  printDocumentFromHtml(buildDocumentPreview(fakeQ, client, company, settings), fakeQ.folio);
}

// ─── PDF HELPERS ───────────────────────────────────────────────────────────────
const PDF_STYLES = `
  *{box-sizing:border-box;margin:0;padding:0}
  body,div{font-family:Arial,sans-serif;color:#111}
  .document-preview{width:760px;padding:28px;background:#fff;font-family:Arial,sans-serif;color:#111}
  .doc-header{display:flex;justify-content:space-between;gap:16px;margin-bottom:22px;align-items:flex-start}
  .doc-company h2{margin:0 0 4px;font-size:17px;color:#111}
  .doc-company p{margin:2px 0;font-size:11px;color:#555}
  .doc-type{font-size:26px;font-weight:700;margin:0 0 8px;color:#111;text-align:right}
  .doc-meta{text-align:right}
  .doc-meta-table{margin-left:auto}
  .doc-meta-table td{padding:2px 8px;font-size:12px;color:#333}
  .doc-client{background:#f5f5f5;padding:12px 16px;border-radius:6px;margin-bottom:18px}
  .doc-client h3{margin:0 0 4px;font-size:14px;color:#111}
  .doc-client p{margin:2px 0;font-size:11px;color:#555}
  .doc-section-label{font-size:9px;font-weight:700;letter-spacing:1.5px;color:#999;margin-bottom:5px;text-transform:uppercase}
  .doc-items{width:100%;border-collapse:collapse;margin-bottom:14px}
  .doc-items th{background:#1e1e2e;color:#fff;padding:7px 10px;text-align:left;font-size:11px;font-weight:600}
  .doc-items td{padding:6px 10px;border-bottom:1px solid #eee;font-size:12px;color:#111}
  .text-right{text-align:right}
  .doc-totals{display:flex;flex-direction:column;align-items:flex-end;gap:3px;margin-bottom:14px}
  .doc-totals-row{display:flex;gap:32px;font-size:12px;color:#333}
  .doc-totals-row--grand{font-weight:700;font-size:15px;border-top:2px solid #111;padding-top:5px;color:#111}
  .doc-notes,.doc-terms,.doc-payment{margin-top:12px;font-size:11px;color:#555}
  .doc-footer{margin-top:24px;text-align:center;font-size:10px;color:#bbb;border-top:1px solid #eee;padding-top:8px}
  .doc-logo{max-height:54px;max-width:180px;object-fit:contain}
  .doc-logo-placeholder{width:54px;height:54px;background:#6366f1;color:#fff;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:700;border-radius:8px}
`;

async function _generatePDFBlob(q, client, company, settings) {
  if (!window.html2pdf) throw new Error('html2pdf no está disponible. Verifica tu conexión a internet.');
  const html = buildDocumentPreview(q, client, company, settings);
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:fixed;left:-9999px;top:0;width:760px;background:#fff';
  wrap.innerHTML = `<style>${PDF_STYLES}</style>${html}`;
  document.body.appendChild(wrap);
  const el = wrap.querySelector('.document-preview') || wrap;
  try {
    return await html2pdf().set({
      margin: [10, 10, 10, 10],
      image: { type: 'jpeg', quality: 0.93 },
      html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    }).from(el).outputPdf('blob');
  } finally {
    document.body.removeChild(wrap);
  }
}

function _downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function _buildWAMessage(q, client, company) {
  const items = (q.items || []).map(item => {
    const base = (item.qty || 0) * (item.unitPrice || 0);
    const disc = base * ((item.discount || 0) / 100);
    const total = (base - disc) * (1 + (item.taxRate || 0) / 100);
    return `• ${item.description || 'Concepto'} (x${item.qty}) — $${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
  }).join('\n');
  const lines = [
    `Hola${client?.name ? ' ' + client.name : ''} 👋`,
    '',
    `Te compartimos la cotización *${q.folio}* de *${company.name || 'nuestra empresa'}*.`,
    '',
    '📋 *Conceptos:*',
    items,
    '',
    `💰 *Total: ${formatCurrency(q.total, q.currency)}*`,
    `📅 Válida hasta: ${formatDate(q.validUntil)}`,
  ];
  if (q.notes) lines.push('', `📝 ${q.notes}`);
  lines.push('', 'Para cualquier duda, estamos a tus órdenes.');
  if (company.email) lines.push(company.email);
  if (company.telefono) lines.push(company.telefono);
  return lines.join('\n');
}

function _setBtnLoading(btn, text) {
  if (!btn) return;
  btn.disabled = true;
  btn._origHTML = btn.innerHTML;
  btn.innerHTML = `<i data-lucide="loader-2" class="spin"></i> ${text}`;
  if (window.lucide) lucide.createIcons({ nodes: [btn] });
}

function _resetBtn(btn) {
  if (!btn) return;
  btn.disabled = false;
  if (btn._origHTML) { btn.innerHTML = btn._origHTML; btn._origHTML = null; }
  if (window.lucide) lucide.createIcons({ nodes: [btn] });
}

function _markSentHistory(q, event) {
  const wasSent = q.status !== 'draft';
  if (!wasSent) q.status = 'sent';
  q.history = [...(q.history || []), { date: new Date().toISOString(), event }];
  Store.upsertQuotation(q);
}

// ─── WHATSAPP ──────────────────────────────────────────────────────────────────
async function sendWhatsApp(q, client, company, settings) {
  const btn = document.getElementById('btn-whatsapp');
  _setBtnLoading(btn, 'Generando PDF...');
  const filename = `Cotizacion_${q.folio}.pdf`;
  const message = _buildWAMessage(q, client, company);
  try {
    const blob = await _generatePDFBlob(q, client, company, settings);
    const file = new File([blob], filename, { type: 'application/pdf' });

    // Mobile: Web Share API — opens system share sheet (WhatsApp, etc.)
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ title: `Cotización ${q.folio}`, text: message, files: [file] });
      _markSentHistory(q, 'Enviada por WhatsApp');
      showToast('Cotización compartida ✓');
    } else {
      // Desktop fallback: download PDF + open WhatsApp Web with message
      _downloadBlob(blob, filename);
      const phone = client?.phone?.replace(/\D/g, '') || '';
      const url = phone
        ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
        : `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
      _markSentHistory(q, 'Enviada por WhatsApp');
      showToast('PDF descargado · adjúntalo en el chat de WhatsApp');
    }
  } catch (err) {
    if (err?.name !== 'AbortError') {
      console.error('WhatsApp PDF error:', err);
      showToast('Error al generar PDF: ' + err.message, 'error');
    }
  } finally {
    _resetBtn(btn);
  }
}

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

export { buildDocumentPreview, printDocumentFromHtml };
