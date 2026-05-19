// Supabase client singleton — credentials injected at build time
const SupabaseClient = {
  _client: null,

  isConfigured() { return true; },

  get() {
    if (!this._client) {
      try {
        if (!window.supabase) { console.error('Supabase SDK not loaded'); return null; }
        this._client = window.supabase.createClient('__SUPABASE_URL__', '__SUPABASE_ANON_KEY__');
      } catch (e) {
        console.error('Supabase client init error:', e);
        return null;
      }
    }
    return this._client;
  },
};
