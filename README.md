# KoraDevs + CodeFlash (Hackathon CADev 2026)

> Platforme d entraide et de collaboration pour développeurs. Quand tu bloques, un voisin te rejoint, la solution est confirmée par un test et chaque aide construit un Passeport de compétences certifié.

---

## ⚡ Démarrage Rapide (Lancement en 3 Commandes)

```bash
# 1. Installer les dépendances
npm install

# 2. Re-initialiser les données de démonstration
npm run seed

# 3. Lancer le serveur backend et l application frontend
npm run dev
```

L application est accessible sur :
- **Frontend Vite** : http://localhost:5173
- **Backend API REST & WebSockets** : http://localhost:3001
- **Route de Santé API** : http://localhost:3001/api/health
- **Page Démo 2 Min** : http://localhost:5173/demo
- **Guide des 13 fonctionnalités** : http://localhost:5173/guide

---

## 🧪 Exécution des Tests & Vérifications

```bash
# Vérification des types TypeScript
npm run typecheck

# Audit des licences (100% Permissives MIT / Apache-2.0)
npm run audit:licenses

# Tests unitaires
npm run test

# Test de bout en bout E2E Playwright (Parcours Démo complet)
npm run test:e2e
```

---

## 🐳 Déploiement avec Docker

```bash
# 1. Construire l image Docker
docker build -t koradevs-codeflash .

# 2. Lancer le conteneur
docker run -d -p 5173:5173 -p 3001:3001 --name koradevs koradevs-codeflash
```

---

## 📚 Documentation
- `docs/ECARTS.md` : Audit initial des écarts et tableau de correspondance.
- `docs/PLAN.md` : Plan de réalisations par semaine.
- `docs/HYPOTHESES.md` : Choix techniques et compromis d architecture.
- `docs/ARCHITECTURE.md` : Diagrammes et flux de données REST / WebSockets.
- `docs/IA.md` : Déclaration de l usage de l IA (Article 7).
- `docs/RAPPORT.md` : Rapport final des 13 fonctionnalités MVP.
