// tests/run.js — run with: node tests/run.js
let pass = 0, fail = 0;
function assert(desc, condition) {
  if (condition) { console.log(`  ✓ ${desc}`); pass++; }
  else { console.error(`  ✗ FAIL: ${desc}`); fail++; }
}

// ── generatePublicToken ──────────────────────────────────────
// Stub using Buffer since crypto.getRandomValues isn't in Node REPL
function generatePublicToken() {
  const buf = Buffer.alloc(16);
  for (let i = 0; i < 16; i++) buf[i] = Math.floor(Math.random() * 256);
  return Array.from(buf, b => b.toString(16).padStart(2, '0')).join('');
}

console.log('\ngeneratePublicToken:');
let token;
try { token = generatePublicToken(); } catch(e) { token = null; }
assert('returns a string', typeof token === 'string');
assert('is 32 chars', token?.length === 32);
assert('is hex', /^[0-9a-f]+$/.test(token || ''));

// ── evaluateReminders (pure logic extracted) ─────────────────
const MS = 86400000;
function daysAgo(n) { return new Date(Date.now() - n * MS).toISOString().slice(0,10); }

function shouldRemindNoOpen(q, cfg) {
  if (q.status !== 'sent') return false;
  if (q.viewedAt || (q.reminderSent || {}).noOpen) return false;
  if (!cfg?.enabled) return false;
  return (Date.now() - new Date(q.date).getTime()) / MS >= (cfg.days || 3);
}

console.log('\nshouldRemindNoOpen:');
const cfg = { enabled: true, days: 3 };
assert('triggers after N days', shouldRemindNoOpen({ status: 'sent', date: daysAgo(4) }, cfg));
assert('silent before N days',  !shouldRemindNoOpen({ status: 'sent', date: daysAgo(2) }, cfg));
assert('silent if viewed',      !shouldRemindNoOpen({ status: 'sent', date: daysAgo(4), viewedAt: new Date().toISOString() }, cfg));
assert('silent if reminded',    !shouldRemindNoOpen({ status: 'sent', date: daysAgo(4), reminderSent: { noOpen: true } }, cfg));
assert('silent if draft',       !shouldRemindNoOpen({ status: 'draft', date: daysAgo(4) }, cfg));
assert('silent if disabled',    !shouldRemindNoOpen({ status: 'sent', date: daysAgo(4) }, { enabled: false, days: 3 }));

// ── shouldRemindNoReply ──────────────────────────────────────
function shouldRemindNoReply(q, cfg) {
  if (q.status !== 'sent') return false;
  if (!q.viewedAt || (q.reminderSent || {}).noReply) return false;
  if (!cfg?.enabled) return false;
  return (Date.now() - new Date(q.viewedAt).getTime()) / MS >= (cfg.days || 2);
}

console.log('\nshouldRemindNoReply:');
const rCfg = { enabled: true, days: 2 };
assert('triggers after N days viewed', shouldRemindNoReply({ status: 'sent', date: daysAgo(5), viewedAt: daysAgo(3) }, rCfg));
assert('silent if not viewed',         !shouldRemindNoReply({ status: 'sent', date: daysAgo(5) }, rCfg));
assert('silent if reminded',           !shouldRemindNoReply({ status: 'sent', date: daysAgo(5), viewedAt: daysAgo(3), reminderSent: { noReply: true } }, rCfg));
assert('silent before N days',         !shouldRemindNoReply({ status: 'sent', date: daysAgo(5), viewedAt: daysAgo(1) }, rCfg));

// ── shouldRemindExpiring ──────────────────────────────────────
function shouldRemindExpiring(q, cfg) {
  if (!q.validUntil || (q.reminderSent || {}).expiring) return false;
  if (!cfg?.enabled) return false;
  const daysLeft = (new Date(q.validUntil).getTime() - Date.now()) / MS;
  return daysLeft <= (cfg.days || 2) && daysLeft > 0;
}

function daysFromNow(n) { return new Date(Date.now() + n * MS).toISOString().slice(0,10); }

console.log('\nshouldRemindExpiring:');
const eCfg = { enabled: true, days: 2 };
assert('triggers when 1 day left',    shouldRemindExpiring({ validUntil: daysFromNow(1) }, eCfg));
assert('silent when 5 days left',     !shouldRemindExpiring({ validUntil: daysFromNow(5) }, eCfg));
assert('silent when already expired', !shouldRemindExpiring({ validUntil: daysAgo(1) }, eCfg));
assert('silent if reminded',          !shouldRemindExpiring({ validUntil: daysFromNow(1), reminderSent: { expiring: true } }, eCfg));

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
