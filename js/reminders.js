import Store from './store.js';

const MS = 86400000;

export function evaluateReminders() {
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
