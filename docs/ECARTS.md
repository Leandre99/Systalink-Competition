# Audit d'Écarts - KoraDevs + CodeFlash (Étape 0)

**Date** : Octobre 2026  
**Projet** : Plateforme d'entraide pour développeurs (Hackathon CADev 2026)  
**Dépôt** : KoraDevs + CodeFlash  

---

## 1. Contexte & Démarche Audit
Cet audit identifie les exigences fonctionnelles et techniques définies dans la spécification du hackathon CADev 2026 (fusions des propositions Keur, Keurforge, DevForge, Vision, SOS Dev) et établit la feuille de route exacte d'implémentation.

---

## 2. Tableau des Écarts (Fonctionnalités MVP & Exigences)

| Composant / Fonctionnalité | État Initial | Exigence Prompt & MVP | Action & Correctif Requis |
| :--- | :--- | :--- | :--- |
| **Passeport de compétences** | À construire | Profil public signé, preuves cliquables, sceau "Signé" animé, export PDF | Implémenter la page `/passport`, génération de sceau SVG animé et export PDF. |
| **La Maison (Profil vivant)** | À construire | Stack, ville, statut porte (ouverte/fermée), bouton "sonner" | Implémenter `/maison` avec gestion d'état et déclenchement de sonnette. |
| **Appel à l'aide** | À construire | Saisie erreur + code, masquage auto des secrets, prévisualisation, recherche auto de fiche existante | Implémenter `/ask` avec masquage Regex côté client et moteur de recherche avant soumission. |
| **Radar des aidants** | À construire | Notification en direct des aidants disponibles filtrés par techno | Implémenter `/radar` avec mises à jour WebSocket / polling et surbrillance des nouvelles demandes. |
| **Salle d'aide / CodeFlash** | À construire | Éditeur partagé, chat, curseurs només, indicateur "en train d'écrire", reconnexion WS et mode asynchrone | Implémenter `/room/:id` avec protocole temps réel et fallback asynchrone sans crash. |
| **Test confirmé** | À construire | Exécution de test factice/sandbox, badge "Confirmé" avec ressort ambre, incrément de points | Intégrer l'exécution du test avec animation spring CSS/Framer Motion. |
| **Fiche solution et recherche** | À construire | Publication avec double accord (demandeur + aidant), moteur de recherche par mot-clé et tag | Implémenter `/solutions` et validation croisée des fiches. |
| **Vitrine de projets** | À construire | Description, lien démo/dépôt, rôles recherchés, bouton "Demander à rejoindre" | Implémenter `/projects` et tableau de tâches Kanban léger. |
| **Rejoindre un projet** | À construire | Demande d'adhésion + mini-tableau de tâches Kanban par projet | Gérer les requêtes d'adhésion et tâches par projet. |
| **Page Découvrir** | À construire | Accueil, fiches du moment, projets recruteurs, aidants dispos, onboarding 4 étapes | Implémenter la page d'accueil `/` avec la checklist 4 étapes. |
| **Signaler** | À construire | Bouton de signalement pour contenu inapproprié ou doublon | Intégrer modal de signalement sur fiches et projets. |
| **Partage WhatsApp** | À construire | Partage en 1 clic de fiches, projets et Passeport | Générer les URLs `https://wa.me/?text=...` pré-remplies et formatées. |
| **PWA & Offline** | À construire | App installable, file d'attente hors-ligne "En attente de synchronisation" | Intégrer SW léger et gestionnaire de file `syncQueue`. |
| **Navigation & Ergonomie** | À construire | 6 entrées max (Découvrir, Demander, Aider, Projets, Passeport, Maison), en-tête descriptive, /guide, /demo avec sélecteur de compte | Développer Sidebar/BottomBar, pages `/guide` et `/demo` interactives. |
| **Animations & Chartes** | À construire | Couleurs (#0F6E56, #0A4F3E, #F2A93B, #E4572E, #F6F8F7), animations 150-400ms transform/opacity, prefers-reduced-motion | Créer `index.css` avec design system strict et utilitaires d'animation. |
| **Architecture Front/Back** | À construire | Shared Zod schemas, API enveloppe `{ ok, data }`, React Query, Error Boundaries, WS auto-reconnect, seed script | Développer `shared/`, Express API, WebSockets, TanStack Query et client typé. |
| **Tests & Verification** | À construire | Typecheck, lint, unit tests, audit de licences permissives, Playwright E2E | Mettre en place la suite de tests et vérifier le vert à 100%. |

---

## 3. Découpage & Parallélisation des Tâches
Les modules suivants seront implémentés de façon modulaire et propre :
1. **Socle Commun (`shared/`, API Backend Express, DB SQLite/In-memory, Seed)**
2. **Interface Front-End & Design System (`index.css`, Layout, Navigation, GuidedTour, OnboardingChecklist)**
3. **Module Entraide & CodeFlash (`/ask`, `/radar`, `/room/:id`, WebSockets, Test Runner)**
4. **Module Connaissances & Projets (`/solutions`, `/projects`, `/passport`, `/maison`)**
5. **Guide & Parcours Démo (`/guide`, `/demo` avec sélecteur multi-compte)**
6. **Robustesse, Offline PWA & Animations disciplinées**
7. **Suite de Tests (Unit, Audit Licences, Playwright E2E) & Documentation Finalisée**
