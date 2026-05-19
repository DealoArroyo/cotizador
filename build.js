#!/usr/bin/env node
/**
 * Simple bundler: concatenates JS modules into a single bundle.js
 * Node.js version of build.py
 */
const fs = require('fs');
const path = require('path');

const BASE = __dirname;

// Files in dependency order
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
    'js/app.js',
];

function transform(src, filename) {
    const lines = src.split('\n');
    const out = [];

    for (const line of lines) {
        const stripped = line.trim();

        // Remove import lines
        if (stripped.startsWith('import ')) {
            out.push('// ' + line);
            continue;
        }

        let transformed = line;

        // Convert: export default X  ->  window.X = X
        transformed = transformed.replace(/^export default (\w+);/, 'window.$1 = $1;');

        // Convert: export const / export let / export var
        transformed = transformed.replace(/^export (const|let|var) /, '$1 ');

        // Convert: export function X  ->  function X
        transformed = transformed.replace(/^export function /, 'function ');

        // Convert: export async function X  ->  async function X
        transformed = transformed.replace(/^export async function /, 'async function ');

        // Convert: export class X  ->  class X
        transformed = transformed.replace(/^export class /, 'class ');

        // Remove: export { ... }
        transformed = transformed.replace(/^export \{[^}]*\};?\s*$/, '');

        // Remove: export { ... } from '...';
        transformed = transformed.replace(/^export \{[^}]*\} from .*$/, '');

        out.push(transformed);
    }

    return out.join('\n');
}

const parts = ['// CotizaPro Bundle — auto-generated\n(function() {\n"use strict";\n'];

for (const rel of FILES) {
    const filePath = path.join(BASE, rel);
    try {
        const src = fs.readFileSync(filePath, 'utf-8');
        const transformed = transform(src, rel);
        parts.push(`\n// ── ${rel} ──────────────\n`);
        parts.push(transformed);
        parts.push('\n');
    } catch (err) {
        console.error(`Error reading ${filePath}: ${err.message}`);
        process.exit(1);
    }
}

// Register globals at the end of each key module
parts.push(`
// Register globals
window.Store = Store;
window.I18n = I18n;
`);

parts.push('\n})();\n');

const bundle = parts.join('');
const outPath = path.join(BASE, 'js', 'bundle.js');

try {
    fs.writeFileSync(outPath, bundle, 'utf-8');
    console.log(`Bundle written to ${outPath} (${bundle.length.toLocaleString()} bytes)`);
} catch (err) {
    console.error(`Error writing bundle: ${err.message}`);
    process.exit(1);
}
