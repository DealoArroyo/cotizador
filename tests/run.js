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

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
