#!/usr/bin/env node
// Node.js equivalent of build.py — use when Python is not available
// Usage: node build.mjs
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const BASE = dirname(fileURLToPath(import.meta.url));

const FILES = [
  'js/supabase-client.js',
  'js/store.js',
  'js/auth.js',
  'js/i18n.js',
  'js/catalogs.js',
  'js/utils.js',
  'js/modules/dashboard.js',
  'js/modules/clients.js',
  'js/modules/products.js',
  'js/modules/quotations.js',
  'js/modules/invoices.js',
  'js/modules/payments.js',
  'js/modules/templates.js',
  'js/modules/reports.js',
  'js/modules/settings.js',
  'js/modules/kanban.js',
  'js/reminders.js',
  'js/app.js',
];

function transform(src) {
  return src.split('\n').map(line => {
    const stripped = line.trim();
    if (stripped.startsWith('import ')) return '// ' + line;
    line = line.replace(/^export default (\w+);/, 'window.$1 = $1;');
    line = line.replace(/^export (const|let|var) /, '$1 ');
    line = line.replace(/^export function /, 'function ');
    line = line.replace(/^export async function /, 'async function ');
    line = line.replace(/^export class /, 'class ');
    line = line.replace(/^export \{[^}]*\};\s*$/, '');
    line = line.replace(/^export \{[^}]*\} from .*$/, '');
    return line;
  }).join('\n');
}

const parts = ['// CotizaPro Bundle — auto-generated\n(function() {\n"use strict";\n'];

for (const rel of FILES) {
  const path = join(BASE, rel);
  let src;
  try {
    src = readFileSync(path, 'utf-8');
  } catch {
    console.warn(`  [skip] ${rel} — not found yet`);
    continue;
  }
  parts.push(`\n// ── ${rel} ──────────────\n`);
  parts.push(transform(src));
  parts.push('\n');
}

parts.push(`
// Register globals
window.Store = Store;
window.I18n = I18n;
`);
parts.push('\n})();\n');

const bundle = parts.join('');
const outPath = join(BASE, 'js', 'bundle.js');
writeFileSync(outPath, bundle, 'utf-8');
console.log(`Bundle written to ${outPath} (${bundle.length.toLocaleString()} bytes)`);
