# SOS Dev

> Quand l'IA ne suffit plus, un développeur te rejoint depuis ton terminal.

Projet CADEV 2026. Le concept complet est dans [`docs/sos-dev-concept-v2.pdf`](docs/sos-dev-concept-v2.pdf).

## Structure

| Dossier | Rôle | État |
| --- | --- | --- |
| `shared/` | Code commun : masquage des secrets, lecture des traces d'erreur, détection de la techno, format de la demande (Zod) | Étape 1 |
| `cli/` | La commande `sos` : lance ton programme, capture l'erreur, masque les secrets, affiche l'aperçu | Étape 1 |
| `server/` | API NestJS + WebSocket (alertes, Radar, salle) | Étape 2 |
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

## La commande `sos` (étape 1)

```
sos [options] <commande...>

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

Le serveur arrive à l'étape 2. En attendant, la demande validée est enregistrée dans `~/.sos/demandes/`.

## Vérifications

```bash
npm run typecheck
npm test
npm run audit:licenses
```

L'intégration continue (`.github/workflows/ci.yml`) lance les mêmes vérifications à chaque push. L'audit parcourt toutes les dépendances, y compris les indirectes, et échoue si une licence GPL, AGPL ou LGPL apparaît.
