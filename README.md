# SOS Dev

> Quand l'IA ne suffit plus, un développeur te rejoint depuis ton terminal.

Projet CADEV 2026. Le concept complet est dans [`docs/sos-dev-concept-v2.pdf`](docs/sos-dev-concept-v2.pdf).

## Structure

| Dossier | Rôle | État |
| --- | --- | --- |
| `shared/` | Code commun : masquage des secrets, lecture des traces d'erreur, détection de la techno, format de la demande (Zod) | Étape 1 |
| `cli/` | La commande `sos` : lance ton programme, capture l'erreur, masque les secrets, affiche l'aperçu | Étape 1 |
| `server/` | API NestJS + PostgreSQL : connexion GitHub, réception des demandes, effacement du code après 24 h | Étape 2 (WebSocket, Radar : étape 3) |
| `web/` | Site Next.js (Radar, Salle SOS, fiches, profil) | Étape 2-3 |
| `examples/demo/` | Petit programme qui plante, avec de faux secrets, pour la démo | |
| `scripts/audit-licenses.mjs` | Audit des licences (règlement, article 6) | |

## Démarrage

Node.js 20 ou plus.

```bash
npm install
npm run build
```

Essayer la commande `sos` sur le programme de démo :

```bash
cd examples/demo
node ../../cli/dist/index.js npm start
```

Pour avoir la commande `sos` partout : `npm link -w cli`, puis `sos npm start` dans n'importe quel projet.

### Lancer le serveur (étape 2)

```bash
npm run db:up                         # PostgreSQL (+ pgvector) via Docker
cp server/.env.example server/.env    # puis ajuste si besoin
npm run build && npm run server       # API sur http://localhost:4000
```

Sans `DATABASE_URL`, le serveur démarre quand même avec un stockage en mémoire (pratique pour tester, tout disparaît à l'arrêt).

Puis, dans un autre terminal :

```bash
sos login --dev awa        # mode démo, sans GitHub
cd examples/demo && sos npm start
```

### Connexion GitHub

`sos login` utilise le « device flow » de GitHub : le terminal affiche un code à saisir sur github.com, aucun mot de passe ne passe par le terminal. Il faut une OAuth App GitHub (Settings → Developer settings → OAuth Apps) avec **Enable Device Flow** coché, et mettre son Client ID dans `GITHUB_CLIENT_ID` (ce n'est pas un secret). Le serveur vérifie le jeton GitHub une fois, ne le garde pas, et donne à `sos` son propre jeton de session (stocké dans `~/.sos/config.json`, lisible par toi seul ; le serveur n'en garde que l'empreinte SHA-256).

Le mode démo (`sos login --dev <pseudo>`) est actif par défaut hors production ; `SOS_DEV_AUTH=0` le coupe.

### API

| Route | Rôle |
| --- | --- |
| `GET /health` | État du serveur |
| `GET /auth/config` | Client ID GitHub et mode démo |
| `POST /auth/github` · `POST /auth/dev` | Connexion, renvoie un jeton de session |
| `POST /auth/logout` · `GET /me` | Déconnexion, compte connecté |
| `POST /requests` | Envoyer une demande (3 par heure maximum) |
| `GET /requests` · `GET /requests/:id` | Mes demandes (le code n'est visible que par son auteur) |

À la réception, le serveur refait le masquage des secrets (au cas où le CLI serait ancien ou contourné), refuse les fichiers sensibles et les chemins hors du projet, et fixe l'effacement du code à 24 h maximum. Une purge tourne toutes les 10 minutes.

## La commande `sos`

```
sos [options] <commande...>
sos login [--dev <pseudo>] [--server <url>]
sos whoami | sos logout | sos send <fichier>

  -a, --add <fichier>  Ajouter un fichier à la demande (répétable)
  -y, --yes            Valider sans poser de question
      --dry-run        Afficher l'aperçu sans rien envoyer
      --json           Afficher la demande au format JSON
      --force          Préparer une demande même si la commande réussit
```

Ce qu'elle fait :

1. Lance la commande et affiche sa sortie en direct.
2. Si la commande plante, récupère les 200 dernières lignes de la sortie, les fichiers cités dans la trace d'erreur, les fichiers de dépendances (`package.json`, `requirements.txt`…) et les fichiers ajoutés avec `--add`. Limite : 10 fichiers, 200 Ko.
3. N'envoie jamais `.env*`, `*.pem`, `*.key`, les clés SSH, `.npmrc`… même avec `--add`. Respecte `.gitignore`.
4. Masque les secrets **sur ta machine** : clés connues (AWS, GitHub, Stripe, IA, Slack, Google, JWT), clés privées, mots de passe dans les URL, en-têtes `Authorization`, affectations du type `password=` ou `API_KEY =`, et les chaînes qui ont l'air aléatoires (calcul d'entropie).
5. Affiche l'aperçu exact de la demande. Tu peux retirer des fichiers, puis tu valides.

6. Envoie la demande au serveur. Si tu n'es pas connecté ou si le serveur est injoignable, elle est gardée dans `~/.sos/demandes/` et tu peux la renvoyer avec `sos send`.

## Vérifications

```bash
npm run typecheck
npm test
npm run audit:licenses
```

Les tests PostgreSQL ne tournent que si `TEST_DATABASE_URL` pointe vers une base jetable (le schéma est effacé) : `TEST_DATABASE_URL=postgres://sos:sos@localhost:5432/sos npm test`.

L'intégration continue (`.github/workflows/ci.yml`) lance les mêmes vérifications à chaque push, avec une base PostgreSQL. L'audit parcourt toutes les dépendances, y compris les indirectes, et échoue si une licence GPL, AGPL ou LGPL apparaît.
