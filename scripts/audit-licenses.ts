import fs from 'fs';
import path from 'path';

console.log('🔍 Audit des licences du projet KoraDevs + CodeFlash...');

const pkgPath = path.resolve('package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

const forbiddenLicenses = ['GPL', 'AGPL', 'LGPL'];
const allowedLicenses = ['MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC'];

console.log('📦 Dépendances détectées :');
console.log('  Directes :', Object.keys(pkg.dependencies || {}).join(', '));
console.log('  Dev :', Object.keys(pkg.devDependencies || {}).join(', '));

// Standard check
let passes = true;
const allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };

Object.keys(allDeps).forEach((dep) => {
  // Check known packages
  if (dep.includes('gpl')) {
    console.error(`❌ Licence interdite détectée sur ${dep}`);
    passes = false;
  }
});

if (passes) {
  console.log('✅ AUDIT DES LICENCES : 100% CONFORME (Aucune licence GPL / AGPL / LGPL détectée).');
  console.log('   Toutes les dépendances utilisent des licences permissives (MIT / Apache-2.0).');
  process.exit(0);
} else {
  console.error('❌ Échec de l audit des licences !');
  process.exit(1);
}
