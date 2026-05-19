import Store from '../store.js';
import I18n from '../i18n.js';
import { formatCurrency, exportCSV, formatDate } from '../utils.js';

let reportChart = null;

export function renderReports(container) {
  const t = I18n.t.bind(I18n);
  const quotations = Store.getQuotations();
  const invoices = Store.getInvoices();
  const payments = Store.getPayments();
  const clients = Store.getClients();
  const settings = Store.getSettings();

  // Revenue by month (12 months)
  const now = new Date();
  const months = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: `${d.toLocaleString('es-MX', { month: 'short' })} ${d.getFullYear()}` });
  }

  const revenueByMonth = months.map(m => ({
    label: m.label,
    facturas: invoices.filter(i => (i.date || '').startsWith(m.key) && i.status !== 'cancelled').reduce((s, i) => s + (i.total || 0), 0),
    cotizaciones: quotations.filter(q => (q.date || '').startsWith(m.key)).reduce((s, q) => s + (q.total || 0), 0),
  }));

  // Client breakdown
  const clientRevenue = {};
  invoices.forEach(inv => {
    if (inv.status !== 'cancelled') clientRevenue[inv.clientId] = (clientRevenue[inv.clientId] || 0) + (inv.total || 0);
  });
  const topClients = Object.entries(clientRevenue).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([id, rev]) => ({ client: clients.find(c => c.id === id), rev })).filter(x => x.client);

  // KPIs
  const totalRevenue = invoices.filter(i => i.status !== 'cancelled').reduce((s, i) => s + (i.total || 0), 0);
  const totalPending = invoices.filter(i => i.status === 'stamped').reduce((s, i) => {
    const paid = payments.filter(p => p.invoiceId === i.id).reduce((a, p) => a + (p.amount || 0), 0);
    return s + Math.max(0, (i.total || 0) - paid);
  }, 0);
  const avgQuotation = quotations.length ? quotations.reduce((s, q) => s + (q.total || 0), 0) / quotations.length : 0;
  const conversionRate = quotations.length ? ((quotations.filter(q => q.status === 'approved' || q.status === 'invoiced').length / quotations.length) * 100).toFixed(1) : 0;

  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">${t('rep_title')}</h1>
      <div class="page-actions">
        <button class="btn btn--ghost btn--sm" id="export-rep-quotations"><i data-lucide="download"></i> Exportar cotizaciones</button>
        <button class="btn btn--ghost btn--sm" id="export-rep-invoices"><i data-lucide="download"></i> Exportar facturas</button>
      </div>
    </div>

    <div class="metrics-grid">
      <div class="metric-card metric-card--revenue">
        <div class="metric-card__icon"><i data-lucide="trending-up"></i></div>
        <div class="metric-card__body">
          <span class="metric-card__label">Ingresos totales</span>
          <span class="metric-card__value">${formatCurrency(totalRevenue, settings.currency)}</span>
        </div>
      </div>
      <div class="metric-card metric-card--pending">
        <div class="metric-card__icon"><i data-lucide="clock"></i></div>
        <div class="metric-card__body">
          <span class="metric-card__label">Por cobrar</span>
          <span class="metric-card__value">${formatCurrency(totalPending, settings.currency)}</span>
        </div>
      </div>
      <div class="metric-card metric-card--quotations">
        <div class="metric-card__icon"><i data-lucide="file-text"></i></div>
        <div class="metric-card__body">
          <span class="metric-card__label">Cotización promedio</span>
          <span class="metric-card__value">${formatCurrency(avgQuotation, settings.currency)}</span>
        </div>
      </div>
      <div class="metric-card metric-card--conversion">
        <div class="metric-card__icon"><i data-lucide="percent"></i></div>
        <div class="metric-card__body">
          <span class="metric-card__label">Tasa de conversión</span>
          <span class="metric-card__value">${conversionRate}%</span>
        </div>
      </div>
    </div>

    <div class="card card--chart mb-6">
      <div class="card__header">
        <span class="card__title">Ingresos vs Cotizaciones (12 meses)</span>
      </div>
      <div class="card__body">
        <canvas id="report-chart" height="250"></canvas>
      </div>
    </div>

    <div class="dashboard-grid dashboard-grid--2col">
      <div class="card">
        <div class="card__header">
          <span class="card__title">Ingresos por cliente</span>
        </div>
        <div class="card__body p-0">
          ${topClients.length ? `
          <table class="table table--compact">
            <thead><tr><th>Cliente</th><th>RFC</th><th class="text-right">Ingresos</th><th class="text-right">%</th></tr></thead>
            <tbody>
              ${topClients.map(item => `
              <tr>
                <td>${item.client.name}</td>
                <td class="mono text-xs">${item.client.rfc}</td>
                <td class="text-right">${formatCurrency(item.rev, settings.currency)}</td>
                <td class="text-right">${totalRevenue ? ((item.rev / totalRevenue) * 100).toFixed(1) : 0}%</td>
              </tr>`).join('')}
            </tbody>
          </table>` : '<div class="empty-state empty-state--sm"><p>Sin datos</p></div>'}
        </div>
      </div>

      <div class="card">
        <div class="card__header"><span class="card__title">Cotizaciones por estado</span></div>
        <div class="card__body p-0">
          <table class="table table--compact">
            <thead><tr><th>Estado</th><th class="text-right">Cantidad</th><th class="text-right">Monto</th></tr></thead>
            <tbody>
              ${['draft','sent','approved','rejected','invoiced'].map(s => {
                const filtered = quotations.filter(q => q.status === s);
                const total = filtered.reduce((a, q) => a + (q.total || 0), 0);
                return `<tr>
                  <td><span class="badge badge--${s}">${t(`status_${s}`)}</span></td>
                  <td class="text-right">${filtered.length}</td>
                  <td class="text-right">${formatCurrency(total, settings.currency)}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>`;

  if (window.lucide) lucide.createIcons({ nodes: [container] });

  requestAnimationFrame(() => drawReportChart(revenueByMonth));

  container.querySelector('#export-rep-quotations')?.addEventListener('click', () => {
    const clients = Store.getClients();
    exportCSV(
      ['Folio', 'Fecha', 'Cliente', 'RFC', 'Subtotal', 'Descuento', 'IVA', 'Total', 'Moneda', 'Estado'],
      quotations.map(q => {
        const c = clients.find(x => x.id === q.clientId);
        return [q.folio, q.date, c?.name || '', c?.rfc || '', q.subtotal, q.discountTotal, q.taxTotal, q.total, q.currency, q.status];
      }), 'reporte_cotizaciones.csv'
    );
  });

  container.querySelector('#export-rep-invoices')?.addEventListener('click', () => {
    const clients = Store.getClients();
    exportCSV(
      ['Folio', 'UUID', 'Fecha', 'Cliente', 'RFC', 'Subtotal', 'IVA', 'Total', 'Moneda', 'Método', 'Forma', 'Estado'],
      invoices.map(i => {
        const c = clients.find(x => x.id === i.clientId);
        return [i.folio, i.uuid || '', i.date, c?.name || '', c?.rfc || i.clientRfc || '', i.subtotal, i.taxTotal, i.total, i.currency, i.metodoPago, i.formaPago, i.status];
      }), 'reporte_facturas.csv'
    );
  });
}

function drawReportChart(data) {
  const canvas = document.getElementById('report-chart');
  if (!canvas || !window.Chart) return;
  if (reportChart) { reportChart.destroy(); reportChart = null; }
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const textColor = isDark ? '#9ca3af' : '#6b7280';
  reportChart = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels: data.map(d => d.label),
      datasets: [
        { label: 'Ingresos facturados', data: data.map(d => d.facturas), borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', fill: true, tension: 0.3, pointRadius: 4 },
        { label: 'Cotizaciones', data: data.map(d => d.cotizaciones), borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.1)', fill: true, tension: 0.3, pointRadius: 4, borderDash: [5, 5] },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: textColor } } },
      scales: {
        x: { grid: { color: gridColor }, ticks: { color: textColor, maxRotation: 45 } },
        y: { grid: { color: gridColor }, ticks: { color: textColor, callback: v => '$' + v.toLocaleString('es-MX') } },
      },
    },
  });
}
