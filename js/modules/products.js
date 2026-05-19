import Store from '../store.js';
import I18n from '../i18n.js';
import { uid, showToast, confirmDialog, exportCSV, debounce, escapeHTML } from '../utils.js';
import { CLAVES_PROD_SERV, CLAVES_UNIDAD, CURRENCIES } from '../catalogs.js';

let prodsSearch = '';
let prodsCatFilter = '';

export function renderProducts(container, params = {}) {
  const t = I18n.t.bind(I18n);
  if (params.action === 'new' || params.action === 'edit') {
    return renderProductForm(container, params.id);
  }

  const allProducts = Store.getProducts();
  const categories = [...new Set(allProducts.map(p => p.category).filter(Boolean))];
  const products = allProducts.filter(p => {
    const matchSearch = !prodsSearch || p.name?.toLowerCase().includes(prodsSearch) || p.code?.toLowerCase().includes(prodsSearch) || p.description?.toLowerCase().includes(prodsSearch);
    const matchCat = !prodsCatFilter || p.category === prodsCatFilter;
    return matchSearch && matchCat;
  });

  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">${t('prod_title')}</h1>
      <div class="page-actions">
        <button class="btn btn--ghost btn--sm" id="export-products"><i data-lucide="download"></i> ${t('btn_export')}</button>
        <button class="btn btn--primary" id="new-product"><i data-lucide="plus"></i> ${t('prod_new')}</button>
      </div>
    </div>

    <div class="toolbar">
      <div class="search-box">
        <i data-lucide="search" class="search-box__icon"></i>
        <input type="text" class="search-box__input" placeholder="${t('search_placeholder')}" id="prod-search" value="${prodsSearch}">
      </div>
      <select class="form-control form-control--sm" id="cat-filter">
        <option value="">Todas las categorías</option>
        ${categories.map(c => `<option value="${escapeHTML(c)}" ${prodsCatFilter === c ? 'selected' : ''}>${escapeHTML(c)}</option>`).join('')}
      </select>
      <span class="record-count">${products.length} productos</span>
    </div>

    <div class="products-grid">
      ${products.length ? products.map(p => `
        <div class="product-card">
          <div class="product-card__header">
            <span class="product-code">${escapeHTML(p.code || '—')}</span>
            ${p.category ? `<span class="badge badge--category">${escapeHTML(p.category)}</span>` : ''}
          </div>
          <div class="product-card__body">
            <h3 class="product-name">${escapeHTML(p.name || '')}</h3>
            <p class="product-desc">${escapeHTML(p.description || '')}</p>
            <div class="product-meta">
              <span class="product-clave" title="ClaveProdServ"><i data-lucide="tag"></i> ${escapeHTML(p.claveProdServ || '—')}</span>
              <span class="product-unit" title="Unidad"><i data-lucide="ruler"></i> ${escapeHTML(p.claveUnidad || '—')} / ${escapeHTML(p.unit || '')}</span>
            </div>
          </div>
          <div class="product-card__footer">
            <div class="product-price">
              <span class="product-price__amount">$${Number(p.price || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              <span class="product-price__currency">${p.currency || 'MXN'}</span>
              <span class="product-price__tax">+ IVA ${p.taxRate || 16}%</span>
            </div>
            <div class="action-buttons">
              <button class="btn-icon" title="Editar" data-action="edit" data-id="${p.id}"><i data-lucide="pencil"></i></button>
              <button class="btn-icon btn-icon--danger" title="Eliminar" data-action="delete" data-id="${p.id}"><i data-lucide="trash-2"></i></button>
            </div>
          </div>
        </div>`).join('') : `
      <div class="empty-state" style="grid-column:1/-1">
        <i data-lucide="package" class="empty-state__icon"></i>
        <h3>Sin productos</h3>
        <p>Agrega productos o servicios a tu catálogo</p>
        <button class="btn btn--primary" id="new-product-empty"><i data-lucide="plus"></i> ${t('prod_new')}</button>
      </div>`}
    </div>`;

  if (window.lucide) lucide.createIcons({ nodes: [container] });

  container.querySelector('#new-product')?.addEventListener('click', () => window.App?.navigate('products', { action: 'new' }));
  container.querySelector('#new-product-empty')?.addEventListener('click', () => window.App?.navigate('products', { action: 'new' }));
  container.querySelector('#export-products')?.addEventListener('click', () => {
    exportCSV(
      ['Clave', 'Nombre', 'Descripción', 'ClaveProdServ', 'ClaveUnidad', 'Unidad', 'Precio', 'Moneda', 'IVA%', 'Categoría'],
      products.map(p => [p.code, p.name, p.description, p.claveProdServ, p.claveUnidad, p.unit, p.price, p.currency, p.taxRate, p.category]),
      'productos.csv'
    );
  });
  container.querySelector('#prod-search')?.addEventListener('input', debounce(e => { prodsSearch = e.target.value.toLowerCase(); renderProducts(container, params); }));
  container.querySelector('#cat-filter')?.addEventListener('change', e => { prodsCatFilter = e.target.value; renderProducts(container, params); });
  container.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const { action, id } = btn.dataset;
      if (action === 'edit') window.App?.navigate('products', { action: 'edit', id });
      if (action === 'delete') {
        if (await confirmDialog(t('confirm_delete'))) {
          Store.deleteProduct(id);
          showToast(t('success_deleted'));
          renderProducts(container, params);
        }
      }
    });
  });
}

function renderProductForm(container, id) {
  const t = I18n.t.bind(I18n);
  const product = id ? Store.getProduct(id) : null;
  const p = product || {};
  const settings = Store.getSettings();

  container.innerHTML = `
    <div class="page-header">
      <button class="btn btn--ghost btn--sm" id="back-products"><i data-lucide="arrow-left"></i> ${t('prod_title')}</button>
      <h1 class="page-title">${!id ? t('prod_new') : t('prod_edit')}</h1>
    </div>

    <div class="form-grid">
      <div class="card form-card">
        <div class="card__header"><span class="card__title">Información del producto</span></div>
        <div class="card__body">
          <div class="form-row form-row--2">
            <div class="form-group">
              <label class="form-label">${t('prod_code')}</label>
              <input class="form-control" id="p-code" value="${escapeHTML(p.code || '')}" placeholder="SW-001">
            </div>
            <div class="form-group">
              <label class="form-label">${t('prod_category')}</label>
              <input class="form-control" id="p-category" value="${escapeHTML(p.category || '')}" placeholder="Desarrollo, Consultoría...">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label required">${t('prod_name')}</label>
            <input class="form-control" id="p-name" value="${escapeHTML(p.name || '')}">
          </div>
          <div class="form-group">
            <label class="form-label">${t('prod_description')}</label>
            <textarea class="form-control" id="p-desc" rows="3">${escapeHTML(p.description || '')}</textarea>
          </div>
          <div class="form-row form-row--2">
            <div class="form-group">
              <label class="form-label required">${t('prod_clave_prod_serv')}</label>
              <div class="input-with-search">
                <input class="form-control" id="p-cps" value="${escapeHTML(p.claveProdServ || '')}" placeholder="81111501" list="cps-list">
                <datalist id="cps-list">
                  ${CLAVES_PROD_SERV.map(c => `<option value="${c.clave}">${c.clave} – ${c.descripcion}</option>`).join('')}
                </datalist>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label required">${t('prod_clave_unidad')}</label>
              <input class="form-control" id="p-cu" value="${escapeHTML(p.claveUnidad || '')}" placeholder="E48" list="cu-list">
              <datalist id="cu-list">
                ${CLAVES_UNIDAD.map(c => `<option value="${c.clave}">${c.clave} – ${c.descripcion}</option>`).join('')}
              </datalist>
            </div>
          </div>
          <div class="form-row form-row--2">
            <div class="form-group">
              <label class="form-label">${t('prod_unit')}</label>
              <input class="form-control" id="p-unit" value="${escapeHTML(p.unit || 'Servicio')}">
            </div>
            <div class="form-group">
              <label class="form-label">${t('prod_tax_rate')}</label>
              <input class="form-control" id="p-tax" type="number" value="${p.taxRate ?? settings.iva ?? 16}" min="0" max="100">
            </div>
          </div>
          <div class="form-row form-row--2">
            <div class="form-group">
              <label class="form-label required">${t('prod_price')}</label>
              <div class="input-group">
                <span class="input-group__prefix">$</span>
                <input class="form-control" id="p-price" type="number" value="${p.price || ''}" min="0" step="0.01">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">${t('prod_currency')}</label>
              <select class="form-control" id="p-currency">
                ${CURRENCIES.map(c => `<option value="${c.code}" ${p.currency === c.code ? 'selected' : ''}>${c.code} – ${c.name}</option>`).join('')}
              </select>
            </div>
          </div>
        </div>
        <div class="card__footer">
          <button class="btn btn--ghost" id="cancel-product">${t('btn_cancel')}</button>
          <button class="btn btn--primary" id="save-product"><i data-lucide="save"></i> ${t('btn_save')}</button>
        </div>
      </div>
    </div>`;

  if (window.lucide) lucide.createIcons({ nodes: [container] });

  container.querySelector('#back-products')?.addEventListener('click', () => window.App?.navigate('products'));
  container.querySelector('#cancel-product')?.addEventListener('click', () => window.App?.navigate('products'));
  container.querySelector('#save-product')?.addEventListener('click', () => {
    const name = container.querySelector('#p-name').value.trim();
    const cps = container.querySelector('#p-cps').value.trim();
    const price = parseFloat(container.querySelector('#p-price').value);
    if (!name || !cps) { showToast('Nombre y ClaveProdServ son requeridos', 'error'); return; }
    Store.upsertProduct({
      id: p.id || uid(),
      code: container.querySelector('#p-code').value.trim(),
      category: container.querySelector('#p-category').value.trim(),
      name, claveProdServ: cps,
      claveUnidad: container.querySelector('#p-cu').value.trim(),
      unit: container.querySelector('#p-unit').value.trim(),
      description: container.querySelector('#p-desc').value.trim(),
      price: isNaN(price) ? 0 : price,
      currency: container.querySelector('#p-currency').value,
      taxRate: parseFloat(container.querySelector('#p-tax').value) || 16,
      updatedAt: new Date().toISOString(),
    });
    showToast(t('success_saved'));
    window.App?.navigate('products');
  });
}
