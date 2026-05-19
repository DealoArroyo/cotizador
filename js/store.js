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

export default Store;
