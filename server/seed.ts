import { db } from './db.js';

console.log('🌱 Re-initialisation des données de démo (KoraDevs + CodeFlash)...');
db.resetToDemo();
console.log('✅ Base de données réinitialisée avec succès !');
console.log('   Users: Koffi Mensah (Demandeur), Aïcha Diop (Aidant), Samba Sow (Mentor)');
