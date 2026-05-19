import Store from '../store.js';
import I18n from '../i18n.js';
import { uid, today, formatDate, showToast, confirmDialog, formatCurrency } from '../utils.js';
import { FORMAS_PAGO } from '../catalogs.js';

export function renderPayments(container, params = {}) {
  const t = I18n.t.bind(I18n);
  if (params.action === 'new') return renderPaymentForm(container, params.invoiceId);

  const payments = Store.getPayments().sort((a, b) => (b.date || '') > (a.date || '') ? 1 : -1);
  const invoices = Store.getInvoices();
  const clients = Store.getClients();

  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">${t('pay_title')}</h1>
      <div class="page-actions">
        <button class="btn btn--primary" id="new-payment"><i data-lucide="plus"></i> ${t('pay_new')}</button>
      </div>
    </div>

    <div class="card p-0">
      ${payments.length ? `
      <table class="table">
        <thead><tr>
          <th>${t('pay_date')}</th>
          <th>${t('pay_invoice')}</th>
          <th>Cliente</th>
          <th>${t('pay_amount')}</th>
          <th>${t('pay_forma')}</th>
          <th>${t('pay_tipo')}</th>
          <th class="text-center">Acciones</th>
        </tr></thead>
        <tbody>
          ${payments.map(p => {
            const inv = invoices.find(i => i.id === p.invoiceId);
            const client = clients.find(c => c.id === inv?.clientId);
            return `<tr>
              <td>${formatDate(p.date)}</td>
              <td><span class="mono">${inv?.folio || '—'}</span></td>
              <td>${client?.name || '—'}</td>
              <td>${formatCurrency(p.amount, inv?.currency || 'MXN')}</td>
              <td>${FORMAS_PAGO.find(f => f.clave === p.formaPago)?.descripcion || p.formaPago || '—'}</td>
              <td><span class="badge badge--${p.tipo === 'PUE' ? 'approved' : 'sent'}">${p.tipo || 'PPD'}</span></td>
              <td class="text-center">
                <button class="btn-icon btn-icon--danger" title="Eliminar" data-action="delete" data-id="${p.id}"><i data-lucide="trash-2"></i></button>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>` : `
      <div class="empty-state">
        <i data-lucide="credit-card" class="empty-state__icon"></i>
        <h3>Sin pagos registrados</h3>
        <p>Los pagos de facturas PPD aparecerán aquí</p>
      </div>`}
    </div>`;

  if (window.lucide) lucide.createIcons({ nodes: [container] });

  container.querySelector('#new-payment')?.addEventListener('click', () => window.App?.navigate('payments', { action: 'new' }));
  container.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (btn.dataset.action === 'delete') {
        if (await confirmDialog(t('confirm_delete'))) {
          Store.deletePayment(btn.dataset.id);
          showToast(t('success_deleted'));
          renderPayments(container, params);
        }
      }
    });
  });
}

function renderPaymentForm(container, invoiceId) {
  const t = I18n.t.bind(I18n);
  const invoices = Store.getInvoices().filter(i => i.status === 'stamped');
  const payments = Store.getPayments();
  const clients = Store.getClients();

  const getBalance = (inv) => {
    const paid = payments.filter(p => p.invoiceId === inv.id).reduce((s, p) => s + (p.amount || 0), 0);
    return Math.max(0, (inv.total || 0) - paid);
  };

  container.innerHTML = `
    <div class="page-header">
      <button class="btn btn--ghost btn--sm" id="back-payments"><i data-lucide="arrow-left"></i> ${t('pay_title')}</button>
      <h1 class="page-title">${t('pay_new')}</h1>
    </div>

    <div class="form-grid">
      <div class="card form-card">
        <div class="card__header"><span class="card__title">Registro de pago</span></div>
        <div class="card__body">
          <div class="form-group">
            <label class="form-label required">${t('pay_invoice')}</label>
            <select class="form-control" id="p-invoice">
              <option value="">Seleccionar factura...</option>
              ${invoices.map(inv => {
                const c = clients.find(cl => cl.id === inv.clientId);
                const bal = getBalance(inv);
                return `<option value="${inv.id}" data-balance="${bal}" data-tipo="${inv.metodoPago}" ${invoiceId === inv.id ? 'selected' : ''}>${inv.folio} – ${c?.name || ''} · Saldo: $${bal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</option>`;
              }).join('')}
            </select>
          </div>
          <div class="form-row form-row--2">
            <div class="form-group">
              <label class="form-label required">${t('pay_date')}</label>
              <input class="form-control" id="p-date" type="date" value="${today()}">
            </div>
            <div class="form-group">
              <label class="form-label required">${t('pay_amount')}</label>
              <div class="input-group">
                <span class="input-group__prefix">$</span>
                <input class="form-control" id="p-amount" type="number" min="0.01" step="0.01" value="">
              </div>
            </div>
          </div>
          <div class="form-row form-row--2">
            <div class="form-group">
              <label class="form-label required">${t('pay_forma')}</label>
              <select class="form-control" id="p-forma">
                ${FORMAS_PAGO.map(f => `<option value="${f.clave}">${f.clave} – ${f.descripcion}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">${t('pay_tipo')}</label>
              <input class="form-control" id="p-tipo" value="PPD" readonly>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Número de operación / referencia</label>
            <input class="form-control" id="p-ref" placeholder="REF-123456">
          </div>
          <div id="balance-info" class="alert alert--info" style="display:none"></div>
        </div>
        <div class="card__footer">
          <button class="btn btn--ghost" id="cancel-payment">${t('btn_cancel')}</button>
          <button class="btn btn--primary" id="save-payment"><i data-lucide="save"></i> Registrar pago</button>
        </div>
      </div>
    </div>`;

  if (window.lucide) lucide.createIcons({ nodes: [container] });

  const invSel = container.querySelector('#p-invoice');
  const amtInput = container.querySelector('#p-amount');
  const tipoInput = container.querySelector('#p-tipo');
  const balInfo = container.querySelector('#balance-info');

  const updateBalance = () => {
    const opt = invSel.selectedOptions[0];
    if (!opt?.value) { balInfo.style.display = 'none'; return; }
    const bal = parseFloat(opt.dataset.balance || 0);
    const tipo = opt.dataset.tipo || 'PPD';
    tipoInput.value = tipo;
    balInfo.style.display = '';
    balInfo.innerHTML = `<i data-lucide="info"></i> Saldo pendiente: <strong>$${bal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>`;
    if (window.lucide) lucide.createIcons({ nodes: [balInfo] });
    if (!amtInput.value) amtInput.value = bal.toFixed(2);
  };

  invSel.addEventListener('change', updateBalance);
  if (invoiceId) { invSel.value = invoiceId; updateBalance(); }

  container.querySelector('#back-payments')?.addEventListener('click', () => window.App?.navigate('payments'));
  container.querySelector('#cancel-payment')?.addEventListener('click', () => window.App?.navigate('payments'));
  container.querySelector('#save-payment')?.addEventListener('click', () => {
    const invId = invSel.value;
    const amount = parseFloat(amtInput.value);
    if (!invId || !amount || amount <= 0) { showToast('Selecciona factura y monto', 'error'); return; }

    const payment = {
      id: uid(), invoiceId: invId, date: container.querySelector('#p-date').value,
      amount, formaPago: container.querySelector('#p-forma').value,
      tipo: tipoInput.value || 'PPD',
      referencia: container.querySelector('#p-ref').value,
      createdAt: new Date().toISOString(),
    };
    Store.upsertPayment(payment);

    // Check if fully paid
    const inv = Store.getInvoice(invId);
    if (inv) {
      const allPayments = [...Store.getPayments().filter(p => p.id !== payment.id), payment];
      const totalPaid = allPayments.filter(p => p.invoiceId === invId).reduce((s, p) => s + (p.amount || 0), 0);
      if (totalPaid >= (inv.total || 0)) { inv.status = 'paid'; Store.upsertInvoice(inv); }
    }

    showToast('Pago registrado');
    window.App?.navigate('invoices', { action: 'view', id: invId });
  });
}
