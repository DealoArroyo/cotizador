function renderBillingCard(container) {
  const plan = window._plan || 'free';
  const sub = window._subscription;
  const isPro = plan === 'pro';
  const periodEnd = sub?.current_period_end
    ? new Date(sub.current_period_end).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;
  const cancelAtEnd = sub?.cancel_at_period_end;

  const card = document.createElement('div');
  card.className = 'card';
  card.innerHTML = `
    <div class="card__header">
      <span class="card__title"><i data-lucide="zap"></i> Plan y Facturación</span>
      <span class="badge ${isPro ? 'badge--success' : 'badge--default'}">${isPro ? 'Pro' : 'Gratuito'}</span>
    </div>
    <div class="card__body">
      ${isPro ? `
        <p class="text-sm text-muted">
          ${cancelAtEnd
            ? `Tu suscripción se cancelará el <strong>${periodEnd}</strong>.`
            : `Próxima renovación: <strong>${periodEnd || '—'}</strong>`}
        </p>
        <div style="margin-top:16px">
          <button class="btn btn--secondary" id="btn-manage-sub">
            <i data-lucide="settings"></i> Gestionar suscripción
          </button>
        </div>
      ` : `
        <p class="text-sm text-muted mb-4">Actualiza a <strong>Pro</strong> para cotizaciones ilimitadas.</p>
        <div style="display:flex;gap:12px;flex-wrap:wrap">
          <button class="btn btn--primary" id="btn-upgrade-monthly">
            <i data-lucide="zap"></i> Mensual — $249 MXN/mes
          </button>
          <button class="btn btn--secondary" id="btn-upgrade-yearly">
            Anual — $2,390 MXN/año
            <span class="badge badge--success" style="margin-left:4px">Ahorras $598</span>
          </button>
        </div>
      `}
    </div>`;

  container.appendChild(card);
  if (window.lucide) lucide.createIcons({ nodes: [card] });

  card.querySelector('#btn-upgrade-monthly')?.addEventListener('click', () => _startBillingCheckout('monthly'));
  card.querySelector('#btn-upgrade-yearly')?.addEventListener('click', () => _startBillingCheckout('yearly'));
  card.querySelector('#btn-manage-sub')?.addEventListener('click', () => _openBillingPortal());
}

async function _startBillingCheckout(period) {
  const client = SupabaseClient.get();
  const { data } = await client.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) { showToast('Inicia sesión para continuar', 'error'); return; }

  const btnId = period === 'monthly' ? '#btn-upgrade-monthly' : '#btn-upgrade-yearly';
  const btn = document.querySelector(btnId);
  if (btn) btn.disabled = true;

  try {
    const resp = await fetch(`/api/billing?action=checkout&period=${period}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const result = await resp.json();
    if (result.url) {
      window.location.href = result.url;
    } else {
      showToast('Error al iniciar el pago', 'error');
      if (btn) btn.disabled = false;
    }
  } catch (_) {
    showToast('Error de conexión', 'error');
    if (btn) btn.disabled = false;
  }
}

async function _openBillingPortal() {
  const client = SupabaseClient.get();
  const { data } = await client.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) { showToast('Inicia sesión para continuar', 'error'); return; }

  const btn = document.querySelector('#btn-manage-sub');
  if (btn) btn.disabled = true;

  try {
    const resp = await fetch('/api/billing?action=portal', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const result = await resp.json();
    if (result.url) {
      window.location.href = result.url;
    } else {
      showToast('Error al abrir el portal', 'error');
      if (btn) btn.disabled = false;
    }
  } catch (_) {
    showToast('Error de conexión', 'error');
    if (btn) btn.disabled = false;
  }
}
