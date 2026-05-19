import Store from '../store.js';
import I18n from '../i18n.js';
import { uid, today, formatDate, calcQuotationTotals, showToast, confirmDialog, generateUUID, generateSello, generateNoCertificado, generateCadenaOriginal, generateQRData, generateCFDIXml, downloadFile, formatCurrency, debounce, escapeHTML } from '../utils.js';
import { REGIMENES_FISCALES, USOS_CFDI, METODOS_PAGO, FORMAS_PAGO, CURRENCIES, numberToWords } from '../catalogs.js';
import { buildDocumentPreview, printDocumentFromHtml } from './quotations.js';

let invsFilter = '';

export function renderInvoices(container, params = {}) {
  const t = I18n.t.bind(I18n);
  if (params.action === 'new' || params.action === 'edit') return renderInvoiceForm(container, params.id, params.fromQuotation);
  if (params.action === 'view') return renderInvoiceView(container, params.id);

  const clients = Store.getClients();
  const allInv = Store.getInvoices();
  const invoices = allInv
    .filter(i => !invsFilter || i.status === invsFilter)
    .sort((a, b) => (b.date || '') > (a.date || '') ? 1 : -1);

  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">${t('inv_title')}</h1>
      <div class="page-actions">
        <button class="btn btn--primary" id="new-inv"><i data-lucide="file-plus"></i> ${t('inv_new')}</button>
      </div>
    </div>

    <div class="toolbar">
      <div class="status-filters">
        <button class="status-filter ${!invsFilter ? 'active' : ''}" data-status="">Todos (${allInv.length})</button>
        ${['draft','stamped','paid','cancelled'].map(s => `<button class="status-filter ${invsFilter === s ? 'active' : ''}" data-status="${s}">${t(`status_${s}`)} (${allInv.filter(i => i.status === s).length})</button>`).join('')}
      </div>
    </div>

    <div class="card p-0">
      ${invoices.length ? `
      <table class="table">
        <thead><tr>
          <th>${t('inv_folio')}</th>
          <th>UUID</th>
          <th>${t('quot_client')}</th>
          <th>${t('quot_date')}</th>
          <th>${t('inv_metodo_pago')}</th>
          <th>${t('quot_total')}</th>
          <th>Estado</th>
          <th class="text-center">Acciones</th>
        </tr></thead>
        <tbody>
          ${invoices.map(inv => {
            const client = clients.find(c => c.id === inv.clientId);
            return `<tr>
              <td><span class="mono link-cell" data-action="view" data-id="${inv.id}">${escapeHTML(inv.folio || '')}</span></td>
              <td><span class="mono text-xs">${inv.uuid ? escapeHTML(inv.uuid.slice(0, 8)) + '…' : '—'}</span></td>
              <td>${escapeHTML(client?.name || '—')}</td>
              <td>${formatDate(inv.date)}</td>
              <td><span class="badge badge--${inv.metodoPago === 'PUE' ? 'approved' : 'sent'}">${inv.metodoPago || '—'}</span></td>
              <td>${formatCurrency(inv.total, inv.currency)}</td>
              <td><span class="badge badge--${inv.status}">${t(`status_${inv.status}`)}</span></td>
              <td class="text-center">
                <div class="action-buttons">
                  <button class="btn-icon" title="Ver" data-action="view" data-id="${inv.id}"><i data-lucide="eye"></i></button>
                  ${inv.status === 'draft' ? `<button class="btn-icon btn-icon--success" title="Timbrar" data-action="stamp" data-id="${inv.id}"><i data-lucide="stamp"></i></button>` : ''}
                  ${inv.status === 'stamped' ? `
                    <button class="btn-icon" title="PDF" data-action="pdf" data-id="${inv.id}"><i data-lucide="file-text"></i></button>
                    <button class="btn-icon" title="XML" data-action="xml" data-id="${inv.id}"><i data-lucide="code-2"></i></button>
                  ` : ''}
                  ${inv.status !== 'cancelled' ? `<button class="btn-icon btn-icon--danger" title="Cancelar" data-action="cancel" data-id="${inv.id}"><i data-lucide="x-circle"></i></button>` : ''}
                </div>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>` : `
      <div class="empty-state">
        <i data-lucide="receipt" class="empty-state__icon"></i>
        <h3>Sin facturas</h3>
        <p>Las facturas timbradas aparecerán aquí</p>
      </div>`}
    </div>`;

  if (window.lucide) lucide.createIcons({ nodes: [container] });

  container.querySelector('#new-inv')?.addEventListener('click', () => window.App?.navigate('invoices', { action: 'new' }));
  container.querySelectorAll('.status-filter').forEach(btn => {
    btn.addEventListener('click', () => { invsFilter = btn.dataset.status; renderInvoices(container, params); });
  });
  container.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const { action, id } = btn.dataset;
      const inv = Store.getInvoice(id);
      if (action === 'view') window.App?.navigate('invoices', { action: 'view', id });
      if (action === 'stamp') stampInvoice(id, container, params);
      if (action === 'pdf') downloadInvoicePDF(inv);
      if (action === 'xml') {
        const company = Store.getCompany();
        downloadFile(`CFDI_${inv.folio}_${inv.uuid?.slice(0, 8)}.xml`, generateCFDIXml(inv, company));
      }
      if (action === 'cancel') {
        if (await confirmDialog('¿Cancelar esta factura? Esta acción es irreversible.')) {
          inv.status = 'cancelled';
          inv.cancelledAt = new Date().toISOString();
          Store.upsertInvoice(inv);
          showToast('Factura cancelada');
          renderInvoices(container, params);
        }
      }
    });
  });
}

function stampInvoice(id, container, params) {
  const inv = Store.getInvoice(id);
  if (!inv) return;
  inv.uuid = generateUUID();
  inv.sello = generateSello();
  inv.noCertificado = generateNoCertificado();
  inv.status = 'stamped';
  inv.stampedAt = new Date().toISOString();
  inv.cadenaOriginal = generateCadenaOriginal(inv, Store.getCompany());
  inv.qrData = generateQRData(inv);
  Store.upsertInvoice(inv);
  // If came from quotation, mark as invoiced
  if (inv.quotationId) {
    const q = Store.getQuotation(inv.quotationId);
    if (q) { q.status = 'invoiced'; q.history = [...(q.history || []), { date: new Date().toISOString(), event: 'Convertida a factura' }]; Store.upsertQuotation(q); }
  }
  showToast('Factura timbrada correctamente (simulado)');
  window.App?.navigate('invoices', { action: 'view', id });
}

// ─── FORM ─────────────────────────────────────────────────────────────────────
function renderInvoiceForm(container, id, fromQuotationId) {
  const t = I18n.t.bind(I18n);
  const existing = id ? Store.getInvoice(id) : null;
  const fromQ = fromQuotationId ? Store.getQuotation(fromQuotationId) : null;
  const base = existing || fromQ || {};
  const clients = Store.getClients();
  const settings = Store.getSettings();
  const company = Store.getCompany();

  const clientId = base.clientId || '';
  const client = clients.find(c => c.id === clientId);

  let items = base.items ? JSON.parse(JSON.stringify(base.items)) : [{ id: uid(), description: '', qty: 1, unit: 'Servicio', unitPrice: 0, discount: 0, taxRate: settings.iva || 16, claveProdServ: '81111501', claveUnidad: 'E48' }];

  container.innerHTML = `
    <div class="page-header">
      <button class="btn btn--ghost btn--sm" id="back-inv"><i data-lucide="arrow-left"></i> ${t('inv_title')}</button>
      <h1 class="page-title">${existing ? 'Editar factura' : t('inv_new')}${fromQ ? ` · desde ${fromQ.folio}` : ''}</h1>
      <div class="page-actions">
        <button class="btn btn--secondary" id="save-inv-draft"><i data-lucide="save"></i> Guardar borrador</button>
        <button class="btn btn--primary" id="stamp-inv"><i data-lucide="stamp"></i> ${t('inv_stamp')}</button>
      </div>
    </div>

    <div class="form-grid form-grid--inv">
      <div class="inv-main">
        <div class="card mb-4">
          <div class="card__header"><span class="card__title">Datos del comprobante</span></div>
          <div class="card__body">
            <div class="form-row form-row--3">
              <div class="form-group">
                <label class="form-label">Folio</label>
                <input class="form-control mono" id="i-folio" value="${existing?.folio || Store.nextInvoiceFolio()}" readonly>
              </div>
              <div class="form-group">
                <label class="form-label">Fecha</label>
                <input class="form-control" id="i-date" type="date" value="${base.date || today()}">
              </div>
              <div class="form-group">
                <label class="form-label">${t('quot_currency')}</label>
                <select class="form-control" id="i-currency">
                  ${CURRENCIES.map(c => `<option value="${c.code}" ${(base.currency || 'MXN') === c.code ? 'selected' : ''}>${c.code}</option>`).join('')}
                </select>
              </div>
            </div>
            <div class="form-row form-row--2">
              <div class="form-group">
                <label class="form-label required">${t('inv_metodo_pago')}</label>
                <select class="form-control" id="i-metodo">
                  ${METODOS_PAGO.map(m => `<option value="${m.clave}" ${(base.metodoPago || 'PUE') === m.clave ? 'selected' : ''}>${m.clave} – ${m.descripcion}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label required">${t('inv_forma_pago')}</label>
                <select class="form-control" id="i-forma">
                  ${FORMAS_PAGO.map(f => `<option value="${f.clave}" ${(base.formaPago || '03') === f.clave ? 'selected' : ''}>${f.clave} – ${f.descripcion}</option>`).join('')}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div class="card mb-4">
          <div class="card__header"><span class="card__title">Receptor (cliente)</span></div>
          <div class="card__body">
            <div class="form-row form-row--2">
              <div class="form-group">
                <label class="form-label required">Cliente</label>
                <select class="form-control" id="i-client">
                  <option value="">Seleccionar cliente...</option>
                  ${clients.map(c => `<option value="${c.id}" data-rfc="${c.rfc}" data-regimen="${c.regimenFiscal}" data-uso="${c.usoCFDI}" data-cp="${c.cp || ''}" ${clientId === c.id ? 'selected' : ''}>${c.name} – ${c.rfc}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label required">${t('inv_uso_cfdi')}</label>
                <select class="form-control" id="i-uso">
                  ${USOS_CFDI.map(u => `<option value="${u.clave}" ${(base.usoCFDI || client?.usoCFDI || 'G03') === u.clave ? 'selected' : ''}>${u.clave} – ${u.descripcion}</option>`).join('')}
                </select>
              </div>
            </div>
            <div class="form-row form-row--2">
              <div class="form-group">
                <label class="form-label">RFC receptor</label>
                <input class="form-control mono" id="i-client-rfc" value="${base.clientRfc || client?.rfc || ''}" readonly>
              </div>
              <div class="form-group">
                <label class="form-label">Régimen fiscal receptor</label>
                <select class="form-control" id="i-client-regimen">
                  ${REGIMENES_FISCALES.map(r => `<option value="${r.clave}" ${(base.clientRegimen || client?.regimenFiscal || '601') === r.clave ? 'selected' : ''}>${r.clave} – ${r.descripcion}</option>`).join('')}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div class="card mb-4">
          <div class="card__header"><span class="card__title">Conceptos</span></div>
          <div class="card__body p-0" id="inv-items-container">
            ${renderInvItems(items)}
          </div>
          <div class="card__footer">
            <button class="btn btn--ghost btn--sm" id="add-inv-item"><i data-lucide="plus"></i> Agregar concepto</button>
          </div>
        </div>
      </div>

      <div class="inv-side">
        <div class="card mb-4">
          <div class="card__header"><span class="card__title">Resumen fiscal</span></div>
          <div class="card__body" id="inv-totals">
            ${renderInvTotals(items, base.currency || 'MXN')}
          </div>
        </div>
        <div class="card">
          <div class="card__header"><span class="card__title">Emisor</span></div>
          <div class="card__body">
            <dl class="info-list info-list--sm">
              <dt>Nombre</dt><dd>${escapeHTML(company.name || '—')}</dd>
              <dt>RFC</dt><dd class="mono">${escapeHTML(company.rfc || '—')}</dd>
              <dt>Régimen</dt><dd>${REGIMENES_FISCALES.find(r => r.clave === company.regimenFiscal)?.descripcion?.slice(0, 35) || company.regimenFiscal || '—'}</dd>
              <dt>CP</dt><dd>${escapeHTML(company.codigoPostal || '—')}</dd>
            </dl>
            ${!company.rfc ? `<div class="alert alert--warning"><i data-lucide="alert-triangle"></i> Configura los datos fiscales de tu empresa en Configuración antes de timbrar.</div>` : ''}
          </div>
        </div>
      </div>
    </div>`;

  if (window.lucide) lucide.createIcons({ nodes: [container] });

  bindInvItemEvents(container, items, settings);

  container.querySelector('#back-inv')?.addEventListener('click', () => window.App?.navigate('invoices'));
  container.querySelector('#i-client')?.addEventListener('change', e => {
    const opt = e.target.selectedOptions[0];
    container.querySelector('#i-client-rfc').value = opt?.dataset.rfc || '';
    const regimenSel = container.querySelector('#i-client-regimen');
    if (regimenSel && opt?.dataset.regimen) regimenSel.value = opt.dataset.regimen;
    const usoSel = container.querySelector('#i-uso');
    if (usoSel && opt?.dataset.uso) usoSel.value = opt.dataset.uso;
  });

  const doSave = (andStamp) => {
    const clientSel = container.querySelector('#i-client');
    const clientId = clientSel?.value;
    if (!clientId) { showToast('Selecciona un cliente', 'error'); return; }
    const client = Store.getClient(clientId);
    const totals = calcQuotationTotals(items);
    const inv = {
      id: existing?.id || uid(),
      folio: container.querySelector('#i-folio')?.value,
      date: container.querySelector('#i-date')?.value || today(),
      clientId, clientRfc: client?.rfc || '', clientName: client?.name || '',
      clientRegimen: container.querySelector('#i-client-regimen')?.value || client?.regimenFiscal || '616',
      clientCP: client?.cp || '00000',
      companyRfc: company.rfc || '',
      currency: container.querySelector('#i-currency')?.value || 'MXN',
      metodoPago: container.querySelector('#i-metodo')?.value || 'PUE',
      formaPago: container.querySelector('#i-forma')?.value || '03',
      usoCFDI: container.querySelector('#i-uso')?.value || 'G03',
      regimenFiscal: company.regimenFiscal || '601',
      items: items.map(i => ({ ...i })),
      ...totals,
      status: andStamp ? 'stamped' : 'draft',
      quotationId: fromQ?.id || existing?.quotationId,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (andStamp) {
      inv.uuid = generateUUID();
      inv.sello = generateSello();
      inv.noCertificado = generateNoCertificado();
      inv.stampedAt = new Date().toISOString();
      inv.cadenaOriginal = generateCadenaOriginal(inv, company);
      inv.qrData = generateQRData(inv);
      if (fromQ) { fromQ.status = 'invoiced'; fromQ.history = [...(fromQ.history || []), { date: new Date().toISOString(), event: 'Convertida a factura' }]; Store.upsertQuotation(fromQ); }
    }
    Store.upsertInvoice(inv);
    showToast(andStamp ? 'Factura timbrada (simulado)' : t('success_saved'));
    window.App?.navigate('invoices', { action: 'view', id: inv.id });
  };

  container.querySelector('#save-inv-draft')?.addEventListener('click', () => doSave(false));
  container.querySelector('#stamp-inv')?.addEventListener('click', () => doSave(true));
}

function renderInvItems(items) {
  return `<table class="table items-table">
    <thead><tr><th>ClaveProdServ</th><th>Descripción</th><th>Cant.</th><th>U</th><th>P.Unit</th><th>Desc%</th><th>IVA%</th><th>Importe</th><th></th></tr></thead>
    <tbody id="inv-items-body">
      ${items.map((item, idx) => renderInvItemRow(item, idx)).join('')}
    </tbody>
  </table>`;
}

function renderInvItemRow(item, idx) {
  const importe = ((item.qty || 0) * (item.unitPrice || 0) * (1 - (item.discount || 0) / 100));
  const withTax = importe * (1 + (item.taxRate || 16) / 100);
  return `<tr data-idx="${idx}" class="item-row">
    <td><input class="form-control form-control--sm inv-cps" data-idx="${idx}" value="${item.claveProdServ || '81111501'}" style="width:100px" list="cps-list-inv"></td>
    <td><input class="form-control form-control--sm inv-desc" data-idx="${idx}" value="${item.description || ''}"></td>
    <td><input class="form-control form-control--sm inv-qty text-right" data-idx="${idx}" type="number" value="${item.qty || 1}" min="0.001" step="0.001" style="width:65px"></td>
    <td><input class="form-control form-control--sm inv-cu" data-idx="${idx}" value="${item.claveUnidad || 'E48'}" style="width:55px" list="cu-list-inv"></td>
    <td><input class="form-control form-control--sm inv-price text-right" data-idx="${idx}" type="number" value="${item.unitPrice || 0}" min="0" step="0.01" style="width:90px"></td>
    <td><input class="form-control form-control--sm inv-disc text-right" data-idx="${idx}" type="number" value="${item.discount || 0}" min="0" max="100" style="width:55px"></td>
    <td><input class="form-control form-control--sm inv-tax text-right" data-idx="${idx}" type="number" value="${item.taxRate ?? 16}" min="0" max="100" style="width:55px"></td>
    <td class="text-right inv-total-cell" data-idx="${idx}">$${withTax.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
    <td><button class="btn-icon btn-icon--danger btn--sm inv-del" data-idx="${idx}"><i data-lucide="x"></i></button></td>
  </tr>`;
}

function renderInvTotals(items, currency) {
  const totals = calcQuotationTotals(items);
  return `
    <div class="totals-panel">
      <div class="totals-row"><span>Subtotal</span><span>${formatCurrency(totals.subtotal, currency)}</span></div>
      <div class="totals-row"><span>Descuento</span><span class="text-danger">-${formatCurrency(totals.discountTotal, currency)}</span></div>
      <div class="totals-row"><span>IVA trasladado</span><span>${formatCurrency(totals.taxTotal, currency)}</span></div>
      <div class="totals-row totals-row--total"><span>Total</span><span>${formatCurrency(totals.total, currency)}</span></div>
    </div>`;
}

function bindInvItemEvents(container, items, settings) {
  const body = container.querySelector('#inv-items-body');
  const totalsPanel = container.querySelector('#inv-totals');
  if (!body) return;
  if (window.lucide) lucide.createIcons({ nodes: [body] });

  const recalc = () => {
    const currency = container.querySelector('#i-currency')?.value || 'MXN';
    if (totalsPanel) totalsPanel.innerHTML = renderInvTotals(items, currency);
    items.forEach((item, idx) => {
      const importe = (item.qty || 0) * (item.unitPrice || 0) * (1 - (item.discount || 0) / 100);
      const withTax = importe * (1 + (item.taxRate || 16) / 100);
      const cell = body.querySelector(`[data-idx="${idx}"].inv-total-cell`);
      if (cell) cell.textContent = '$' + withTax.toLocaleString('es-MX', { minimumFractionDigits: 2 });
    });
  };

  body.addEventListener('input', e => {
    const t = e.target, idx = parseInt(t.dataset.idx);
    if (isNaN(idx)) return;
    if (t.classList.contains('inv-cps')) items[idx].claveProdServ = t.value;
    if (t.classList.contains('inv-desc')) items[idx].description = t.value;
    if (t.classList.contains('inv-qty')) { items[idx].qty = parseFloat(t.value) || 0; recalc(); }
    if (t.classList.contains('inv-cu')) items[idx].claveUnidad = t.value;
    if (t.classList.contains('inv-price')) { items[idx].unitPrice = parseFloat(t.value) || 0; recalc(); }
    if (t.classList.contains('inv-disc')) { items[idx].discount = parseFloat(t.value) || 0; recalc(); }
    if (t.classList.contains('inv-tax')) { items[idx].taxRate = parseFloat(t.value) || 0; recalc(); }
  });

  body.addEventListener('click', e => {
    const btn = e.target.closest('.inv-del');
    if (!btn) return;
    const idx = parseInt(btn.dataset.idx);
    if (items.length > 1) {
      items.splice(idx, 1);
      body.innerHTML = items.map((item, i) => renderInvItemRow(item, i)).join('');
      if (window.lucide) lucide.createIcons({ nodes: [body] });
      recalc();
    }
  });

  container.querySelector('#add-inv-item')?.addEventListener('click', () => {
    items.push({ id: uid(), description: '', qty: 1, unit: 'Servicio', unitPrice: 0, discount: 0, taxRate: settings?.iva || 16, claveProdServ: '81111501', claveUnidad: 'E48' });
    body.innerHTML = items.map((item, i) => renderInvItemRow(item, i)).join('');
    if (window.lucide) lucide.createIcons({ nodes: [body] });
    recalc();
  });
}

// ─── VIEW ──────────────────────────────────────────────────────────────────────
function renderInvoiceView(container, id) {
  const t = I18n.t.bind(I18n);
  const inv = Store.getInvoice(id);
  if (!inv) { container.innerHTML = '<p>Factura no encontrada</p>'; return; }
  const client = Store.getClients().find(c => c.id === inv.clientId);
  const company = Store.getCompany();
  const payments = Store.getPayments().filter(p => p.invoiceId === id);
  const paidAmount = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const balance = (inv.total || 0) - paidAmount;

  container.innerHTML = `
    <div class="page-header">
      <button class="btn btn--ghost btn--sm" id="back-inv"><i data-lucide="arrow-left"></i> ${t('inv_title')}</button>
      <h1 class="page-title">${escapeHTML(inv.folio || '')} <span class="badge badge--${inv.status} badge--lg">${t(`status_${inv.status}`)}</span></h1>
      <div class="page-actions">
        ${inv.status === 'draft' ? `<button class="btn btn--primary" data-action="stamp"><i data-lucide="stamp"></i> ${t('inv_stamp')}</button>` : ''}
        ${inv.status === 'stamped' ? `
          <button class="btn btn--ghost btn--sm" data-action="pdf"><i data-lucide="file-text"></i> PDF</button>
          <button class="btn btn--ghost btn--sm" data-action="xml"><i data-lucide="code-2"></i> XML</button>
          <button class="btn btn--secondary" data-action="payment"><i data-lucide="credit-card"></i> Registrar pago</button>
        ` : ''}
        <button class="btn btn--ghost btn--sm" id="print-inv"><i data-lucide="printer"></i> Imprimir</button>
      </div>
    </div>

    <div class="view-grid">
      <div class="card">
        <div class="card__body p-0">
          ${buildCFDIPreview(inv, client, company)}
        </div>
      </div>
      <div class="side-panel">
        <div class="card mb-4">
          <div class="card__header"><span class="card__title">Datos fiscales</span></div>
          <div class="card__body">
            <dl class="info-list info-list--sm">
              <dt>UUID</dt><dd class="mono text-xs">${escapeHTML(inv.uuid || '—')}</dd>
              <dt>Método de pago</dt><dd>${inv.metodoPago || '—'}</dd>
              <dt>Forma de pago</dt><dd>${FORMAS_PAGO.find(f => f.clave === inv.formaPago)?.descripcion || inv.formaPago || '—'}</dd>
              <dt>Uso CFDI</dt><dd>${USOS_CFDI.find(u => u.clave === inv.usoCFDI)?.descripcion || inv.usoCFDI || '—'}</dd>
              <dt>RFC emisor</dt><dd class="mono">${escapeHTML(company.rfc || '—')}</dd>
              <dt>RFC receptor</dt><dd class="mono">${escapeHTML(inv.clientRfc || client?.rfc || '—')}</dd>
            </dl>
          </div>
        </div>
        ${inv.status === 'stamped' && inv.metodoPago === 'PPD' ? `
        <div class="card mb-4">
          <div class="card__header"><span class="card__title">Saldo</span></div>
          <div class="card__body">
            <div class="payment-summary">
              <div class="payment-row"><span>Total factura</span><span>${formatCurrency(inv.total, inv.currency)}</span></div>
              <div class="payment-row"><span>Pagado</span><span class="text-success">${formatCurrency(paidAmount, inv.currency)}</span></div>
              <div class="payment-row payment-row--balance"><span>Saldo pendiente</span><span class="text-${balance > 0 ? 'warning' : 'success'}">${formatCurrency(balance, inv.currency)}</span></div>
            </div>
            ${payments.map(p => `
              <div class="payment-item">
                <i data-lucide="check-circle"></i>
                <span>${formatDate(p.date)} · ${formatCurrency(p.amount, inv.currency)}</span>
              </div>`).join('')}
          </div>
        </div>` : ''}
        ${inv.cadenaOriginal ? `
        <div class="card">
          <div class="card__header"><span class="card__title">${t('inv_cadena')}</span></div>
          <div class="card__body">
            <pre class="cadena-text">${escapeHTML(inv.cadenaOriginal || '')}</pre>
          </div>
        </div>` : ''}
      </div>
    </div>`;

  if (window.lucide) lucide.createIcons({ nodes: [container] });

  container.querySelector('#back-inv')?.addEventListener('click', () => window.App?.navigate('invoices'));
  container.querySelector('#print-inv')?.addEventListener('click', () => {
    const html = document.querySelector('.document-preview, .cfdi-preview')?.outerHTML || '';
    printDocumentFromHtml(html, inv.folio);
  });
  container.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      if (action === 'stamp') { stampInvoice(id, container, {}); }
      if (action === 'pdf') downloadInvoicePDF(inv);
      if (action === 'xml') downloadFile(`CFDI_${inv.folio}.xml`, generateCFDIXml(inv, company));
      if (action === 'payment') window.App?.navigate('payments', { action: 'new', invoiceId: id });
    });
  });
}

function buildCFDIPreview(inv, client, company) {
  const items = inv.items || [];
  const qrData = inv.qrData || generateQRData(inv);
  return `
    <div class="cfdi-preview" id="document-content">
      <div class="cfdi-header">
        <div class="cfdi-badge">CFDI 4.0 ${inv.status === 'stamped' ? '<span class="cfdi-stamped-badge">TIMBRADO</span>' : '<span class="cfdi-draft-badge">BORRADOR</span>'}</div>
        <div class="doc-header">
          <div class="doc-company">
            ${company.logo ? `<img src="${company.logo}" class="doc-logo">` : `<div class="doc-logo-placeholder">${(company.name || 'E')[0]}</div>`}
            <div class="doc-company-info">
              <h2>${escapeHTML(company.name || 'Mi Empresa')}</h2>
              <p>RFC: ${escapeHTML(company.rfc || '—')} · Régimen: ${REGIMENES_FISCALES.find(r => r.clave === company.regimenFiscal)?.descripcion?.slice(0, 40) || company.regimenFiscal || '—'}</p>
              <p>Lugar de expedición: ${escapeHTML(company.codigoPostal || '—')}</p>
            </div>
          </div>
          <div class="doc-meta">
            <h1 class="doc-type">FACTURA</h1>
            <table class="doc-meta-table">
              <tr><td>Serie-Folio:</td><td class="mono">${escapeHTML(inv.folio || '')}</td></tr>
              <tr><td>Fecha:</td><td>${formatDate(inv.date)}</td></tr>
              <tr><td>Método pago:</td><td>${inv.metodoPago || '—'}</td></tr>
              <tr><td>Forma pago:</td><td>${FORMAS_PAGO.find(f => f.clave === inv.formaPago)?.descripcion || inv.formaPago || '—'}</td></tr>
            </table>
          </div>
        </div>
      </div>

      <div class="cfdi-receptor">
        <div class="doc-section-label">RECEPTOR</div>
        <div class="cfdi-receptor-grid">
          <div>
            <strong>${escapeHTML(client?.name || inv.clientName || '—')}</strong>
            <p>RFC: ${escapeHTML(inv.clientRfc || client?.rfc || '—')}</p>
            <p>${escapeHTML(client?.address || '')}</p>
          </div>
          <div>
            <p>Régimen fiscal: ${REGIMENES_FISCALES.find(r => r.clave === inv.clientRegimen)?.descripcion?.slice(0, 40) || inv.clientRegimen || '—'}</p>
            <p>Uso CFDI: ${USOS_CFDI.find(u => u.clave === inv.usoCFDI)?.descripcion || inv.usoCFDI || '—'}</p>
          </div>
        </div>
      </div>

      <table class="doc-items">
        <thead><tr>
          <th>ClaveProdServ</th><th>Descripción</th><th>Cant.</th><th>ClaveU</th><th>Val.Unit.</th><th>Desc.</th><th>Importe</th>
        </tr></thead>
        <tbody>
          ${items.map(item => {
            const importe = ((item.qty || 0) * (item.unitPrice || 0) * (1 - (item.discount || 0) / 100));
            return `<tr>
              <td class="mono text-xs">${escapeHTML(item.claveProdServ || '—')}</td>
              <td>${escapeHTML(item.description || '')}</td>
              <td class="text-right">${item.qty}</td>
              <td class="mono text-xs">${escapeHTML(item.claveUnidad || '—')}</td>
              <td class="text-right">$${(item.unitPrice || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
              <td class="text-right">${item.discount || 0}%</td>
              <td class="text-right">$${importe.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>

      <div class="cfdi-bottom">
        <div class="cfdi-words">
          <p><strong>Importe con letra:</strong> ${numberToWords(inv.total || 0)}</p>
        </div>
        <div class="doc-totals">
          <div class="doc-totals-row"><span>Subtotal</span><span>$${(inv.subtotal || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></div>
          ${(inv.discountTotal || 0) > 0 ? `<div class="doc-totals-row"><span>Descuento</span><span>-$${(inv.discountTotal || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></div>` : ''}
          <div class="doc-totals-row"><span>IVA 16%</span><span>$${(inv.taxTotal || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></div>
          <div class="doc-totals-row doc-totals-row--grand"><span>Total</span><span>$${(inv.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })} ${inv.currency || 'MXN'}</span></div>
        </div>
      </div>

      ${inv.uuid ? `
      <div class="cfdi-timbre">
        <div class="cfdi-timbre-content">
          <div class="cfdi-timbre-data">
            <p><strong>UUID:</strong> <span class="mono">${escapeHTML(inv.uuid || '')}</span></p>
            <p><strong>RFC emisor:</strong> <span class="mono">${escapeHTML(company.rfc || '—')}</span></p>
            <p><strong>RFC receptor:</strong> <span class="mono">${escapeHTML(inv.clientRfc || '—')}</span></p>
            <p><strong>Fecha timbrado:</strong> ${inv.stampedAt ? new Date(inv.stampedAt).toLocaleString('es-MX') : '—'}</p>
            <p><strong>No. Certificado:</strong> <span class="mono">${escapeHTML(inv.noCertificado || '—')}</span></p>
            <p class="cfdi-sello"><strong>Sello SAT:</strong> <span class="mono text-xs">${escapeHTML((inv.sello || '').slice(0, 64))}…</span></p>
          </div>
          <div class="cfdi-qr" id="cfdi-qr-${inv.id}"></div>
        </div>
        <p class="cfdi-verify-url">Verifica este comprobante en: https://verificacfdi.facturaelectronica.sat.gob.mx</p>
      </div>` : ''}
    </div>`;
}

function downloadInvoicePDF(inv) {
  const client = Store.getClients().find(c => c.id === inv.clientId);
  const company = Store.getCompany();
  const html = buildCFDIPreview(inv, client, company);
  const w = window.open('', '_blank', 'width=900,height=700');
  w.document.write(`<!DOCTYPE html><html><head><title>${inv.folio}</title><style>
    body{font-family:Arial,sans-serif;color:#111;margin:0;padding:20px}
    .cfdi-preview{max-width:800px;margin:0 auto}
    .cfdi-header{margin-bottom:16px}
    .cfdi-badge{font-size:11px;font-weight:700;color:#6366f1;margin-bottom:8px}
    .cfdi-stamped-badge{background:#10b981;color:#fff;padding:2px 6px;border-radius:4px;margin-left:8px}
    .cfdi-draft-badge{background:#f59e0b;color:#fff;padding:2px 6px;border-radius:4px;margin-left:8px}
    .doc-header{display:flex;justify-content:space-between;margin-bottom:20px}
    .doc-company h2{margin:0 0 4px}.doc-company p{margin:2px 0;font-size:12px;color:#555}
    .doc-type{font-size:26px;margin:0 0 8px}.doc-meta-table td{padding:2px 8px;font-size:12px}
    .cfdi-receptor{background:#f5f5f5;padding:12px;border-radius:6px;margin-bottom:16px}
    .cfdi-receptor-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;font-size:12px}
    .doc-section-label{font-size:10px;font-weight:700;letter-spacing:1px;color:#888;margin-bottom:4px}
    .doc-items{width:100%;border-collapse:collapse;margin-bottom:16px}
    .doc-items th{background:#111;color:#fff;padding:7px;text-align:left;font-size:11px}
    .doc-items td{padding:7px;border-bottom:1px solid #eee;font-size:12px}
    .text-right{text-align:right}.mono{font-family:monospace}
    .cfdi-bottom{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px}
    .cfdi-words{font-size:12px;max-width:55%}
    .doc-totals{display:flex;flex-direction:column;align-items:flex-end;gap:4px}
    .doc-totals-row{display:flex;gap:24px;font-size:13px}
    .doc-totals-row--grand{font-weight:700;font-size:16px;border-top:2px solid #111;padding-top:6px}
    .cfdi-timbre{border:1px solid #ccc;border-radius:6px;padding:12px;margin-top:16px;font-size:11px}
    .cfdi-timbre-content{display:flex;justify-content:space-between;gap:16px}
    .cfdi-timbre-data{flex:1}.cfdi-sello{word-break:break-all}
    .cfdi-verify-url{font-size:10px;color:#888;margin-top:8px}
    .text-xs{font-size:11px}
    .doc-logo{max-height:50px}.doc-logo-placeholder{width:50px;height:50px;background:#6366f1;color:#fff;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:700;border-radius:6px}
    @media print{@page{margin:1cm}}
  </style></head><body>${html}<script>window.onload=()=>setTimeout(()=>{window.print();window.close()},300)<\/script></body></html>`);
  w.document.close();
}
