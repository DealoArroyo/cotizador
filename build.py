#!/usr/bin/env python3
"""Simple bundler: concatenates JS modules into a single bundle.js"""
import re, os

BASE = os.path.dirname(os.path.abspath(__file__))

# Files in dependency order
FILES = [
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
    'js/app.js',
]

def transform(src, filename):
    lines = src.split('\n')
    out = []
    for line in lines:
        # Remove import lines
        stripped = line.strip()
        if stripped.startswith('import '):
            out.append('// ' + line)
            continue
        # Convert: export default X  ->  window.X = X
        line = re.sub(r'^export default (\w+);', r'window.\1 = \1;', line)
        # Convert: export const / export let / export var
        line = re.sub(r'^export (const|let|var) ', r'\1 ', line)
        # Convert: export function X  ->  function X
        line = re.sub(r'^export function ', 'function ', line)
        # Convert: export async function X  ->  async function X
        line = re.sub(r'^export async function ', 'async function ', line)
        # Convert: export class X  ->  class X
        line = re.sub(r'^export class ', 'class ', line)
        # Remove: export { ... }
        line = re.sub(r'^export \{[^}]*\};?\s*$', '', line)
        # Remove: export { ... } from '...';
        line = re.sub(r'^export \{[^}]*\} from .*$', '', line)
        out.append(line)
    return '\n'.join(out)

parts = ['// CotizaPro Bundle — auto-generated\n(function() {\n"use strict";\n']

for rel in FILES:
    path = os.path.join(BASE, rel)
    with open(path, 'r', encoding='utf-8') as f:
        src = f.read()
    transformed = transform(src, rel)
    parts.append(f'\n// ── {rel} ──────────────\n')
    parts.append(transformed)
    parts.append('\n')

# Register globals at the end of each key module
parts.append('''
// Register globals
window.Store = Store;
window.I18n = I18n;
''')

parts.append('\n})();\n')

bundle = ''.join(parts)
out_path = os.path.join(BASE, 'js', 'bundle.js')
with open(out_path, 'w', encoding='utf-8') as f:
    f.write(bundle)

print(f'Bundle written to {out_path} ({len(bundle):,} bytes)')
