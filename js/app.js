import Store from './store.js';
import { evaluateReminders } from './reminders.js';
import I18n from './i18n.js';
import { renderDashboard } from './modules/dashboard.js';
import { renderClients } from './modules/clients.js';
import { renderProducts } from './modules/products.js';
import { renderQuotations } from './modules/quotations.js';
import { renderInvoices } from './modules/invoices.js';
import { renderPayments } from './modules/payments.js';
import { renderTemplates } from './modules/templates.js';
import { renderReports } from './modules/reports.js';
import { renderSettings } from './modules/settings.js';

const routes = {
  dashboard: renderDashboard,
  clients: renderClients,
  products: renderProducts,
  quotations: renderQuotations,
  invoices: renderInvoices,
  payments: renderPayments,
  templates: renderTemplates,
  reports: renderReports,
  settings: renderSettings,
};

const navItems = [
  { id: 'dashboard', icon: 'layout-dashboard', labelKey: 'nav_dashboard' },
  { id: 'quotations', icon: 'file-text', labelKey: 'nav_quotations' },
  { id: 'invoices', icon: 'receipt', labelKey: 'nav_invoices' },
  { separator: true },
  { id: 'clients', icon: 'users', labelKey: 'nav_clients' },
  { id: 'products', icon: 'package', labelKey: 'nav_products' },
  { id: 'templates', icon: 'layout-template', labelKey: 'nav_templates' },
  { separator: true },
  { id: 'payments', icon: 'credit-card', labelKey: 'nav_payments' },
  { id: 'reports', icon: 'bar-chart-2', labelKey: 'nav_reports' },
  { separator: true },
  { id: 'settings', icon: 'settings', labelKey: 'nav_settings' },
];

let currentRoute = 'dashboard';
let currentParams = {};

function buildNav() {
  const t = I18n.t.bind(I18n);
  const settings = Store.getSettings();
  const company = Store.getCompany();
  const user = Auth.getCurrentUser();

  const navHTML = navItems.map(item => {
    if (item.separator) return '<div class="nav-separator"></div>';
    return `
      <button class="nav-item ${currentRoute === item.id ? 'nav-item--active' : ''}" data-route="${item.id}">
        <i data-lucide="${item.icon}" class="nav-item__icon"></i>
        <span class="nav-item__label">${t(item.labelKey)}</span>
      </button>`;
  }).join('');

  const userFooter = user ? `
    <div class="sidebar-user">
      <i data-lucide="user-circle-2"></i>
      <span class="sidebar-user__email" title="${user.email}">${user.email}</span>
    </div>` : '';

  const logoutBtn = user ? `
    <button class="sidebar-footer-btn sidebar-footer-btn--danger" id="btn-logout" title="Cerrar sesión">
      <i data-lucide="log-out"></i>
    </button>` : '';

  return `
    <aside class="sidebar" id="sidebar">
      <div class="sidebar__header">
        <div class="sidebar__brand">
          ${company.logo ? `<img src="${company.logo}" class="brand-logo">` : `<div class="brand-icon"><i data-lucide="zap"></i></div>`}
          <div class="brand-text">
            <span class="brand-name">${company.name || 'CotizaPro'}</span>
            <span class="brand-rfc">${company.rfc || 'RFC—'}</span>
          </div>
        </div>
      </div>
      <nav class="sidebar__nav">
        ${navHTML}
      </nav>
      ${userFooter}
      <div class="sidebar__footer">
        <button class="sidebar-footer-btn" id="toggle-theme" title="Cambiar tema">
          <i data-lucide="${settings.theme === 'dark' ? 'sun' : 'moon'}"></i>
        </button>
        <button class="sidebar-footer-btn" id="toggle-lang" title="Cambiar idioma">
          <i data-lucide="globe"></i>
          <span>${settings.lang === 'es' ? 'EN' : 'ES'}</span>
        </button>
        ${logoutBtn}
        <button class="sidebar-footer-btn" id="sidebar-collapse" title="Colapsar">
          <i data-lucide="panel-left-close"></i>
        </button>
      </div>
    </aside>`;
}

function render() {
  const settings = Store.getSettings();
  document.documentElement.setAttribute('data-theme', settings.theme || 'dark');
  I18n.setLang(settings.lang || 'es');

  const app = document.getElementById('app');
  const mainContent = document.getElementById('main-content');

  const existingSidebar = document.getElementById('sidebar');
  if (existingSidebar) existingSidebar.outerHTML = buildNav();
  else app.insertAdjacentHTML('afterbegin', buildNav());

  if (window.lucide) lucide.createIcons({ nodes: [document.getElementById('sidebar')] });

  document.querySelectorAll('.nav-item[data-route]').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.route));
  });

  document.getElementById('toggle-theme')?.addEventListener('click', () => {
    const s = Store.getSettings();
    const newTheme = s.theme === 'dark' ? 'light' : 'dark';
    Store.saveSettings({ ...s, theme: newTheme });
    document.documentElement.setAttribute('data-theme', newTheme);
    render();
  });

  document.getElementById('toggle-lang')?.addEventListener('click', () => {
    const s = Store.getSettings();
    const newLang = s.lang === 'es' ? 'en' : 'es';
    Store.saveSettings({ ...s, lang: newLang });
    I18n.setLang(newLang);
    render();
  });

  document.getElementById('sidebar-collapse')?.addEventListener('click', () => {
    document.getElementById('sidebar')?.classList.toggle('sidebar--collapsed');
    document.getElementById('layout')?.classList.toggle('layout--collapsed');
  });

  document.getElementById('mobile-menu-btn')?.addEventListener('click', () => {
    document.getElementById('sidebar')?.classList.toggle('sidebar--open');
  });

  document.getElementById('btn-logout')?.addEventListener('click', async () => {
    if (!confirm('¿Cerrar sesión?')) return;
    await Auth.signOut();
    window._supSync = null;
    Store.clearLocalData();   // wipe local cache on logout
    currentRoute = 'dashboard';
    Auth.showScreen(bootWithSession);
  });

  if (mainContent && routes[currentRoute]) {
    routes[currentRoute](mainContent, currentParams);
    if (window.lucide) lucide.createIcons({ nodes: [mainContent] });
  }
}

function navigate(route, params = {}) {
  currentRoute = route;
  currentParams = params;
  const settings = Store.getSettings();
  document.documentElement.setAttribute('data-theme', settings.theme || 'dark');
  I18n.setLang(settings.lang || 'es');

  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('nav-item--active', btn.dataset.route === route);
  });

  const mainContent = document.getElementById('main-content');
  if (mainContent && routes[route]) {
    mainContent.scrollTop = 0;
    routes[route](mainContent, params);
    if (window.lucide) lucide.createIcons({ nodes: [mainContent] });
  }
}

async function bootWithSession(session) {
  const client = SupabaseClient.get();
  const userId = session.user.id;

  // ── User isolation: clear local cache if a different user logged in ──
  const cachedUserId = localStorage.getItem('cot_current_user_id');
  if (cachedUserId && cachedUserId !== userId) {
    Store.clearLocalData();
  }
  localStorage.setItem('cot_current_user_id', userId);

  // Enable auto-sync before seeding so seedDemo pushes new data
  window._supSync = { client, userId };

  // Show sync indicator
  const main = document.getElementById('main-content');
  if (main) {
    main.innerHTML = `<div class="sync-loading"><i data-lucide="loader-2" class="spin"></i><span>Sincronizando datos...</span></div>`;
    if (window.lucide) lucide.createIcons({ nodes: [main] });
  }

  const result = await Store.syncFromSupabase(client, userId);
  if (result === 'error') {
    if (main) main.innerHTML = `<div class="sync-loading"><i data-lucide="wifi-off"></i><span>Sin conexión — usando datos locales.</span></div>`;
  }

  Store.seedDemo();
  render();

  // Evaluate reminders after boot
  if (typeof evaluateReminders === 'function') {
    const pending = evaluateReminders();
    if (pending.length) {
      const quotNav = document.querySelector('[data-route="quotations"]');
      if (quotNav) {
        quotNav.insertAdjacentHTML('beforeend', `<span class="nav-badge">${pending.length}</span>`);
      }
    }
  }
}

const App = {
  navigate,
  setLang(lang) {
    Store.saveSettings({ ...Store.getSettings(), lang });
    I18n.setLang(lang);
    render();
  },
};

window.App = App;

async function init() {
  const settings = Store.getSettings();
  document.documentElement.setAttribute('data-theme', settings.theme || 'dark');
  I18n.setLang(settings.lang || 'es');

  if (!SupabaseClient.isConfigured()) {
    Auth.showScreen(bootWithSession);
    return;
  }

  const session = await Auth.getSession();
  if (!session) {
    Auth.showScreen(bootWithSession);
    return;
  }
  await bootWithSession(session);
}

document.addEventListener('DOMContentLoaded', init);
