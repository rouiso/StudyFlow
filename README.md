# StudyFlow Mobile — Projet Autonome (Front-End & Back-End)
## Matière : Développement Mobile (Flutter / Dart & REST API)

Ce dossier regroupe l'intégralité du projet de la matière Mobile, séparé du projet Web Next.js.

---

## 📁 Structure du Projet

```text
StudyFlow-Mobile-Project/
├── backend/                  <- Serveur Back-End REST API (Node.js Express + Prisma SQLite)
│   ├── prisma/               <- Schéma relationnel Prisma (schema.prisma) & Base SQLite (dev.db)
│   ├── server.js             <- Endpoints REST (/api/mobile/auth, /api/mobile/bootstrap, /api/mobile/sync)
│   ├── package.json          <- Dépendances (express, cors, @prisma/client)
│   └── .env                  <- Configuration (PORT=3000, DATABASE_URL)
│
└── frontend/                 <- Application Mobile Front-End (Flutter & Dart)
    ├── lib/
    │   ├── core/models/      <- Modèles de données typés & règles métiers (fractional indexing, IA)
    │   ├── core/services/    <- Client HTTP REST API Prisma (PrismaApiService)
    │   ├── screens/          <- Écrans (Connexion 1-clic, Kanban, Tâches, Agenda/Stats, Chat/Fichiers, Coaching)
    │   ├── state/            <- Store réactif (StudyFlowStore)
    │   └── main.dart         <- Point d'entrée Flutter avec sélecteur de persona en 1 clic
    ├── test/                 <- Tests unitaires & widgets Flutter
    ├── reflection.md         <- Dossier de réflexion technique & justification des choix (Bonus 2 pts)
    └── pubspec.yaml          <- Dépendances Flutter (http, cupertino_icons)
```

---

## 🚀 Démarrage Rapide

### 1. Démarrer le Back-End REST API (Terminal 1)
```powershell
cd C:\Users\moham\Documents\StudyFlow-Mobile-Project\backend
npm start
```
> Le serveur démarre sur **http://localhost:3000** et expose l'ensemble des endpoints REST CRUD documentés dans le cahier des charges.

### 2. Démarrer le Front-End Flutter (Terminal 2)
```powershell
cd C:\Users\moham\Documents\StudyFlow-Mobile-Project\frontend
flutter run -d chrome
```
*(Ou sélectionnez votre émulateur Android / téléphone dans Android Studio et lancez `main.dart`).*

---

## 🎯 Évaluation & Séances (Alignement Pédagogique)

- **Séance 1 :** Interface graphique fluide, Material 3, navigation réactive et écrans de détails.
- **Séance 2 (REST API & Consommation) :**
  - **GET** : `/api/mobile/bootstrap` (consultation multi-modules en 1 requête optimisée).
  - **POST / PUT / DELETE** : `/api/mobile/sync` (création, modification, déplacement Kanban et suppression de tâches).
  - **Règles de sécurité** : Rôle Coach en lecture seule (§4.2) et confidentialité stricte des notes privées (§7.3).
- **Séance 3 (Soutenance & Scénarios) :**
  - Scénarios personnalisés pour Léa (Owner), Thomas (Admin), Sarah (Member) et Mme Dupont (Coach).
  - Découpage IA automatique des tâches en sous-tâches (`aiBreakdownTask`).
  - Document bonus rédigé : `frontend/reflection.md`.

