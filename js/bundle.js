// CotizaPro Bundle — auto-generated
(function() {
"use strict";

// ── js/supabase-client.js ──────────────
// Supabase client singleton — credentials injected at build time
const SupabaseClient = {
  _client: null,

  isConfigured() { return true; },

  get() {
    if (!this._client) {
      try {
        if (!window.supabase) { console.error('Supabase SDK not loaded'); return null; }
        this._client = window.supabase.createClient('https://ywypphialkjmnusrnirv.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3eXBwaGlhbGtqbW51c3JuaXJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMzA5NTgsImV4cCI6MjA5MzYwNjk1OH0.isdSFydf-B4QYwLOAU9X0_ODu8p5qAiBSYKILCQO-uA');
      } catch (e) {
        console.error('Supabase client init error:', e);
        return null;
      }
    }
    return this._client;
  },
};


// ── js/store.js ──────────────
// Centralized data store with localStorage persistence
const KEYS = {
  company: 'cot_company',
  clients: 'cot_clients',
  products: 'cot_products',
  quotations: 'cot_quotations',
  invoices: 'cot_invoices',
  payments: 'cot_payments',
  templates: 'cot_templates',
  settings: 'cot_settings',
};

function load(key) {
  try { return JSON.parse(localStorage.getItem(key)) || null; } catch { return null; }
}
function save(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

const defaults = {
  company: {
    name: '', rfc: '', regimenFiscal: '601', domicilioFiscal: '', codigoPostal: '',
    logo: '', serie: 'A', folioInicial: 1, folioFacturaInicial: 1,
    telefono: '', email: '', website: '', cuenta: '', banco: '',
  },
  settings: {
    theme: 'dark', lang: 'es', currency: 'MXN', exchangeRate: 17.50,
    iva: 16, ieps: 0, retIVA: 0, retISR: 0,
    paymentTerms: 30, validityDays: 15,
    approvalMode: 'click',
    portalHeaderColor: '#6366f1',
    quotationsView: 'kanban',
    reminders: {
      noOpen:   { enabled: true,  days: 3 },
      noReply:  { enabled: true,  days: 2 },
      expiring: { enabled: false, days: 2 },
    },
  },
};

const Store = {
  // Company
  getCompany: () => load(KEYS.company) || { ...defaults.company },
  saveCompany(d) { save(KEYS.company, d); this.scheduleSync(); },

  // Settings
  getSettings: () => load(KEYS.settings) || { ...defaults.settings },
  saveSettings(d) { save(KEYS.settings, d); this.scheduleSync(); },

  // Clients
  getClients: () => load(KEYS.clients) || [],
  saveClients(d) { save(KEYS.clients, d); this.scheduleSync(); },
  getClient: (id) => (load(KEYS.clients) || []).find(c => c.id === id),
  upsertClient(client) {
    const list = this.getClients();
    const idx = list.findIndex(c => c.id === client.id);
    if (idx >= 0) list[idx] = client; else list.push(client);
    this.saveClients(list);
    return client;
  },
  deleteClient(id) {
    this.saveClients(this.getClients().filter(c => c.id !== id));
  },

  // Products
  getProducts: () => load(KEYS.products) || [],
  saveProducts(d) { save(KEYS.products, d); this.scheduleSync(); },
  getProduct: (id) => (load(KEYS.products) || []).find(p => p.id === id),
  upsertProduct(product) {
    const list = this.getProducts();
    const idx = list.findIndex(p => p.id === product.id);
    if (idx >= 0) list[idx] = product; else list.push(product);
    this.saveProducts(list);
    return product;
  },
  deleteProduct(id) {
    this.saveProducts(this.getProducts().filter(p => p.id !== id));
  },

  // Quotations
  getQuotations: () => load(KEYS.quotations) || [],
  getQuotation: (id) => (load(KEYS.quotations) || []).find(q => q.id === id),
  upsertQuotation(q) {
    const list = this.getQuotations();
    const idx = list.findIndex(x => x.id === q.id);
    if (idx >= 0) list[idx] = q; else list.push(q);
    save(KEYS.quotations, list);
    this.scheduleSync();
    return q;
  },
  deleteQuotation(id) {
    save(KEYS.quotations, this.getQuotations().filter(q => q.id !== id));
    this.scheduleSync();
  },
  nextQuotationFolio() {
    const company = this.getCompany();
    const all = this.getQuotations();
    if (!all.length) return `${company.serie || 'A'}${String(company.folioInicial || 1).padStart(5, '0')}`;
    const nums = all.map(q => parseInt(q.folio?.replace(/\D/g, '') || '0'));
    return `${company.serie || 'A'}${String(Math.max(...nums) + 1).padStart(5, '0')}`;
  },

  // Invoices
  getInvoices: () => load(KEYS.invoices) || [],
  getInvoice: (id) => (load(KEYS.invoices) || []).find(i => i.id === id),
  upsertInvoice(inv) {
    const list = this.getInvoices();
    const idx = list.findIndex(x => x.id === inv.id);
    if (idx >= 0) list[idx] = inv; else list.push(inv);
    save(KEYS.invoices, list);
    this.scheduleSync();
    return inv;
  },
  deleteInvoice(id) {
    save(KEYS.invoices, this.getInvoices().filter(i => i.id !== id));
    this.scheduleSync();
  },
  nextInvoiceFolio() {
    const company = this.getCompany();
    const all = this.getInvoices();
    const serie = company.serie || 'A';
    if (!all.length) return `${serie}${String(company.folioFacturaInicial || 1).padStart(5, '0')}`;
    const nums = all.map(i => parseInt(i.folio?.replace(/\D/g, '') || '0'));
    return `${serie}${String(Math.max(...nums) + 1).padStart(5, '0')}`;
  },

  // Payments
  getPayments: () => load(KEYS.payments) || [],
  upsertPayment(p) {
    const list = this.getPayments();
    const idx = list.findIndex(x => x.id === p.id);
    if (idx >= 0) list[idx] = p; else list.push(p);
    save(KEYS.payments, list);
    this.scheduleSync();
    return p;
  },
  deletePayment(id) {
    save(KEYS.payments, this.getPayments().filter(p => p.id !== id));
    this.scheduleSync();
  },

  // Templates
  getTemplates: () => load(KEYS.templates) || [],
  upsertTemplate(t) {
    const list = this.getTemplates();
    const idx = list.findIndex(x => x.id === t.id);
    if (idx >= 0) list[idx] = t; else list.push(t);
    save(KEYS.templates, t instanceof Array ? t : list);
    this.scheduleSync();
    return t;
  },
  deleteTemplate(id) {
    save(KEYS.templates, this.getTemplates().filter(t => t.id !== id));
    this.scheduleSync();
  },

  // Utils
  genId: () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7),

  // Clear all local data (used on logout or user switch — preserves app config)
  clearLocalData() {
    Object.values(KEYS).forEach(k => localStorage.removeItem(k));
    localStorage.removeItem('cot_current_user_id');
  },

  // Supabase sync
  _syncTimer: null,

  scheduleSync() {
    if (!window._supSync) return;
    if (this._syncTimer) clearTimeout(this._syncTimer);
    this._syncTimer = setTimeout(async () => {
      const { client, userId } = window._supSync;
      await this.pushToSupabase(client, userId);
      this._syncTimer = null;
    }, 2000);
  },

  async pushToSupabase(client, userId) {
    if (!client) return;
    try {
      const { error } = await client.from('user_data').upsert({
        user_id: userId,
        company: this.getCompany(),
        clients: this.getClients(),
        products: this.getProducts(),
        quotations: this.getQuotations(),
        invoices: this.getInvoices(),
        payments: this.getPayments(),
        templates: this.getTemplates(),
        settings: this.getSettings(),
      }, { onConflict: 'user_id' });
      if (error) console.error('Supabase push error:', error);
    } catch (e) {
      console.error('Supabase push exception:', e);
    }
  },

  async syncFromSupabase(client, userId) {
    try {
      const { data, error } = await client
        .from('user_data')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return 'empty'; // no row yet
        console.error('Supabase pull error:', error);
        return 'error';
      }

      if (data.company && Object.keys(data.company).length > 0) save(KEYS.company, data.company);
      if (Array.isArray(data.clients) && data.clients.length > 0) save(KEYS.clients, data.clients);
      if (Array.isArray(data.products) && data.products.length > 0) save(KEYS.products, data.products);
      if (Array.isArray(data.quotations)) save(KEYS.quotations, data.quotations);
      if (Array.isArray(data.invoices)) save(KEYS.invoices, data.invoices);
      if (Array.isArray(data.payments)) save(KEYS.payments, data.payments);
      if (Array.isArray(data.templates)) save(KEYS.templates, data.templates);
      if (data.settings && Object.keys(data.settings).length > 0) save(KEYS.settings, data.settings);
      return 'ok';
    } catch (e) {
      console.error('Supabase sync exception:', e);
      return 'error';
    }
  },

  // Apply data received from server without triggering a sync push back
  applyServerData(data) {
    if (data.company && Object.keys(data.company).length > 0) save(KEYS.company, data.company);
    if (Array.isArray(data.clients) && data.clients.length > 0) save(KEYS.clients, data.clients);
    if (Array.isArray(data.products) && data.products.length > 0) save(KEYS.products, data.products);
    if (Array.isArray(data.quotations)) save(KEYS.quotations, data.quotations);
    if (Array.isArray(data.invoices)) save(KEYS.invoices, data.invoices);
    if (Array.isArray(data.payments)) save(KEYS.payments, data.payments);
    if (Array.isArray(data.templates)) save(KEYS.templates, data.templates);
    if (data.settings && Object.keys(data.settings).length > 0) save(KEYS.settings, data.settings);
  },

  // Seed demo data if empty
  seedDemo() {
    if (this.getClients().length) return;
    const clients = [
      { id: this.genId(), name: 'Acme Corp S.A. de C.V.', rfc: 'ACM010101ABC', regimenFiscal: '601', email: 'contacto@acme.mx', phone: '5512345678', address: 'Av. Reforma 123, CDMX', usoCFDI: 'G03', currency: 'MXN', createdAt: new Date().toISOString() },
      { id: this.genId(), name: 'TechStart SAPI de CV', rfc: 'TST200615XYZ', regimenFiscal: '601', email: 'admin@techstart.mx', phone: '5598765432', address: 'Polanco 456, CDMX', usoCFDI: 'D01', currency: 'USD', createdAt: new Date().toISOString() },
      { id: this.genId(), name: 'Consultores Digitales S.C.', rfc: 'CDG180301MNO', regimenFiscal: '612', email: 'info@consdig.mx', phone: '5511223344', address: 'Santa Fe 789, CDMX', usoCFDI: 'G01', currency: 'MXN', createdAt: new Date().toISOString() },
    ];
    this.saveClients(clients);

    const products = [
      { id: this.genId(), code: 'SW-001', name: 'Desarrollo Web Frontend', description: 'Desarrollo de interfaces web modernas con React/Vue', claveProdServ: '81111501', claveUnidad: 'E48', unit: 'Hora', price: 850, currency: 'MXN', taxRate: 16, category: 'Desarrollo' },
      { id: this.genId(), code: 'SW-002', name: 'Desarrollo Backend API', description: 'Desarrollo de APIs RESTful y microservicios', claveProdServ: '81111501', claveUnidad: 'E48', unit: 'Hora', price: 950, currency: 'MXN', taxRate: 16, category: 'Desarrollo' },
      { id: this.genId(), code: 'SW-003', name: 'Consultoría de Arquitectura', description: 'Diseño y planeación de arquitectura de software', claveProdServ: '81111605', claveUnidad: 'E48', unit: 'Hora', price: 1800, currency: 'MXN', taxRate: 16, category: 'Consultoría' },
      { id: this.genId(), code: 'SW-004', name: 'Licencia SaaS Mensual', description: 'Suscripción mensual a plataforma en la nube', claveProdServ: '81162200', claveUnidad: 'MO', unit: 'Mes', price: 4500, currency: 'MXN', taxRate: 16, category: 'Licencias' },
      { id: this.genId(), code: 'SW-005', name: 'Soporte Técnico Premium', description: 'Soporte 24/7 con SLA garantizado', claveProdServ: '81111810', claveUnidad: 'MO', unit: 'Mes', price: 12000, currency: 'MXN', taxRate: 16, category: 'Soporte' },
      { id: this.genId(), code: 'DG-001', name: 'Diseño UX/UI', description: 'Diseño de experiencia e interfaz de usuario', claveProdServ: '73160000', claveUnidad: 'E48', unit: 'Hora', price: 750, currency: 'MXN', taxRate: 16, category: 'Diseño' },
    ];
    this.saveProducts(products);
  },
};

window.Store = Store;


// ── js/auth.js ──────────────
// Auth module — login/register overlay using Supabase Auth
const Auth = {
  _session: null,

  async getSession() {
    const client = SupabaseClient.get();
    if (!client) return null;
    try {
      const { data: { session } } = await client.auth.getSession();
      this._session = session;
      return session;
    } catch (e) {
      console.error('getSession error:', e);
      return null;
    }
  },

  async signOut() {
    const client = SupabaseClient.get();
    if (client) await client.auth.signOut();
    this._session = null;
    window._supSync = null;
  },

  getCurrentUser() {
    return this._session?.user || null;
  },

  showScreen(onSuccess) {
    let overlay = document.getElementById('auth-overlay');
    if (overlay) overlay.remove();

    overlay = document.createElement('div');
    overlay.id = 'auth-overlay';
    overlay.className = 'auth-overlay';
    overlay.innerHTML = `
      <div class="auth-card">
        <div class="auth-header">
          <div class="auth-brand-icon"><i data-lucide="zap"></i></div>
          <h1 class="auth-title">CotizaPro</h1>
          <p class="auth-subtitle">Sistema de Cotizaciones y Facturación</p>
        </div>

        <div class="auth-tabs">
          <button class="auth-tab auth-tab--active" data-tab="login">Iniciar sesión</button>
          <button class="auth-tab" data-tab="register">Crear cuenta</button>
        </div>

        <div id="auth-login" class="auth-form">
          <div class="form-group">
            <label class="form-label">Correo electrónico</label>
            <input class="form-control" id="auth-login-email" type="email" placeholder="tu@correo.com" autocomplete="email">
          </div>
          <div class="form-group">
            <label class="form-label">Contraseña</label>
            <input class="form-control" id="auth-login-pass" type="password" placeholder="••••••••" autocomplete="current-password">
          </div>
          <div id="auth-login-error" class="auth-error hidden"></div>
          <button class="btn btn--primary auth-btn" id="auth-login-btn">
            <i data-lucide="log-in"></i> Entrar
          </button>
        </div>

        <div id="auth-register" class="auth-form hidden">
          <div class="form-group">
            <label class="form-label">Correo electrónico</label>
            <input class="form-control" id="auth-reg-email" type="email" placeholder="tu@correo.com" autocomplete="email">
          </div>
          <div class="form-group">
            <label class="form-label">Contraseña</label>
            <input class="form-control" id="auth-reg-pass" type="password" placeholder="Mínimo 6 caracteres" autocomplete="new-password">
          </div>
          <div class="form-group">
            <label class="form-label">Confirmar contraseña</label>
            <input class="form-control" id="auth-reg-pass2" type="password" placeholder="••••••••" autocomplete="new-password">
          </div>
          <div id="auth-reg-error" class="auth-error hidden"></div>
          <button class="btn btn--primary auth-btn" id="auth-reg-btn">
            <i data-lucide="user-plus"></i> Crear cuenta
          </button>
        </div>
      </div>`;

    document.body.appendChild(overlay);
    if (window.lucide) lucide.createIcons({ nodes: [overlay] });

    // Tab switching
    overlay.querySelectorAll('.auth-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        overlay.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('auth-tab--active'));
        tab.classList.add('auth-tab--active');
        overlay.querySelectorAll('.auth-form').forEach(f => f.classList.add('hidden'));
        overlay.querySelector(`#auth-${tab.dataset.tab}`).classList.remove('hidden');
      });
    });

    // Login
    const doLogin = () => Auth._handleLogin(overlay, onSuccess);
    overlay.querySelector('#auth-login-btn').addEventListener('click', doLogin);
    overlay.querySelector('#auth-login-pass').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
    overlay.querySelector('#auth-login-email').addEventListener('keydown', e => { if (e.key === 'Enter') overlay.querySelector('#auth-login-pass').focus(); });

    // Register
    overlay.querySelector('#auth-reg-btn').addEventListener('click', () => Auth._handleRegister(overlay, onSuccess));
  },

  async _handleLogin(overlay, onSuccess) {
    const client = SupabaseClient.get();
    const errEl = overlay.querySelector('#auth-login-error');
    if (!client) {
      errEl.textContent = 'Error de conexión con el servidor. Intenta de nuevo.';
      errEl.classList.remove('hidden');
      return;
    }
    const email = overlay.querySelector('#auth-login-email').value.trim();
    const pass = overlay.querySelector('#auth-login-pass').value;
    if (!email || !pass) {
      errEl.textContent = 'Ingresa correo y contraseña.';
      errEl.classList.remove('hidden');
      return;
    }
    errEl.classList.add('hidden');
    const btn = overlay.querySelector('#auth-login-btn');
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Verificando...';
    if (window.lucide) lucide.createIcons({ nodes: [btn] });

    const { data, error } = await client.auth.signInWithPassword({ email, password: pass });
    if (error) {
      errEl.textContent = _authErrorMsg(error.message);
      errEl.classList.remove('hidden');
      btn.disabled = false;
      btn.innerHTML = '<i data-lucide="log-in"></i> Entrar';
      if (window.lucide) lucide.createIcons({ nodes: [btn] });
      return;
    }
    this._session = data.session;
    overlay.remove();
    onSuccess(data.session);
  },

  async _handleRegister(overlay, onSuccess) {
    const client = SupabaseClient.get();
    const errEl = overlay.querySelector('#auth-reg-error');
    if (!client) {
      errEl.textContent = 'Error de conexión con el servidor. Intenta de nuevo.';
      errEl.classList.remove('hidden');
      return;
    }
    const email = overlay.querySelector('#auth-reg-email').value.trim();
    const pass = overlay.querySelector('#auth-reg-pass').value;
    const pass2 = overlay.querySelector('#auth-reg-pass2').value;
    if (!email || !pass) { errEl.textContent = 'Ingresa correo y contraseña.'; errEl.classList.remove('hidden'); return; }
    if (pass !== pass2) { errEl.textContent = 'Las contraseñas no coinciden.'; errEl.classList.remove('hidden'); return; }
    if (pass.length < 6) { errEl.textContent = 'La contraseña debe tener al menos 6 caracteres.'; errEl.classList.remove('hidden'); return; }
    errEl.classList.add('hidden');

    const btn = overlay.querySelector('#auth-reg-btn');
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Creando cuenta...';
    if (window.lucide) lucide.createIcons({ nodes: [btn] });

    const { data, error } = await client.auth.signUp({ email, password: pass });
    if (error) {
      errEl.textContent = _authErrorMsg(error.message);
      errEl.classList.remove('hidden');
      btn.disabled = false;
      btn.innerHTML = '<i data-lucide="user-plus"></i> Crear cuenta';
      if (window.lucide) lucide.createIcons({ nodes: [btn] });
      return;
    }
    if (data.session) {
      this._session = data.session;
      overlay.remove();
      onSuccess(data.session);
    } else {
      errEl.textContent = '✓ Cuenta creada. Revisa tu correo para confirmar tu cuenta antes de entrar.';
      errEl.classList.remove('hidden');
      errEl.style.color = 'var(--success)';
      btn.disabled = false;
      btn.innerHTML = '<i data-lucide="user-plus"></i> Crear cuenta';
      if (window.lucide) lucide.createIcons({ nodes: [btn] });
    }
  },
};

function _authErrorMsg(msg) {
  if (msg.includes('Invalid login credentials')) return 'Correo o contraseña incorrectos.';
  if (msg.includes('Email not confirmed')) return 'Confirma tu correo antes de entrar.';
  if (msg.includes('User already registered')) return 'Ya existe una cuenta con ese correo.';
  if (msg.includes('Password should be')) return 'La contraseña debe tener al menos 6 caracteres.';
  if (msg.includes('Unable to validate')) return 'URL o clave de Supabase incorrecta.';
  return msg;
}


// ── js/i18n.js ──────────────
const translations = {
  es: {
    // Navigation
    nav_dashboard: 'Dashboard',
    nav_quotations: 'Cotizaciones',
    nav_invoices: 'Facturación',
    nav_clients: 'Clientes',
    nav_products: 'Productos / Servicios',
    nav_templates: 'Plantillas',
    nav_payments: 'Pagos',
    nav_reports: 'Reportes',
    nav_settings: 'Configuración',

    // Dashboard
    dash_title: 'Dashboard',
    dash_total_revenue: 'Ingresos Totales',
    dash_quotations_month: 'Cotizaciones este mes',
    dash_invoices_pending: 'Facturas pendientes',
    dash_conversion: 'Tasa de conversión',
    dash_recent_quotations: 'Cotizaciones recientes',
    dash_top_clients: 'Clientes top',
    dash_revenue_chart: 'Ingresos por mes',
    dash_status_chart: 'Cotizaciones por estado',
    dash_quick_actions: 'Acciones rápidas',
    dash_new_quotation: 'Nueva cotización',
    dash_new_invoice: 'Nueva factura',
    dash_new_client: 'Nuevo cliente',

    // Status
    status_draft: 'Borrador',
    status_sent: 'Enviada',
    status_approved: 'Aprobada',
    status_rejected: 'Rechazada',
    status_invoiced: 'Facturada',
    status_paid: 'Pagada',
    status_cancelled: 'Cancelada',
    status_partial: 'Pago parcial',

    // Quotations
    quot_title: 'Cotizaciones',
    quot_new: 'Nueva cotización',
    quot_edit: 'Editar cotización',
    quot_view: 'Ver cotización',
    quot_folio: 'Folio',
    quot_date: 'Fecha',
    quot_valid_until: 'Válida hasta',
    quot_client: 'Cliente',
    quot_subtotal: 'Subtotal',
    quot_discount: 'Descuento',
    quot_taxes: 'Impuestos',
    quot_total: 'Total',
    quot_status: 'Estado',
    quot_notes: 'Notas',
    quot_terms: 'Términos y condiciones',
    quot_items: 'Partidas',
    quot_add_item: 'Agregar partida',
    quot_product: 'Producto / Servicio',
    quot_description: 'Descripción',
    quot_qty: 'Cantidad',
    quot_unit: 'Unidad',
    quot_unit_price: 'Precio unitario',
    quot_item_discount: 'Desc. %',
    quot_item_tax: 'IVA %',
    quot_item_total: 'Total',
    quot_preview: 'Vista previa',
    quot_send: 'Enviar',
    quot_approve: 'Aprobar',
    quot_reject: 'Rechazar',
    quot_convert: 'Convertir a factura',
    quot_duplicate: 'Duplicar',
    quot_compare: 'Comparar',
    quot_history: 'Historial',
    quot_currency: 'Moneda',
    quot_exchange_rate: 'Tipo de cambio',
    quot_template: 'Plantilla',

    // Invoices
    inv_title: 'Facturación CFDI',
    inv_new: 'Nueva factura',
    inv_folio: 'Folio fiscal',
    inv_uuid: 'UUID',
    inv_metodo_pago: 'Método de pago',
    inv_forma_pago: 'Forma de pago',
    inv_uso_cfdi: 'Uso CFDI',
    inv_regimen: 'Régimen fiscal',
    inv_stamp: 'Timbrar',
    inv_stamped: 'Timbrado',
    inv_download_pdf: 'Descargar PDF',
    inv_download_xml: 'Descargar XML',
    inv_cancel: 'Cancelar CFDI',
    inv_cadena: 'Cadena original',
    inv_sello: 'Sello digital',

    // Clients
    cli_title: 'Clientes',
    cli_new: 'Nuevo cliente',
    cli_edit: 'Editar cliente',
    cli_name: 'Razón social',
    cli_rfc: 'RFC',
    cli_regimen: 'Régimen fiscal',
    cli_uso_cfdi: 'Uso CFDI preferido',
    cli_email: 'Correo electrónico',
    cli_phone: 'Teléfono',
    cli_address: 'Domicilio fiscal',
    cli_currency: 'Moneda preferida',

    // Products
    prod_title: 'Productos y Servicios',
    prod_new: 'Nuevo producto',
    prod_edit: 'Editar producto',
    prod_code: 'Clave interna',
    prod_name: 'Nombre',
    prod_description: 'Descripción',
    prod_clave_prod_serv: 'ClaveProdServ SAT',
    prod_clave_unidad: 'ClaveUnidad SAT',
    prod_unit: 'Unidad de medida',
    prod_price: 'Precio unitario',
    prod_currency: 'Moneda',
    prod_tax_rate: 'Tasa IVA %',
    prod_category: 'Categoría',

    // Templates
    tmpl_title: 'Plantillas',
    tmpl_new: 'Nueva plantilla',
    tmpl_edit: 'Editar plantilla',
    tmpl_name: 'Nombre de plantilla',
    tmpl_use: 'Usar plantilla',

    // Payments
    pay_title: 'Pagos',
    pay_new: 'Registrar pago',
    pay_invoice: 'Factura',
    pay_date: 'Fecha de pago',
    pay_amount: 'Monto',
    pay_forma: 'Forma de pago',
    pay_tipo: 'Tipo',
    pay_complemento: 'Complemento de pago',
    pay_pue: 'PUE – Pago en una exhibición',
    pay_ppd: 'PPD – Pago en parcialidades o diferido',

    // Reports
    rep_title: 'Reportes',
    rep_period: 'Período',
    rep_export_csv: 'Exportar CSV',
    rep_export_pdf: 'Exportar PDF',
    rep_revenue: 'Ingresos',
    rep_quotations: 'Cotizaciones',
    rep_invoices: 'Facturas',
    rep_clients: 'Clientes',

    // Settings
    set_title: 'Configuración',
    set_company: 'Datos de la empresa',
    set_fiscal: 'Configuración fiscal',
    set_appearance: 'Apariencia',
    set_language: 'Idioma',
    set_currency: 'Moneda base',
    set_exchange: 'Tipo de cambio USD/MXN',
    set_iva: 'IVA predeterminado %',
    set_theme: 'Tema',
    set_theme_dark: 'Oscuro',
    set_theme_light: 'Claro',
    set_save: 'Guardar configuración',
    set_company_name: 'Nombre / Razón social',
    set_rfc: 'RFC',
    set_regimen: 'Régimen fiscal',
    set_cp: 'Código postal fiscal',
    set_serie: 'Serie de documentos',
    set_folio_cot: 'Folio inicial cotizaciones',
    set_folio_fac: 'Folio inicial facturas',
    set_logo: 'Logotipo',
    set_banco: 'Banco',
    set_cuenta: 'Número de cuenta / CLABE',
    set_payment_terms: 'Días de crédito predeterminados',
    set_validity: 'Validez de cotización (días)',

    // General
    btn_save: 'Guardar',
    btn_cancel: 'Cancelar',
    btn_delete: 'Eliminar',
    btn_edit: 'Editar',
    btn_view: 'Ver',
    btn_close: 'Cerrar',
    btn_print: 'Imprimir',
    btn_import: 'Importar CSV',
    btn_export: 'Exportar CSV',
    btn_confirm: 'Confirmar',
    confirm_delete: '¿Deseas eliminar este elemento? Esta acción no se puede deshacer.',
    search_placeholder: 'Buscar...',
    no_records: 'Sin registros',
    required_field: 'Este campo es requerido',
    success_saved: 'Guardado correctamente',
    success_deleted: 'Eliminado correctamente',
    error_generic: 'Ocurrió un error',
    loading: 'Cargando...',

    // SAT Catalogues labels
    cat_metodo_pago: 'Método de pago',
    cat_forma_pago: 'Forma de pago',
    cat_uso_cfdi: 'Uso CFDI',
    cat_regimen_fiscal: 'Régimen fiscal',
    of: 'de',
    page: 'Página',
  },
  en: {
    nav_dashboard: 'Dashboard',
    nav_quotations: 'Quotations',
    nav_invoices: 'Invoicing',
    nav_clients: 'Clients',
    nav_products: 'Products / Services',
    nav_templates: 'Templates',
    nav_payments: 'Payments',
    nav_reports: 'Reports',
    nav_settings: 'Settings',

    dash_title: 'Dashboard',
    dash_total_revenue: 'Total Revenue',
    dash_quotations_month: 'Quotations this month',
    dash_invoices_pending: 'Pending invoices',
    dash_conversion: 'Conversion rate',
    dash_recent_quotations: 'Recent quotations',
    dash_top_clients: 'Top clients',
    dash_revenue_chart: 'Revenue by month',
    dash_status_chart: 'Quotations by status',
    dash_quick_actions: 'Quick actions',
    dash_new_quotation: 'New quotation',
    dash_new_invoice: 'New invoice',
    dash_new_client: 'New client',

    status_draft: 'Draft',
    status_sent: 'Sent',
    status_approved: 'Approved',
    status_rejected: 'Rejected',
    status_invoiced: 'Invoiced',
    status_paid: 'Paid',
    status_cancelled: 'Cancelled',
    status_partial: 'Partial payment',

    quot_title: 'Quotations',
    quot_new: 'New quotation',
    quot_edit: 'Edit quotation',
    quot_view: 'View quotation',
    quot_folio: 'Folio',
    quot_date: 'Date',
    quot_valid_until: 'Valid until',
    quot_client: 'Client',
    quot_subtotal: 'Subtotal',
    quot_discount: 'Discount',
    quot_taxes: 'Taxes',
    quot_total: 'Total',
    quot_status: 'Status',
    quot_notes: 'Notes',
    quot_terms: 'Terms & conditions',
    quot_items: 'Line items',
    quot_add_item: 'Add item',
    quot_product: 'Product / Service',
    quot_description: 'Description',
    quot_qty: 'Qty',
    quot_unit: 'Unit',
    quot_unit_price: 'Unit price',
    quot_item_discount: 'Disc. %',
    quot_item_tax: 'VAT %',
    quot_item_total: 'Total',
    quot_preview: 'Preview',
    quot_send: 'Send',
    quot_approve: 'Approve',
    quot_reject: 'Reject',
    quot_convert: 'Convert to invoice',
    quot_duplicate: 'Duplicate',
    quot_compare: 'Compare',
    quot_history: 'History',
    quot_currency: 'Currency',
    quot_exchange_rate: 'Exchange rate',
    quot_template: 'Template',

    inv_title: 'CFDI Invoicing',
    inv_new: 'New invoice',
    inv_folio: 'Fiscal folio',
    inv_uuid: 'UUID',
    inv_metodo_pago: 'Payment method',
    inv_forma_pago: 'Payment form',
    inv_uso_cfdi: 'CFDI use',
    inv_regimen: 'Tax regime',
    inv_stamp: 'Stamp',
    inv_stamped: 'Stamped',
    inv_download_pdf: 'Download PDF',
    inv_download_xml: 'Download XML',
    inv_cancel: 'Cancel CFDI',
    inv_cadena: 'Original string',
    inv_sello: 'Digital seal',

    cli_title: 'Clients',
    cli_new: 'New client',
    cli_edit: 'Edit client',
    cli_name: 'Company name',
    cli_rfc: 'RFC / Tax ID',
    cli_regimen: 'Tax regime',
    cli_uso_cfdi: 'Preferred CFDI use',
    cli_email: 'Email',
    cli_phone: 'Phone',
    cli_address: 'Fiscal address',
    cli_currency: 'Preferred currency',

    prod_title: 'Products & Services',
    prod_new: 'New product',
    prod_edit: 'Edit product',
    prod_code: 'Internal code',
    prod_name: 'Name',
    prod_description: 'Description',
    prod_clave_prod_serv: 'SAT ProdServ Key',
    prod_clave_unidad: 'SAT Unit Key',
    prod_unit: 'Unit of measure',
    prod_price: 'Unit price',
    prod_currency: 'Currency',
    prod_tax_rate: 'VAT rate %',
    prod_category: 'Category',

    tmpl_title: 'Templates',
    tmpl_new: 'New template',
    tmpl_edit: 'Edit template',
    tmpl_name: 'Template name',
    tmpl_use: 'Use template',

    pay_title: 'Payments',
    pay_new: 'Register payment',
    pay_invoice: 'Invoice',
    pay_date: 'Payment date',
    pay_amount: 'Amount',
    pay_forma: 'Payment form',
    pay_tipo: 'Type',
    pay_complemento: 'Payment complement',
    pay_pue: 'PUE – Single payment',
    pay_ppd: 'PPD – Installment/deferred payment',

    rep_title: 'Reports',
    rep_period: 'Period',
    rep_export_csv: 'Export CSV',
    rep_export_pdf: 'Export PDF',
    rep_revenue: 'Revenue',
    rep_quotations: 'Quotations',
    rep_invoices: 'Invoices',
    rep_clients: 'Clients',

    set_title: 'Settings',
    set_company: 'Company data',
    set_fiscal: 'Fiscal configuration',
    set_appearance: 'Appearance',
    set_language: 'Language',
    set_currency: 'Base currency',
    set_exchange: 'USD/MXN exchange rate',
    set_iva: 'Default VAT %',
    set_theme: 'Theme',
    set_theme_dark: 'Dark',
    set_theme_light: 'Light',
    set_save: 'Save settings',
    set_company_name: 'Company name',
    set_rfc: 'RFC / Tax ID',
    set_regimen: 'Tax regime',
    set_cp: 'Postal code',
    set_serie: 'Document series',
    set_folio_cot: 'Quotation starting folio',
    set_folio_fac: 'Invoice starting folio',
    set_logo: 'Logo',
    set_banco: 'Bank',
    set_cuenta: 'Account number / CLABE',
    set_payment_terms: 'Default payment terms (days)',
    set_validity: 'Quotation validity (days)',

    btn_save: 'Save',
    btn_cancel: 'Cancel',
    btn_delete: 'Delete',
    btn_edit: 'Edit',
    btn_view: 'View',
    btn_close: 'Close',
    btn_print: 'Print',
    btn_import: 'Import CSV',
    btn_export: 'Export CSV',
    btn_confirm: 'Confirm',
    confirm_delete: 'Are you sure you want to delete this item? This action cannot be undone.',
    search_placeholder: 'Search...',
    no_records: 'No records found',
    required_field: 'This field is required',
    success_saved: 'Saved successfully',
    success_deleted: 'Deleted successfully',
    error_generic: 'An error occurred',
    loading: 'Loading...',

    cat_metodo_pago: 'Payment method',
    cat_forma_pago: 'Payment form',
    cat_uso_cfdi: 'CFDI use',
    cat_regimen_fiscal: 'Tax regime',
    of: 'of',
    page: 'Page',
  }
};

let currentLang = 'es';

const I18n = {
  setLang(lang) { currentLang = lang; },
  getLang() { return currentLang; },
  t(key) { return translations[currentLang]?.[key] || translations.es[key] || key; },
};

window.I18n = I18n;



// ── js/catalogs.js ──────────────
// SAT CFDI 4.0 Catalogs

const REGIMENES_FISCALES = [
  { clave: '601', descripcion: 'General de Ley Personas Morales' },
  { clave: '603', descripcion: 'Personas Morales con Fines no Lucrativos' },
  { clave: '605', descripcion: 'Sueldos y Salarios e Ingresos Asimilados a Salarios' },
  { clave: '606', descripcion: 'Arrendamiento' },
  { clave: '607', descripcion: 'Régimen de Enajenación o Adquisición de Bienes' },
  { clave: '608', descripcion: 'Demás ingresos' },
  { clave: '610', descripcion: 'Residentes en el Extranjero sin Establecimiento Permanente en México' },
  { clave: '611', descripcion: 'Ingresos por Dividendos (socios y accionistas)' },
  { clave: '612', descripcion: 'Personas Físicas con Actividades Empresariales y Profesionales' },
  { clave: '614', descripcion: 'Ingresos por intereses' },
  { clave: '615', descripcion: 'Régimen de los ingresos por obtención de premios' },
  { clave: '616', descripcion: 'Sin obligaciones fiscales' },
  { clave: '620', descripcion: 'Sociedades Cooperativas de Producción que optan por diferir sus ingresos' },
  { clave: '621', descripcion: 'Incorporación Fiscal' },
  { clave: '622', descripcion: 'Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras' },
  { clave: '623', descripcion: 'Opcional para Grupos de Sociedades' },
  { clave: '624', descripcion: 'Coordinados' },
  { clave: '625', descripcion: 'Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas' },
  { clave: '626', descripcion: 'Régimen Simplificado de Confianza – RESICO' },
];

const USOS_CFDI = [
  { clave: 'G01', descripcion: 'Adquisición de mercancias' },
  { clave: 'G02', descripcion: 'Devoluciones, descuentos o bonificaciones' },
  { clave: 'G03', descripcion: 'Gastos en general' },
  { clave: 'I01', descripcion: 'Construcciones' },
  { clave: 'I02', descripcion: 'Mobiliario y equipo de oficina por inversiones' },
  { clave: 'I03', descripcion: 'Equipo de transporte' },
  { clave: 'I04', descripcion: 'Equipo de computo y accesorios' },
  { clave: 'I05', descripcion: 'Dados, troqueles, moldes, matrices y herramental' },
  { clave: 'I06', descripcion: 'Comunicaciones telefónicas' },
  { clave: 'I07', descripcion: 'Comunicaciones satelitales' },
  { clave: 'I08', descripcion: 'Otra maquinaria y equipo' },
  { clave: 'D01', descripcion: 'Honorarios médicos, dentales y gastos hospitalarios' },
  { clave: 'D02', descripcion: 'Gastos médicos por incapacidad o discapacidad' },
  { clave: 'D03', descripcion: 'Gastos funerales' },
  { clave: 'D04', descripcion: 'Donativos' },
  { clave: 'D05', descripcion: 'Intereses reales efectivamente pagados por créditos hipotecarios (casa habitación)' },
  { clave: 'D06', descripcion: 'Aportaciones voluntarias al SAR' },
  { clave: 'D07', descripcion: 'Primas por seguros de gastos médicos' },
  { clave: 'D08', descripcion: 'Gastos de transportación escolar obligatoria' },
  { clave: 'D09', descripcion: 'Depósitos en cuentas para el ahorro, primas que tengan como base planes de pensiones' },
  { clave: 'D10', descripcion: 'Pagos por servicios educativos (colegiaturas)' },
  { clave: 'S01', descripcion: 'Sin efectos fiscales' },
  { clave: 'CP01', descripcion: 'Pagos' },
  { clave: 'CN01', descripcion: 'Nómina' },
];

const METODOS_PAGO = [
  { clave: 'PUE', descripcion: 'PUE – Pago en una sola exhibición' },
  { clave: 'PPD', descripcion: 'PPD – Pago en parcialidades o diferido' },
];

const FORMAS_PAGO = [
  { clave: '01', descripcion: 'Efectivo' },
  { clave: '02', descripcion: 'Cheque nominativo' },
  { clave: '03', descripcion: 'Transferencia electrónica de fondos' },
  { clave: '04', descripcion: 'Tarjeta de crédito' },
  { clave: '05', descripcion: 'Monedero electrónico' },
  { clave: '06', descripcion: 'Dinero electrónico' },
  { clave: '08', descripcion: 'Vales de despensa' },
  { clave: '12', descripcion: 'Dación en pago' },
  { clave: '13', descripcion: 'Pago por subrogación' },
  { clave: '14', descripcion: 'Pago por consignación' },
  { clave: '15', descripcion: 'Condonación' },
  { clave: '17', descripcion: 'Compensación' },
  { clave: '23', descripcion: 'Novación' },
  { clave: '24', descripcion: 'Confusión' },
  { clave: '25', descripcion: 'Remisión de deuda' },
  { clave: '26', descripcion: 'Prescripción o caducidad' },
  { clave: '27', descripcion: 'A satisfacción del acreedor' },
  { clave: '28', descripcion: 'Tarjeta de débito' },
  { clave: '29', descripcion: 'Tarjeta de servicios' },
  { clave: '30', descripcion: 'Aplicación de anticipos' },
  { clave: '31', descripcion: 'Intermediario pagos' },
  { clave: '99', descripcion: 'Por definir' },
];

const CLAVES_PROD_SERV = [
  { clave: '81111501', descripcion: 'Servicios de programación de sistemas informáticos' },
  { clave: '81111502', descripcion: 'Servicios de análisis de sistemas informáticos' },
  { clave: '81111503', descripcion: 'Servicios de diseño de sistemas informáticos' },
  { clave: '81111504', descripcion: 'Servicios de integración de sistemas' },
  { clave: '81111600', descripcion: 'Servicios de gestión de sistemas de información' },
  { clave: '81111605', descripcion: 'Consultoría en tecnologías de la información' },
  { clave: '81111810', descripcion: 'Soporte técnico de sistemas informáticos' },
  { clave: '81162200', descripcion: 'Servicios de software como servicio (SaaS)' },
  { clave: '73160000', descripcion: 'Servicios de diseño gráfico' },
  { clave: '73151500', descripcion: 'Servicios de publicidad' },
  { clave: '80101500', descripcion: 'Servicios de gestión de proyectos' },
  { clave: '80141600', descripcion: 'Servicios de consultoría empresarial' },
  { clave: '80141601', descripcion: 'Servicios de asesoría empresarial' },
  { clave: '85101700', descripcion: 'Servicios de capacitación y formación' },
  { clave: '43230000', descripcion: 'Software' },
  { clave: '43231500', descripcion: 'Software de aplicación empresarial' },
  { clave: '43231513', descripcion: 'Software de gestión de relaciones con clientes' },
  { clave: '84121800', descripcion: 'Servicios contables' },
  { clave: '84121802', descripcion: 'Servicios de auditoría' },
  { clave: '84101500', descripcion: 'Servicios legales' },
  { clave: '72154300', descripcion: 'Servicios de alojamiento web' },
];

const CLAVES_UNIDAD = [
  { clave: 'E48', descripcion: 'Servicio / Unidad de servicio' },
  { clave: 'H87', descripcion: 'Pieza' },
  { clave: 'ACT', descripcion: 'Actividad' },
  { clave: 'MO', descripcion: 'Mes' },
  { clave: 'AN', descripcion: 'Año' },
  { clave: 'DIA', descripcion: 'Día' },
  { clave: 'HUR', descripcion: 'Hora' },
  { clave: 'KT', descripcion: 'Kit' },
  { clave: 'LT', descripcion: 'Litro' },
  { clave: 'KGM', descripcion: 'Kilogramo' },
  { clave: 'MTR', descripcion: 'Metro' },
  { clave: 'XBX', descripcion: 'Caja' },
  { clave: 'SET', descripcion: 'Conjunto' },
  { clave: 'LIC', descripcion: 'Licencia' },
  { clave: 'PRY', descripcion: 'Proyecto' },
];

const CURRENCIES = [
  { code: 'MXN', symbol: '$', name: 'Peso mexicano' },
  { code: 'USD', symbol: '$', name: 'Dólar americano' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
];

function formatCurrency(amount, currency = 'MXN') {
  const c = CURRENCIES.find(x => x.code === currency) || CURRENCIES[0];
  return `${c.symbol}${Number(amount || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

function numberToWords(num) {
  // Spanish number to words (simplified for amounts)
  const ones = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE',
    'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
  const tens = ['', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
  const hundreds = ['', 'CIEN', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

  if (num === 0) return 'CERO';
  if (num < 0) return 'MENOS ' + numberToWords(-num);

  let result = '';
  const intPart = Math.floor(num);
  const decPart = Math.round((num - intPart) * 100);

  const toWords = (n) => {
    if (n === 0) return '';
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' Y ' + ones[n % 10] : '');
    if (n < 1000) {
      const h = Math.floor(n / 100);
      const r = n % 100;
      const hWord = h === 1 && r > 0 ? 'CIENTO' : hundreds[h];
      return hWord + (r ? ' ' + toWords(r) : '');
    }
    if (n < 1000000) {
      const t = Math.floor(n / 1000);
      const r = n % 1000;
      const tWord = t === 1 ? 'MIL' : toWords(t) + ' MIL';
      return tWord + (r ? ' ' + toWords(r) : '');
    }
    const m = Math.floor(n / 1000000);
    const r = n % 1000000;
    const mWord = m === 1 ? 'UN MILLÓN' : toWords(m) + ' MILLONES';
    return mWord + (r ? ' ' + toWords(r) : '');
  };

  result = toWords(intPart);
  return `${result} ${String(decPart).padStart(2, '0')}/100 M.N.`;
}


// ── js/utils.js ──────────────
// import { formatCurrency } from './catalogs.js';
// import Store from './store.js';

function uid() { return Store.genId(); }

function today() { return new Date().toISOString().slice(0, 10); }

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function calcQuotationTotals(items) {
  let subtotal = 0, discountTotal = 0, taxTotal = 0;
  for (const item of items) {
    const base = (item.qty || 0) * (item.unitPrice || 0);
    const disc = base * ((item.discount || 0) / 100);
    const afterDisc = base - disc;
    const tax = afterDisc * ((item.taxRate || 0) / 100);
    subtotal += base;
    discountTotal += disc;
    taxTotal += tax;
  }
  const total = subtotal - discountTotal + taxTotal;
  return { subtotal, discountTotal, taxTotal, total };
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16).toUpperCase();
  });
}

function generateCadenaOriginal(invoice, company) {
  const fecha = invoice.date;
  const uuid = invoice.uuid || '';
  return `||4.0|${uuid}|${fecha}T12:00:00|${company.rfc}|${company.name}|${invoice.clientRfc || ''}|${invoice.clientName || ''}|${invoice.regimenFiscal || '601'}|${invoice.total?.toFixed(2) || '0.00'}|MXN|1|${invoice.usoCFDI || 'G03'}||`;
}

function generateSello() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let s = '';
  for (let i = 0; i < 344; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s + '==';
}

function generateNoCertificado() {
  return Array.from({ length: 20 }, () => Math.floor(Math.random() * 10)).join('');
}

function generateQRData(invoice) {
  return `https://verificacfdi.facturaelectronica.sat.gob.mx/default.aspx?id=${invoice.uuid}&re=${invoice.companyRfc}&rr=${invoice.clientRfc}&tt=${invoice.total?.toFixed(2)}&fe=${(invoice.sello || '').slice(-8)}`;
}

function escapeXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeHTML(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function generateCFDIXml(invoice, company) {
  const esc = escapeXml;
  const items = invoice.items || [];

  const conceptos = items.map(item => {
    const importe = ((item.qty || 0) * (item.unitPrice || 0) * (1 - (item.discount || 0) / 100)).toFixed(2);
    const impuesto = (parseFloat(importe) * ((item.taxRate || 16) / 100)).toFixed(2);
    return `
    <cfdi:Concepto ClaveProdServ="${esc(item.claveProdServ || '81111501')}" Cantidad="${item.qty || 1}" ClaveUnidad="${esc(item.claveUnidad || 'E48')}" Unidad="${esc(item.unit || 'Servicio')}" Descripcion="${esc(item.description || item.name || '')}" ValorUnitario="${(item.unitPrice || 0).toFixed(2)}" Importe="${importe}" Descuento="${((item.qty || 0) * (item.unitPrice || 0) * (item.discount || 0) / 100).toFixed(2)}" ObjetoImp="02">
      <cfdi:Impuestos>
        <cfdi:Traslados>
          <cfdi:Traslado Base="${importe}" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="${impuesto}"/>
        </cfdi:Traslados>
      </cfdi:Impuestos>
    </cfdi:Concepto>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd" Version="4.0" Serie="${esc(company.serie || 'A')}" Folio="${esc(invoice.folio || '')}" Fecha="${invoice.date || today()}T12:00:00" Sello="${esc(invoice.sello || generateSello())}" FormaPago="${esc(invoice.formaPago || '03')}" NoCertificado="${esc(invoice.noCertificado || generateNoCertificado())}" Certificado="" SubTotal="${(invoice.subtotal || 0).toFixed(2)}" Descuento="${(invoice.discountTotal || 0).toFixed(2)}" Moneda="${esc(invoice.currency || 'MXN')}" Total="${(invoice.total || 0).toFixed(2)}" TipoDeComprobante="I" Exportacion="01" MetodoPago="${esc(invoice.metodoPago || 'PUE')}" LugarExpedicion="${esc(company.codigoPostal || '06600')}">
  <cfdi:Emisor Rfc="${esc(company.rfc || '')}" Nombre="${esc(company.name || '')}" RegimenFiscal="${esc(company.regimenFiscal || '601')}"/>
  <cfdi:Receptor Rfc="${esc(invoice.clientRfc || '')}" Nombre="${esc(invoice.clientName || '')}" DomicilioFiscalReceptor="${esc(invoice.clientCP || '00000')}" RegimenFiscalReceptor="${esc(invoice.clientRegimen || '616')}" UsoCFDI="${esc(invoice.usoCFDI || 'G03')}"/>
  <cfdi:Conceptos>${conceptos}
  </cfdi:Conceptos>
  <cfdi:Impuestos TotalImpuestosTrasladados="${(invoice.taxTotal || 0).toFixed(2)}">
    <cfdi:Traslados>
      <cfdi:Traslado Base="${(invoice.subtotal || 0).toFixed(2)}" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="${(invoice.taxTotal || 0).toFixed(2)}"/>
    </cfdi:Traslados>
  </cfdi:Impuestos>
  <cfdi:Complemento>
    <tfd:TimbreFiscalDigital xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital" xsi:schemaLocation="http://www.sat.gob.mx/TimbreFiscalDigital http://www.sat.gob.mx/sitio_internet/cfd/TimbreFiscalDigital/TimbreFiscalDigitalv11.xsd" Version="1.1" UUID="${esc(invoice.uuid || generateUUID())}" FechaTimbrado="${invoice.date || today()}T12:00:00" RfcProvCertif="SAT970701NN3" SelloCFD="${esc(invoice.sello || '')}" NoCertificadoSAT="00001000000504465028" SelloSAT="${esc(generateSello())}"/>
  </cfdi:Complemento>
</cfdi:Comprobante>`;
}

function downloadFile(filename, content, type = 'text/xml') {
  const blob = new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function exportCSV(headers, rows, filename) {
  const lines = [headers.join(','), ...rows.map(r => r.map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(','))];
  downloadFile(filename, lines.join('\n'), 'text/csv;charset=utf-8;');
}

function importCSV(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const lines = e.target.result.split('\n').filter(l => l.trim());
      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
      const rows = lines.slice(1).map(line => {
        const vals = line.match(/(".*?"|[^,]+)(?=,|$)/g) || [];
        const obj = {};
        headers.forEach((h, i) => { obj[h] = (vals[i] || '').replace(/^"|"$/g, '').trim(); });
        return obj;
      });
      resolve(rows);
    };
    reader.onerror = reject;
    reader.readAsText(file, 'utf-8');
  });
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  const icons = { success: 'check-circle', error: 'x-circle', warning: 'alert-triangle', info: 'info' };
  toast.innerHTML = `<i data-lucide="${icons[type] || 'info'}" class="toast__icon"></i><span>${message}</span>`;
  container.appendChild(toast);
  if (window.lucide) lucide.createIcons({ nodes: [toast] });
  requestAnimationFrame(() => toast.classList.add('toast--visible'));
  setTimeout(() => {
    toast.classList.remove('toast--visible');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function confirmDialog(message) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay modal-overlay--active';
    overlay.innerHTML = `
      <div class="modal modal--sm">
        <div class="modal__body">
          <div class="confirm-icon"><i data-lucide="alert-triangle"></i></div>
          <p class="confirm-message">${message}</p>
        </div>
        <div class="modal__footer">
          <button class="btn btn--ghost" id="confirm-no">Cancelar</button>
          <button class="btn btn--danger" id="confirm-yes">Eliminar</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    if (window.lucide) lucide.createIcons({ nodes: [overlay] });
    overlay.querySelector('#confirm-yes').onclick = () => { overlay.remove(); resolve(true); };
    overlay.querySelector('#confirm-no').onclick = () => { overlay.remove(); resolve(false); };
  });
}

function buildSelectOptions(options, valueKey, labelKey, selectedValue = '') {
  return options.map(o => `<option value="${o[valueKey]}" ${o[valueKey] === selectedValue ? 'selected' : ''}>${o[valueKey]} – ${o[labelKey]}</option>`).join('');
}

function debounce(fn, ms = 300) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

function generatePublicToken() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}




// ── js/modules/dashboard.js ──────────────
// import Store from '../store.js';
// import I18n from '../i18n.js';
// import { formatCurrency, formatDate } from '../utils.js';

let revenueChart = null;
let statusChart = null;

function renderDashboard(container) {
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


// ── js/modules/clients.js ──────────────
// import Store from '../store.js';
// import I18n from '../i18n.js';
// import { uid, showToast, confirmDialog, exportCSV, importCSV, debounce, formatDate, formatCurrency, escapeHTML } from '../utils.js';
// import { REGIMENES_FISCALES, USOS_CFDI, CURRENCIES } from '../catalogs.js';

let clientsSearch = '';

function renderClients(container, params = {}) {
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


// ── js/modules/products.js ──────────────
// import Store from '../store.js';
// import I18n from '../i18n.js';
// import { uid, showToast, confirmDialog, exportCSV, debounce, escapeHTML } from '../utils.js';
// import { CLAVES_PROD_SERV, CLAVES_UNIDAD, CURRENCIES } from '../catalogs.js';

let prodsSearch = '';
let prodsCatFilter = '';

function renderProducts(container, params = {}) {
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


// ── js/modules/quotations.js ──────────────
// import Store from '../store.js';
// import I18n from '../i18n.js';
// import { uid, today, addDays, formatDate, calcQuotationTotals, showToast, confirmDialog, exportCSV, debounce, formatCurrency, generatePublicToken, escapeHTML } from '../utils.js';
// import { CURRENCIES } from '../catalogs.js';
// import { renderKanban } from './kanban.js';

let quotsFilter = '';
let quotsSearch = '';
let _quotPollTimer = null;
let _syncInProgress = false;

async function _syncAndRefresh(container, params) {
  if (!window._supSync || _syncInProgress) return;
  _syncInProgress = true;
  const btn = container.querySelector('#sync-quot');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Actualizando...';
    if (window.lucide) lucide.createIcons({ nodes: [btn] });
  }
  try {
    const { client, userId } = window._supSync;
    await Store.syncFromSupabase(client, userId);
    renderQuotations(container, params);
  } finally {
    _syncInProgress = false;
  }
}

function renderQuotations(container, params = {}) {
  if (_quotPollTimer) { clearInterval(_quotPollTimer); _quotPollTimer = null; }
  const t = I18n.t.bind(I18n);
  if (params.action === 'new' || params.action === 'edit') return renderQuotationForm(container, params.id, params);
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
        <button class="btn btn--ghost btn--sm" id="sync-quot" title="Sincronizar con la nube"><i data-lucide="refresh-cw"></i> Actualizar</button>
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
              <td><span class="mono link-cell" data-action="view" data-id="${q.id}">${escapeHTML(q.folio)}</span></td>
              <td>${escapeHTML(client?.name || '—')}</td>
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

  container.querySelector('#sync-quot')?.addEventListener('click', () => _syncAndRefresh(container, params));

  if (window._supSync) {
    _quotPollTimer = setInterval(() => {
      if (!document.body.contains(container)) {
        clearInterval(_quotPollTimer);
        _quotPollTimer = null;
        return;
      }
      _syncAndRefresh(container, params);
    }, 60000);
  }
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

  // Insert token only on first send (reuse existing if already sent)
  if (!q.publicToken) {
    const { error } = await client
      .from('quote_tokens')
      .insert({ token, user_id: userId, quote_id: q.id });
    if (error) {
      showToast('Error al generar el link: ' + error.message, 'error');
      return;
    }
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
function renderQuotationForm(container, id, params = {}) {
  const t = I18n.t.bind(I18n);
  const q = id ? Store.getQuotation(id) : null;
  const baseQ = params.basedOn ? Store.getQuotation(params.basedOn) : null;
  const settings = Store.getSettings();
  const clients = Store.getClients();
  const products = Store.getProducts();
  const templates = Store.getTemplates();

  let items = q?.items
    ? JSON.parse(JSON.stringify(q.items))
    : baseQ?.items
      ? JSON.parse(JSON.stringify(baseQ.items))
      : [newItem(settings)];

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
                  ${clients.map(c => `<option value="${c.id}" ${c.id === (q?.clientId || baseQ?.clientId) ? 'selected' : ''}>${escapeHTML(c.name)} – ${escapeHTML(c.rfc)}</option>`).join('')}
                </select>
                <div id="client-products-panel" class="client-products-panel" style="display:none">
                  <div class="client-products-panel__title">
                    <i data-lucide="history"></i> Usados con este cliente
                  </div>
                  <div class="client-products-panel__items" id="client-products-list"></div>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">${t('quot_template')}</label>
                <select class="form-control" id="q-template">
                  <option value="">Sin plantilla</option>
                  ${templates.map(tp => `<option value="${tp.id}">${escapeHTML(tp.name)}</option>`).join('')}
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

  // ─── Client product suggestions ───────────────────────────────────────────
  function updateClientSuggestions(clientId) {
    const panel = container.querySelector('#client-products-panel');
    const list  = container.querySelector('#client-products-list');
    if (!panel || !list || !clientId) { if (panel) panel.style.display = 'none'; return; }

    const clientQuots = Store.getQuotations().filter(cq => cq.clientId === clientId);
    const used = {};
    for (const cq of clientQuots) {
      for (const item of (cq.items || [])) {
        const key = item.productId || item.description;
        if (!used[key] || new Date(cq.date) > new Date(used[key]._lastDate || 0)) {
          used[key] = { ...item, _lastDate: cq.date };
        }
      }
    }
    const suggestions = Object.values(used).slice(0, 8);
    if (!suggestions.length) { panel.style.display = 'none'; return; }

    panel.style.display = 'block';
    list.innerHTML = suggestions.map((item, i) =>
      `<button class="client-product-chip" data-idx="${i}">
         ${escapeHTML(item.description || item.name || '—')} · ${formatCurrency(item.unitPrice || 0, item.currency || 'MXN')}
       </button>`
    ).join('');

    list.querySelectorAll('.client-product-chip').forEach((btn, i) => {
      btn.addEventListener('click', () => {
        items.push({ ...newItem(settings), ...suggestions[i], id: uid() });
        const body = container.querySelector('#items-body');
        if (body) {
          body.innerHTML = items.map((it, idx) => renderItemRow(it, idx, products)).join('');
          bindItemEvents(container, items, products, settings, t);
          if (window.lucide) lucide.createIcons({ nodes: [body] });
        }
      });
    });
  }

  container.querySelector('#q-client')?.addEventListener('change', e => {
    updateClientSuggestions(e.target.value);
  });

  // Trigger on load if client is pre-selected
  updateClientSuggestions(container.querySelector('#q-client')?.value || '');
  // ─────────────────────────────────────────────────────────────────────────

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
  container.querySelector('#save-draft')?.addEventListener('click', () => saveQuotation(container, items, q, 'draft', params));
  container.querySelector('#save-quot')?.addEventListener('click', () => saveQuotation(container, items, q, 'sent', params));
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

function saveQuotation(container, items, existing, status, params = {}) {
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
    basedOnId: params.basedOn || null,
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
      <h1 class="page-title">${escapeHTML(q.folio)} <span class="badge badge--${q.status} badge--lg">${t(`status_${q.status}`)}</span></h1>
      <div class="page-actions">
        ${actions.map(a => `<button class="btn btn--${a.style}" data-action="${a.action}"><i data-lucide="${a.icon}"></i> ${a.label}</button>`).join('')}
        <button class="btn btn--ghost btn--sm" id="btn-whatsapp" title="Compartir por WhatsApp"><i data-lucide="message-circle"></i> WhatsApp</button>
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
              <dt>Folio</dt><dd class="mono">${escapeHTML(q.folio)}</dd>
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
                    <p class="timeline-event">${escapeHTML(h.event)}</p>
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
            <h2>${escapeHTML(company.name || 'Mi Empresa')}</h2>
            <p>RFC: ${escapeHTML(company.rfc || '—')}</p>
            <p>${escapeHTML(company.domicilioFiscal || '')}</p>
            <p>${escapeHTML(company.email || '')} ${company.telefono ? '· ' + escapeHTML(company.telefono) : ''}</p>
          </div>
        </div>
        <div class="doc-meta">
          <h1 class="doc-type">COTIZACIÓN</h1>
          <table class="doc-meta-table">
            <tr><td>Folio:</td><td class="mono">${escapeHTML(q.folio)}</td></tr>
            <tr><td>Fecha:</td><td>${formatDate(q.date)}</td></tr>
            <tr><td>Válida hasta:</td><td>${formatDate(q.validUntil)}</td></tr>
            <tr><td>Moneda:</td><td>${q.currency}</td></tr>
          </table>
        </div>
      </div>

      <div class="doc-client">
        <div class="doc-section-label">CLIENTE</div>
        <h3>${escapeHTML(client?.name || '—')}</h3>
        <p>RFC: ${escapeHTML(client?.rfc || '—')}</p>
        <p>${escapeHTML(client?.address || '')}</p>
        <p>${escapeHTML(client?.email || '')}</p>
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
              <td>${escapeHTML(item.description || '')}</td>
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

      ${q.notes ? `<div class="doc-notes"><div class="doc-section-label">NOTAS</div><p>${escapeHTML(q.notes)}</p></div>` : ''}
      ${q.terms ? `<div class="doc-terms"><div class="doc-section-label">TÉRMINOS Y CONDICIONES</div><p>${escapeHTML(q.terms)}</p></div>` : ''}

      ${company.cuenta ? `<div class="doc-payment"><div class="doc-section-label">DATOS DE PAGO</div><p>${company.banco ? escapeHTML(company.banco) + ' · ' : ''}${escapeHTML(company.cuenta)}</p></div>` : ''}

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




// ── js/modules/invoices.js ──────────────
// import Store from '../store.js';
// import I18n from '../i18n.js';
// import { uid, today, formatDate, calcQuotationTotals, showToast, confirmDialog, generateUUID, generateSello, generateNoCertificado, generateCadenaOriginal, generateQRData, generateCFDIXml, downloadFile, formatCurrency, debounce, escapeHTML } from '../utils.js';
// import { REGIMENES_FISCALES, USOS_CFDI, METODOS_PAGO, FORMAS_PAGO, CURRENCIES, numberToWords } from '../catalogs.js';
// import { buildDocumentPreview, printDocumentFromHtml } from './quotations.js';

let invsFilter = '';

function renderInvoices(container, params = {}) {
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


// ── js/modules/payments.js ──────────────
// import Store from '../store.js';
// import I18n from '../i18n.js';
// import { uid, today, formatDate, showToast, confirmDialog, formatCurrency } from '../utils.js';
// import { FORMAS_PAGO } from '../catalogs.js';

function renderPayments(container, params = {}) {
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


// ── js/modules/templates.js ──────────────
// import Store from '../store.js';
// import I18n from '../i18n.js';
// import { uid, showToast, confirmDialog, formatCurrency, calcQuotationTotals } from '../utils.js';

function renderTemplates(container, params = {}) {
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


// ── js/modules/reports.js ──────────────
// import Store from '../store.js';
// import I18n from '../i18n.js';
// import { formatCurrency, exportCSV, formatDate } from '../utils.js';

let reportChart = null;

function renderReports(container) {
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


// ── js/modules/settings.js ──────────────
// import Store from '../store.js';
// import I18n from '../i18n.js';
// import { showToast, escapeHTML } from '../utils.js';
// import { REGIMENES_FISCALES, CURRENCIES } from '../catalogs.js';

function renderSettings(container) {
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


// ── js/modules/kanban.js ──────────────
// import Store from '../store.js';
// import { formatCurrency } from '../utils.js';

const COLUMNS = [
  { id: 'draft',    label: 'Borrador',  color: '#64748b', statuses: ['draft'] },
  { id: 'sent',     label: 'Enviada',   color: '#6366f1', statuses: ['sent', 'changes_requested'] },
  { id: 'approved', label: 'Aprobada',  color: '#22c55e', statuses: ['approved'] },
  { id: 'invoiced', label: 'Facturada', color: '#3b82f6', statuses: ['invoiced'] },
  { id: 'rejected', label: 'Rechazada', color: '#ef4444', statuses: ['rejected'], collapsible: true },
];

function clientBadge(q) {
  if (q.status === 'approved')          return '<span class="tracking-badge tracking-badge--approved">✓ Aprobada</span>';
  if (q.status === 'rejected')          return '<span class="tracking-badge tracking-badge--rejected">✕ Rechazada</span>';
  if (q.status === 'changes_requested') return '<span class="tracking-badge tracking-badge--changes">✎ Cambios solicitados</span>';
  if (q.viewedAt) {
    const diff  = Math.floor((Date.now() - new Date(q.viewedAt).getTime()) / 60000);
    const label = diff < 60 ? `hace ${diff}m` : diff < 1440 ? `hace ${Math.floor(diff/60)}h` : `hace ${Math.floor(diff/1440)}d`;
    return `<span class="tracking-badge tracking-badge--viewed">👁 Vista ${label}</span>`;
  }
  return '';
}

function urgencyClass(q, settings) {
  if (q.status !== 'sent') return '';
  const rem  = settings.reminders || {};
  const ref  = q.sentAt || q.date;
  if (!ref) return '';
  const days = (Date.now() - new Date(ref).getTime()) / 86400000;

  if (q.viewedAt) {
    const dv = (Date.now() - new Date(q.viewedAt).getTime()) / 86400000;
    if (rem.noReply?.enabled && dv >= (rem.noReply.days || 2)) return 'kanban-card--warn-orange';
  } else {
    if (rem.noOpen?.enabled && days >= (rem.noOpen.days || 3)) return 'kanban-card--warn-yellow';
  }
  return '';
}

function daysLabel(q) {
  const ref = q.sentAt || q.date;
  if (!ref) return '';
  const d = Math.floor((Date.now() - new Date(ref).getTime()) / 86400000);
  return d > 0 ? `${d}d` : 'Hoy';
}

function renderKanban(container) {
  const clients    = Store.getClients();
  const quotations = Store.getQuotations();
  const settings   = Store.getSettings();

  container.innerHTML = `
    <div class="kanban-board">
      ${COLUMNS.map(col => {
        const cards = quotations.filter(q => col.statuses.includes(q.status));
        return `
          <div class="kanban-col" data-col="${col.id}">
            <div class="kanban-col__header ${col.collapsible ? 'kanban-col__header--collapsible' : ''}"
                 style="border-top-color:${col.color}">
              <span class="kanban-col__label" style="color:${col.color}">${col.label}</span>
              <span class="kanban-col__count">${cards.length}</span>
              ${col.collapsible ? '<i data-lucide="chevron-down" class="kanban-col__chevron"></i>' : ''}
            </div>
            <div class="kanban-col__body ${col.collapsible ? 'kanban-col__body--collapsed' : ''}">
              ${cards.length === 0 ? '<div class="kanban-col__empty">—</div>' :
                cards.map(q => {
                  const client = clients.find(c => c.id === q.clientId);
                  const urgent = urgencyClass(q, settings);
                  return `
                    <div class="kanban-card ${urgent}" data-id="${q.id}">
                      <div class="kanban-card__client">${client?.name || '—'}</div>
                      <div class="kanban-card__meta">
                        <span class="mono">${q.folio || ''}</span>
                        ${col.id === 'sent' ? `<span class="kanban-card__days">${daysLabel(q)}</span>` : ''}
                      </div>
                      <div class="kanban-card__amount">${formatCurrency(q.total, q.currency)}</div>
                      ${clientBadge(q)}
                      ${q.status === 'approved' ? `
                        <button class="btn btn--primary btn--xs kanban-card__convert" data-id="${q.id}">
                          <i data-lucide="receipt"></i> Convertir a factura
                        </button>` : ''}
                    </div>`;
                }).join('')}
            </div>
          </div>`;
      }).join('')}
    </div>`;

  if (window.lucide) lucide.createIcons({ nodes: [container] });

  container.querySelectorAll('.kanban-card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('.kanban-card__convert')) return;
      window.App?.navigate('quotations', { action: 'view', id: card.dataset.id });
    });
  });

  container.querySelectorAll('.kanban-card__convert').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      window.App?.navigate('invoices', { action: 'new', fromQuotation: btn.dataset.id });
    });
  });

  container.querySelectorAll('.kanban-col__header--collapsible').forEach(header => {
    header.addEventListener('click', () => {
      const body    = header.nextElementSibling;
      const chevron = header.querySelector('[data-lucide="chevron-down"]');
      body.classList.toggle('kanban-col__body--collapsed');
      if (chevron) {
        chevron.style.transform = body.classList.contains('kanban-col__body--collapsed') ? '' : 'rotate(180deg)';
      }
    });
  });
}


// ── js/reminders.js ──────────────
// import Store from './store.js';

const MS = 86400000;

function evaluateReminders() {
  const settings   = Store.getSettings();
  const rem        = settings.reminders || {};
  const quotations = Store.getQuotations();
  const now        = Date.now();
  const pending    = [];

  for (const q of quotations) {
    if (q.status !== 'sent') continue;
    const sent = q.reminderSent || {};
    const ref  = q.sentAt || q.date;

    if (rem.noOpen?.enabled && !q.viewedAt && !sent.noOpen && ref) {
      if ((now - new Date(ref).getTime()) / MS >= (rem.noOpen.days || 3)) {
        pending.push({ q, type: 'noOpen' });
      }
    }
    if (rem.noReply?.enabled && q.viewedAt && !sent.noReply) {
      if ((now - new Date(q.viewedAt).getTime()) / MS >= (rem.noReply.days || 2)) {
        pending.push({ q, type: 'noReply' });
      }
    }
    if (rem.expiring?.enabled && q.validUntil && !sent.expiring) {
      const left = (new Date(q.validUntil).getTime() - now) / MS;
      if (left > 0 && left <= (rem.expiring.days || 2)) {
        pending.push({ q, type: 'expiring' });
      }
    }
  }

  // Mark as sent so they don't fire again
  for (const { q, type } of pending) {
    Store.upsertQuotation({ ...q, reminderSent: { ...(q.reminderSent || {}), [type]: true } });
  }

  return pending;
}


// ── js/app.js ──────────────
// import Store from './store.js';
// import { evaluateReminders } from './reminders.js';
// import I18n from './i18n.js';
// import { renderDashboard } from './modules/dashboard.js';
// import { renderClients } from './modules/clients.js';
// import { renderProducts } from './modules/products.js';
// import { renderQuotations } from './modules/quotations.js';
// import { renderInvoices } from './modules/invoices.js';
// import { renderPayments } from './modules/payments.js';
// import { renderTemplates } from './modules/templates.js';
// import { renderReports } from './modules/reports.js';
// import { renderSettings } from './modules/settings.js';

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

  const session = await Auth.getSession();
  if (!session) {
    Auth.showScreen(bootWithSession);
    return;
  }
  await bootWithSession(session);
}

document.addEventListener('DOMContentLoaded', init);


// Register globals
window.Store = Store;
window.I18n = I18n;

})();
