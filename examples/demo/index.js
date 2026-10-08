import { formatUser } from './users.js';

// Faux identifiants de démonstration : sos doit les masquer avant tout envoi.
const API_KEY = 'demo_9fK2xQ7LmP4vT8sW1zR6aB3';
const DATABASE_URL = 'postgres://admin:motdepasse-demo@localhost:5432/app';

console.log(`Connexion à ${DATABASE_URL} avec la clé ${API_KEY.slice(0, 4)}…`);

const users = [{ name: 'Awa' }, { nom: 'Koffi' }];
for (const user of users) {
  console.log(formatUser(user));
}
