// Supabase client singleton — configured via Settings or the auth screen
const SupabaseClient = {
  _client: null,

  getConfig() {
    return {
      url: localStorage.getItem('cot_supabase_url') || '',
      anonKey: localStorage.getItem('cot_supabase_anon_key') || '',
    };
  },

  saveConfig(url, anonKey) {
    localStorage.setItem('cot_supabase_url', url.trim());
    localStorage.setItem('cot_supabase_anon_key', anonKey.trim());
    this._client = null;
  },

  isConfigured() {
    const { url, anonKey } = this.getConfig();
    return !!(url && anonKey);
  },

  get() {
    if (!this.isConfigured()) return null;
    if (!this._client) {
      const { url, anonKey } = this.getConfig();
      try {
        if (!window.supabase) { console.error('Supabase SDK not loaded'); return null; }
        this._client = window.supabase.createClient(url, anonKey);
      } catch (e) {
        console.error('Supabase client init error:', e);
        return null;
      }
    }
    return this._client;
  },

  reset() {
    this._client = null;
  },
};
