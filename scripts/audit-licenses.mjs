#!/usr/bin/env node
// Règlement, article 6 : aucune licence GPL, AGPL ou LGPL, y compris dans les dépendances indirectes.
// Parcourt tout node_modules (dépendances directes et indirectes) et échoue si une licence interdite est trouvée.
import fs from 'node:fs';
import path from 'node:path';

const FORBIDDEN = /\b(A|L)?GPL\b|GNU (AFFERO |LESSER |LIBRARY )?GENERAL PUBLIC/i;
const root = path.resolve(process.argv[2] ?? '.');

function normalize(pkg) {
  const value = pkg.license ?? pkg.licenses;
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map((l) => (typeof l === 'string' ? l : l.type)).join(' OR ');
  return value.type ?? '';
}

/** An SPDX expression is acceptable if at least one OR-alternative contains no forbidden licence. */
export function isAllowed(expression) {
  const alternatives = expression.replace(/[()]/g, ' ').split(/\s+OR\s+/i);
  return alternatives.some((alt) => !alt.split(/\s+AND\s+/i).some((part) => FORBIDDEN.test(part)));
}

const packages = new Map();
function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.name.startsWith('@') && entry.isDirectory()) {
      walk(full);
      continue;
    }
    if (entry.isSymbolicLink() || !entry.isDirectory()) continue; // liens = paquets du monorepo
    const manifest = path.join(full, 'package.json');
    if (fs.existsSync(manifest)) {
      const pkg = JSON.parse(fs.readFileSync(manifest, 'utf8'));
      if (pkg.name && pkg.version) packages.set(`${pkg.name}@${pkg.version}`, normalize(pkg));
    }
    walk(path.join(full, 'node_modules'));
  }
}

walk(path.join(root, 'node_modules'));
for (const workspace of ['shared', 'cli', 'server', 'web']) walk(path.join(root, workspace, 'node_modules'));

const forbidden = [];
const unknown = [];
const counts = {};
for (const [id, license] of [...packages].sort()) {
  if (!license) unknown.push(id);
  else if (!isAllowed(license)) forbidden.push(`${id} (${license})`);
  counts[license || 'inconnue'] = (counts[license || 'inconnue'] ?? 0) + 1;
}

console.log(`Audit des licences : ${packages.size} paquets analysés (dépendances directes et indirectes).`);
for (const [license, n] of Object.entries(counts).sort((a, b) => b[1] - a[1])) console.log(`  ${license.padEnd(30)} ${n}`);
if (unknown.length) console.log(`\nLicence non déclarée (à vérifier à la main) :\n  ${unknown.join('\n  ')}`);
if (forbidden.length) {
  console.error(`\n✗ Licences interdites (GPL / AGPL / LGPL) :\n  ${forbidden.join('\n  ')}`);
  process.exit(1);
}
console.log('\n✓ Aucune licence GPL, AGPL ou LGPL.');
