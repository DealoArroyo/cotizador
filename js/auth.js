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
      errEl.textContent = 'Primero configura tu proyecto Supabase (ver "Configuración" abajo).';
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
      errEl.textContent = 'Primero configura tu proyecto Supabase.';
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
