import Store from '../store.js';
import { formatCurrency } from '../utils.js';

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

export function renderKanban(container) {
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
