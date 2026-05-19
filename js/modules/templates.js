import Store from '../store.js';
import I18n from '../i18n.js';
import { uid, showToast, confirmDialog, formatCurrency, calcQuotationTotals } from '../utils.js';

export function renderTemplates(container, params = {}) {
  const t = I18n.t.bind(I18n);
  if (params.action === 'new' || params.action === 'edit') return renderTemplateForm(container, params.id);

  const templates = Store.getTemplates();

  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">${t('tmpl_title')}</h1>
      <div class="page-actions">
        <button class="btn btn--primary" id="new-tmpl"><i data-lucide="plus"></i> ${t('tmpl_new')}</button>
      </div>
    </div>

    <div class="templates-grid">
      ${templates.length ? templates.map(tmpl => {
        const totals = calcQuotationTotals(tmpl.items || []);
        return `
        <div class="template-card">
          <div class="template-card__header">
            <i data-lucide="layout-template" class="template-icon"></i>
            <div class="template-card__actions">
              <button class="btn-icon" title="Usar" data-action="use" data-id="${tmpl.id}"><i data-lucide="play"></i></button>
              <button class="btn-icon" title="Editar" data-action="edit" data-id="${tmpl.id}"><i data-lucide="pencil"></i></button>
              <button class="btn-icon btn-icon--danger" title="Eliminar" data-action="delete" data-id="${tmpl.id}"><i data-lucide="trash-2"></i></button>
            </div>
          </div>
          <h3 class="template-name">${tmpl.name}</h3>
          ${tmpl.description ? `<p class="template-desc">${tmpl.description}</p>` : ''}
          <div class="template-meta">
            <span>${(tmpl.items || []).length} partidas</span>
            <span>${formatCurrency(totals.total, tmpl.currency || 'MXN')}</span>
          </div>
          ${tmpl.discount ? `<div class="template-badge"><i data-lucide="tag"></i> Descuento: ${tmpl.discount}%</div>` : ''}
        </div>`;
      }).join('') : `
      <div class="empty-state" style="grid-column:1/-1">
        <i data-lucide="layout-template" class="empty-state__icon"></i>
        <h3>Sin plantillas</h3>
        <p>Crea plantillas reutilizables para agilizar tus cotizaciones</p>
        <button class="btn btn--primary" id="new-tmpl-empty"><i data-lucide="plus"></i> ${t('tmpl_new')}</button>
      </div>`}
    </div>`;

  if (window.lucide) lucide.createIcons({ nodes: [container] });

  container.querySelector('#new-tmpl')?.addEventListener('click', () => window.App?.navigate('templates', { action: 'new' }));
  container.querySelector('#new-tmpl-empty')?.addEventListener('click', () => window.App?.navigate('templates', { action: 'new' }));
  container.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const { action, id } = btn.dataset;
      if (action === 'edit') window.App?.navigate('templates', { action: 'edit', id });
      if (action === 'use') window.App?.navigate('quotations', { action: 'new', templateId: id });
      if (action === 'delete') {
        if (await confirmDialog(t('confirm_delete'))) {
          Store.deleteTemplate(id);
          showToast(t('success_deleted'));
          renderTemplates(container, params);
        }
      }
    });
  });
}

function renderTemplateForm(container, id) {
  const t = I18n.t.bind(I18n);
  const tmpl = id ? Store.getTemplates().find(x => x.id === id) : null;
  const tp = tmpl || {};
  const settings = Store.getSettings();
  const products = Store.getProducts();

  let items = tp.items ? JSON.parse(JSON.stringify(tp.items)) : [{ id: uid(), description: '', qty: 1, unit: 'Servicio', unitPrice: 0, discount: 0, taxRate: settings.iva || 16, claveProdServ: '81111501', claveUnidad: 'E48' }];

  const renderRows = () => items.map((item, idx) => `
    <tr data-idx="${idx}">
      <td>
        <select class="form-control form-control--sm tmpl-product" data-idx="${idx}">
          <option value="">Personalizado</option>
          ${products.map(p => `<option value="${p.id}" ${item.productId === p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
        </select>
      </td>
      <td><input class="form-control form-control--sm tmpl-desc" data-idx="${idx}" value="${item.description || ''}"></td>
      <td><input class="form-control form-control--sm tmpl-qty text-right" data-idx="${idx}" type="number" value="${item.qty || 1}" style="width:65px"></td>
      <td><input class="form-control form-control--sm tmpl-price text-right" data-idx="${idx}" type="number" value="${item.unitPrice || 0}" style="width:90px"></td>
      <td><input class="form-control form-control--sm tmpl-disc text-right" data-idx="${idx}" type="number" value="${item.discount || 0}" style="width:60px"></td>
      <td><button class="btn-icon btn-icon--danger btn--sm tmpl-del" data-idx="${idx}"><i data-lucide="x"></i></button></td>
    </tr>`).join('');

  container.innerHTML = `
    <div class="page-header">
      <button class="btn btn--ghost btn--sm" id="back-tmpl"><i data-lucide="arrow-left"></i> ${t('tmpl_title')}</button>
      <h1 class="page-title">${!id ? t('tmpl_new') : t('tmpl_edit')}</h1>
    </div>

    <div class="form-grid">
      <div class="card form-card">
        <div class="card__header"><span class="card__title">Información de la plantilla</span></div>
        <div class="card__body">
          <div class="form-row form-row--2">
            <div class="form-group">
              <label class="form-label required">${t('tmpl_name')}</label>
              <input class="form-control" id="tp-name" value="${tp.name || ''}">
            </div>
            <div class="form-group">
              <label class="form-label">Descuento global %</label>
              <input class="form-control" id="tp-discount" type="number" value="${tp.discount || 0}" min="0" max="100">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Descripción</label>
            <input class="form-control" id="tp-desc" value="${tp.description || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Notas predeterminadas</label>
            <textarea class="form-control" id="tp-notes" rows="2">${tp.notes || ''}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Términos predeterminados</label>
            <textarea class="form-control" id="tp-terms" rows="2">${tp.terms || ''}</textarea>
          </div>
        </div>
      </div>

      <div class="card form-card">
        <div class="card__header"><span class="card__title">Partidas de la plantilla</span></div>
        <div class="card__body p-0">
          <table class="table items-table">
            <thead><tr><th>Producto</th><th>Descripción</th><th>Cant.</th><th>Precio</th><th>Desc%</th><th></th></tr></thead>
            <tbody id="tmpl-items-body">${renderRows()}</tbody>
          </table>
          <div class="p-4">
            <button class="btn btn--ghost btn--sm" id="add-tmpl-item"><i data-lucide="plus"></i> Agregar partida</button>
          </div>
        </div>
        <div class="card__footer">
          <button class="btn btn--ghost" id="cancel-tmpl">${t('btn_cancel')}</button>
          <button class="btn btn--primary" id="save-tmpl"><i data-lucide="save"></i> ${t('btn_save')}</button>
        </div>
      </div>
    </div>`;

  if (window.lucide) lucide.createIcons({ nodes: [container] });

  const body = container.querySelector('#tmpl-items-body');

  const rebind = () => {
    if (window.lucide) lucide.createIcons({ nodes: [body] });
    body.querySelectorAll('.tmpl-product').forEach(sel => {
      sel.addEventListener('change', e => {
        const idx = parseInt(e.target.dataset.idx);
        const prod = products.find(p => p.id === e.target.value);
        if (prod) {
          items[idx] = { ...items[idx], productId: prod.id, description: prod.name, unitPrice: prod.price, unit: prod.unit, taxRate: prod.taxRate, claveProdServ: prod.claveProdServ, claveUnidad: prod.claveUnidad };
          body.innerHTML = renderRows(); rebind();
        }
      });
    });
    body.querySelectorAll('input').forEach(inp => {
      inp.addEventListener('input', e => {
        const idx = parseInt(e.target.dataset.idx);
        if (e.target.classList.contains('tmpl-desc')) items[idx].description = e.target.value;
        if (e.target.classList.contains('tmpl-qty')) items[idx].qty = parseFloat(e.target.value) || 0;
        if (e.target.classList.contains('tmpl-price')) items[idx].unitPrice = parseFloat(e.target.value) || 0;
        if (e.target.classList.contains('tmpl-disc')) items[idx].discount = parseFloat(e.target.value) || 0;
      });
    });
    body.querySelectorAll('.tmpl-del').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        if (items.length > 1) { items.splice(idx, 1); body.innerHTML = renderRows(); rebind(); }
      });
    });
  };
  rebind();

  container.querySelector('#add-tmpl-item')?.addEventListener('click', () => {
    items.push({ id: uid(), description: '', qty: 1, unit: 'Servicio', unitPrice: 0, discount: 0, taxRate: settings.iva || 16, claveProdServ: '81111501', claveUnidad: 'E48' });
    body.innerHTML = renderRows(); rebind();
  });

  container.querySelector('#back-tmpl')?.addEventListener('click', () => window.App?.navigate('templates'));
  container.querySelector('#cancel-tmpl')?.addEventListener('click', () => window.App?.navigate('templates'));
  container.querySelector('#save-tmpl')?.addEventListener('click', () => {
    const name = container.querySelector('#tp-name').value.trim();
    if (!name) { showToast('El nombre es requerido', 'error'); return; }
    const list = Store.getTemplates();
    const template = {
      id: tp.id || uid(), name,
      description: container.querySelector('#tp-desc').value,
      discount: parseFloat(container.querySelector('#tp-discount').value) || 0,
      notes: container.querySelector('#tp-notes').value,
      terms: container.querySelector('#tp-terms').value,
      items: items.map(i => ({ ...i })),
      updatedAt: new Date().toISOString(),
    };
    const idx = list.findIndex(x => x.id === template.id);
    if (idx >= 0) list[idx] = template; else list.push(template);
    Store.saveTemplates ? Store.saveTemplates(list) : localStorage.setItem('cot_templates', JSON.stringify(list));
    showToast(t('success_saved'));
    window.App?.navigate('templates');
  });
}
