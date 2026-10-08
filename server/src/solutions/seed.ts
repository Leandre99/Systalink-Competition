import type { NewSolution } from '../store/types.js';

/** Starter sheets so the library is not empty on day one. Fixed ids: inserting twice is a no-op. */
export const SEED_SOLUTIONS: NewSolution[] = [
  {
    id: '5e3d0001-0000-4000-8000-000000000001',
    title: 'Cannot read properties of undefined : un objet attendu est absent',
    error: "TypeError: Cannot read properties of undefined (reading 'x')",
    cause: "On lit une propriété sur une valeur undefined : élément introuvable dans un tableau (find), donnée d'API pas encore chargée, ou paramètre oublié.",
    fix: "Remonter la trace jusqu'à l'endroit où la valeur est créée. Vérifier le résultat de find/get avant de l'utiliser (if (!user) …) ou utiliser le chaînage optionnel user?.name.",
    tech: ['JavaScript', 'TypeScript', 'React'],
  },
  {
    id: '5e3d0001-0000-4000-8000-000000000002',
    title: 'Cannot find module : dépendance manquante ou chemin faux',
    error: "Error: Cannot find module 'express'",
    cause: 'Le paquet n’est pas installé (node_modules absent ou incomplet), ou un import relatif pointe vers un fichier qui n’existe pas (majuscules, extension .js manquante en ESM).',
    fix: 'Lancer npm install. Pour un import relatif en ESM, écrire l’extension complète (./users.js). Vérifier la casse du nom de fichier.',
    tech: ['JavaScript', 'TypeScript'],
  },
  {
    id: '5e3d0001-0000-4000-8000-000000000003',
    title: 'EADDRINUSE : le port est déjà utilisé',
    error: 'Error: listen EADDRINUSE: address already in use :::3000',
    cause: 'Un autre programme (souvent une ancienne instance du serveur) écoute déjà sur ce port.',
    fix: 'Arrêter l’ancien processus (lsof -i :3000 puis kill <pid>) ou changer le port (PORT=3001).',
    tech: ['JavaScript', 'Express', 'NestJS'],
  },
  {
    id: '5e3d0001-0000-4000-8000-000000000004',
    title: 'ECONNREFUSED 5432 : PostgreSQL ne répond pas',
    error: 'Error: connect ECONNREFUSED 127.0.0.1:5432',
    cause: 'La base PostgreSQL n’est pas démarrée, ou elle écoute sur une autre adresse ou un autre port que DATABASE_URL.',
    fix: 'Démarrer la base (docker compose up -d postgres) et vérifier l’hôte et le port dans DATABASE_URL. Dans Docker, utiliser le nom du service au lieu de localhost.',
    tech: ['JavaScript', 'Python', 'PostgreSQL'],
  },
  {
    id: '5e3d0001-0000-4000-8000-000000000005',
    title: 'ModuleNotFoundError : paquet Python non installé dans cet environnement',
    error: "ModuleNotFoundError: No module named 'requests'",
    cause: 'Le paquet est installé pour un autre Python que celui qui lance le script (environnement virtuel non activé).',
    fix: 'Activer le venv (source .venv/bin/activate) puis python -m pip install -r requirements.txt. Toujours installer avec python -m pip.',
    tech: ['Python'],
  },
  {
    id: '5e3d0001-0000-4000-8000-000000000006',
    title: 'Too many re-renders : boucle de rendu React',
    error: 'Error: Too many re-renders. React limits the number of renders to prevent an infinite loop.',
    cause: 'Un setState est appelé directement pendant le rendu, souvent onClick={setOpen(true)} au lieu de onClick={() => setOpen(true)}.',
    fix: 'Passer une fonction au gestionnaire d’événement, ou déplacer la mise à jour dans un useEffect avec les bonnes dépendances.',
    tech: ['React', 'JavaScript', 'TypeScript'],
  },
  {
    id: '5e3d0001-0000-4000-8000-000000000007',
    title: 'Bloqué par CORS : le serveur n’autorise pas l’origine du front',
    error: "Access to fetch has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present",
    cause: 'Le front et l’API sont sur des origines différentes et l’API ne renvoie pas l’en-tête Access-Control-Allow-Origin.',
    fix: 'Autoriser l’origine du front côté API (app.enableCors({ origin: "http://localhost:5173" })) ou passer par le proxy du serveur de développement.',
    tech: ['JavaScript', 'TypeScript', 'React', 'Express', 'NestJS'],
  },
];
