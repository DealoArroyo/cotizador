import Store from '../store.js';
import I18n from '../i18n.js';
import { formatCurrency, formatDate } from '../utils.js';

let revenueChart = null;
let statusChart = null;

export function renderDashboard(container) {
  const t = I18n.t.bind(I18n);
  const quotations = Store.getQuotations();
  const invoices = Store.getInvoices();
  const payments = Store.getPayments();
  const clients = Store.getClients();
  const settings = Store.getSettings();

  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const thisMonthQ = quotations.filter(q => (q.date || '').startsWith(monthKey));
  const approvedQ = quotations.filter(q => q.status === 'approved' || q.status === 'invoiced');
  const totalRevenue = invoices.filter(i => i.status !== 'cancelled').reduce((s, i) => s + (i.total || 0), 0);
  const pendingInvoices = invoices.filter(i => i.status === 'stamped' && i.metodoPago === 'PPD');
  const pendingAmount = pendingInvoices.reduce((s, i) => {
    const paid = payments.filter(p => p.invoiceId === i.id).reduce((a, p) => a + (p.amount || 0), 0);
    return s + Math.max(0, (i.total || 0) - paid);
  }, 0);
  const conversionRate = quotations.length ? Math.round((approvedQ.length / quotations.length) * 100) : 0;

  // Revenue by month (last 6)
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: d.toLocaleString('es-MX', { month: 'short' }) });
  }
  const revenueData = months.map(m => ({
    label: m.label,
    value: invoices.filter(i => (i.date || '').startsWith(m.key) && i.status !== 'cancelled').reduce((s, i) => s + (i.total || 0), 0),
  }));

  // Status breakdown
  const statuses = ['draft', 'sent', 'approved', 'rejected', 'invoiced'];
  const statusColors = { draft: '#6b7280', sent: '#3b82f6', approved: '#10b981', rejected: '#ef4444', invoiced: '#8b5cf6' };
  const statusData = statuses.map(s => ({ label: t(`status_${s}`), value: quotations.filter(q => q.status === s).length, color: statusColors[s] }));

  // Top clients
  const clientRevenue = {};
  invoices.forEach(inv => {
    if (inv.status !== 'cancelled') {
      clientRevenue[inv.clientId] = (clientRevenue[inv.clientId] || 0) + (inv.total || 0);
    }
  });
  const topClients = Object.entries(clientRevenue)
    .sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([id, rev]) => ({ client: clients.find(c => c.id === id), revenue: rev }))
    .filter(x => x.client);

  // Recent quotations
  const recentQ = [...quotations].sort((a, b) => (b.date || '') > (a.date || '') ? 1 : -1).slice(0, 5);

  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">${t('dash_title')}</h1>
      <div class="page-actions">
        <button class="btn btn--primary" id="dash-new-quot"><i data-lucide="file-plus"></i> ${t('dash_new_quotation')}</button>
        <button class="btn btn--secondary" id="dash-new-invoice"><i data-lucide="receipt"></i> ${t('dash_new_invoice')}</button>
      </div>
    </div>

    <div class="metrics-grid">
      <div class="metric-card metric-card--revenue">
        <div class="metric-card__icon"><i data-lucide="trending-up"></i></div>
        <div class="metric-card__body">
          <span class="metric-card__label">${t('dash_total_revenue')}</span>
          <span class="metric-card__value">${formatCurrency(totalRevenue, settings.currency)}</span>
          <span class="metric-card__sub">${invoices.filter(i => i.status !== 'cancelled').length} facturas</span>
        </div>
      </div>
      <div class="metric-card metric-card--quotations">
        <div class="metric-card__icon"><i data-lucide="file-text"></i></div>
        <div class="metric-card__body">
          <span class="metric-card__label">${t('dash_quotations_month')}</span>
          <span class="metric-card__value">${thisMonthQ.length}</span>
          <span class="metric-card__sub">${quotations.length} total</span>
        </div>
      </div>
      <div class="metric-card metric-card--pending">
        <div class="metric-card__icon"><i data-lucide="clock"></i></div>
        <div class="metric-card__body">
          <span class="metric-card__label">${t('dash_invoices_pending')}</span>
          <span class="metric-card__value">${formatCurrency(pendingAmount, settings.currency)}</span>
          <span class="metric-card__sub">${pendingInvoices.length} facturas PPD</span>
        </div>
      </div>
      <div class="metric-card metric-card--conversion">
        <div class="metric-card__icon"><i data-lucide="percent"></i></div>
        <div class="metric-card__body">
          <span class="metric-card__label">${t('dash_conversion')}</span>
          <span class="metric-card__value">${conversionRate}%</span>
          <span class="metric-card__sub">${approvedQ.length} ${t('of')} ${quotations.length}</span>
        </div>
      </div>
    </div>

    <div class="dashboard-grid">
      <div class="card card--chart">
        <div class="card__header">
          <span class="card__title">${t('dash_revenue_chart')}</span>
        </div>
        <div class="card__body">
          <canvas id="revenue-chart" height="200"></canvas>
        </div>
      </div>
      <div class="card card--chart">
        <div class="card__header">
          <span class="card__title">${t('dash_status_chart')}</span>
        </div>
        <div class="card__body chart-body--doughnut">
          <canvas id="status-chart" height="200"></canvas>
          <div class="chart-legend" id="status-legend"></div>
        </div>
      </div>
    </div>

    <div class="dashboard-grid dashboard-grid--2col">
      <div class="card">
        <div class="card__header">
          <span class="card__title">${t('dash_recent_quotations')}</span>
          <button class="btn btn--ghost btn--sm" id="dash-all-quot">Ver todas</button>
        </div>
        <div class="card__body p-0">
          ${recentQ.length ? `
          <table class="table table--compact">
            <thead><tr>
              <th>${t('quot_folio')}</th>
              <th>${t('quot_client')}</th>
              <th>${t('quot_total')}</th>
              <th>${t('quot_status')}</th>
            </tr></thead>
            <tbody>
              ${recentQ.map(q => {
                const client = clients.find(c => c.id === q.clientId);
                return `<tr class="table-row-link" data-quot="${q.id}">
                  <td><span class="mono">${q.folio}</span></td>
                  <td>${client?.name || '—'}</td>
                  <td>${formatCurrency(q.total, q.currency)}</td>
                  <td><span class="badge badge--${q.status}">${t(`status_${q.status}`)}</span></td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>` : `<div class="empty-state empty-state--sm"><p>${t('no_records')}</p></div>`}
        </div>
      </div>

      <div class="card">
        <div class="card__header">
          <span class="card__title">${t('dash_top_clients')}</span>
        </div>
        <div class="card__body p-0">
          ${topClients.length ? `
          <div class="top-clients-list">
            ${topClients.map((item, idx) => `
              <div class="top-client-row">
                <div class="top-client-rank">${idx + 1}</div>
                <div class="top-client-avatar">${(item.client.name || '?')[0].toUpperCase()}</div>
                <div class="top-client-info">
                  <span class="top-client-name">${item.client.name}</span>
                  <span class="top-client-rfc">${item.client.rfc}</span>
                </div>
                <span class="top-client-amount">${formatCurrency(item.revenue, settings.currency)}</span>
              </div>`).join('')}
          </div>` : `<div class="empty-state empty-state--sm"><p>${t('no_records')}</p></div>`}
        </div>
      </div>
    </div>`;

  if (window.lucide) lucide.createIcons({ nodes: [container] });

  // Charts
  requestAnimationFrame(() => {
    drawRevenueChart(revenueData);
    drawStatusChart(statusData);
  });

  // Events
  container.querySelector('#dash-new-quot')?.addEventListener('click', () => window.App?.navigate('quotations', { action: 'new' }));
  container.querySelector('#dash-new-invoice')?.addEventListener('click', () => window.App?.navigate('invoices', { action: 'new' }));
  container.querySelector('#dash-all-quot')?.addEventListener('click', () => window.App?.navigate('quotations'));
  container.querySelectorAll('.table-row-link').forEach(row => {
    row.addEventListener('click', () => window.App?.navigate('quotations', { action: 'view', id: row.dataset.quot }));
  });
}

function drawRevenueChart(data) {
  const canvas = document.getElementById('revenue-chart');
  if (!canvas || !window.Chart) return;
  if (revenueChart) { revenueChart.destroy(); revenueChart = null; }
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const textColor = isDark ? '#9ca3af' : '#6b7280';
  revenueChart = new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels: data.map(d => d.label),
      datasets: [{
        label: 'Ingresos',
        data: data.map(d => d.value),
        backgroundColor: 'rgba(99, 102, 241, 0.7)',
        borderColor: 'rgba(99, 102, 241, 1)',
        borderWidth: 2,
        borderRadius: 6,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: gridColor }, ticks: { color: textColor } },
        y: { grid: { color: gridColor }, ticks: { color: textColor, callback: v => '$' + v.toLocaleString('es-MX') } },
      },
    },
  });
}

function drawStatusChart(data) {
  const canvas = document.getElementById('status-chart');
  if (!canvas || !window.Chart) return;
  if (statusChart) { statusChart.destroy(); statusChart = null; }
  const legend = document.getElementById('status-legend');
  if (legend) {
    legend.innerHTML = data.map(d => `
      <div class="legend-item">
        <span class="legend-dot" style="background:${d.color}"></span>
        <span class="legend-label">${d.label}</span>
        <span class="legend-value">${d.value}</span>
      </div>`).join('');
  }
  statusChart = new Chart(canvas.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: data.map(d => d.label),
      datasets: [{
        data: data.map(d => d.value || 0.001),
        backgroundColor: data.map(d => d.color),
        borderWidth: 2,
        borderColor: 'transparent',
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      cutout: '70%',
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.raw === 0.001 ? 0 : ctx.raw}` } } },
    },
  });
}
