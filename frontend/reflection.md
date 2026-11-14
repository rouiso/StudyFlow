# StudyFlow — Dossier de Présentation & Réflexion Technique

---

## 1. Contexte & Choix d'Architecture

### 1.1 Problématique & Objectif
StudyFlow est une plateforme collaborative de gestion de projet universitaire dotée d'un espace de formations et de coaching pédagogique.

Le projet repose sur :
- Une application client **Flutter / Dart** (Web & Mobile) structurée en couches par domaine (`models`, `services`, `repositories`, `providers`, `screens`, `widgets`).
- Un serveur backend **Node.js / Express** (`backend/server.js`) adossé à **Prisma ORM** et une base relationnelle **SQLite** (`backend/prisma/schema.prisma`, `dev.db`), avec stockage local des fichiers dans `backend/uploads/`.
- Une synchronisation complète (CRUD) temps réel entre le client Flutter et le backend, avec repli hors ligne (`StudyFlowSeedData`).

### 1.2 Justification du choix de la stack Backend (Express + Prisma vs Firebase / Spring / Django)
| Critère | Express + Prisma + SQLite (Choisi) | Firebase | Spring Boot / Django |
| :--- | :--- | :--- | :--- |
| **Typage & Schéma unique** | Schéma déclaratif `schema.prisma` unique et modèles Dart alignés par domaine. | NoSQL non structuré, règles de sécurité complexes à maintenir. | Plus verbeux (Spring) ou configuration plus lourde. |
| **Règles métier strictes** | Contrôles d'accès précis (rôle `COACH` en lecture seule sur les tâches, confidentialité des `privateNotes` vérifiée côté serveur). | Règles Firestore limitées pour les logiques transversales conditionnelles. | Possible mais demande davantage de boilerplate. |
| **Multi-tenant & Isolation** | Chaque inscription crée sa propre équipe (`Team`), son projet initial et ses colonnes ; `/api/mobile/bootstrap` filtre strictement par `teamIds`. | Nécessite des règles de sécurité et index composites manuels. | Configuration manuelle des filtres par tenant. |
| **Portabilité & Démo** | Démarrage immédiat avec SQLite embarqué, facilement migrable vers PostgreSQL. | Dépend d'une connexion cloud et de quotas externes. | Démarrage plus lent (JVM). |

---

## 2. Consommation des Services Web & Synchronisation

Le client Flutter communique avec le backend via des services dédiés par domaine (`AuthApiService`, `SyncApiService`, `KanbanApiService`, `CalendarApiService`, `CommunicationApiService`, `CoachingApiService`) :

| Opération | Endpoint | Logique Métier |
| :--- | :--- | :--- |
| **Authentification** | `POST /api/mobile/auth` | Connexion (`login`) ou inscription (`register`) avec création automatique d'une équipe isolée, d'un projet de démarrage, de 3 colonnes et d'un canal. |
| **Chargement initial** | `GET /api/mobile/bootstrap?userId={id}` | Retourne l'état complet des équipes dont l'utilisateur est membre (projets, colonnes, tâches, sous-tâches, jalons, messages, fichiers, formations, sessions, objectifs, compétences). |
| **Mutations CRUD** | `POST /api/mobile/sync` | Point d'entrée transactionnel pour créer, modifier, déplacer ou supprimer des entités et journaliser l'activité. |
| **Fichiers** | `GET /api/mobile/files/:id?inline=1` | Sert les fichiers uploadés depuis `backend/uploads/` pour prévisualisation directe (images, texte/code/markdown, PDF) ou téléchargement. |

### Vérification des Permissions Métier :
- Un utilisateur **`COACH`** ou **`VIEWER`** ne peut pas créer, éditer ou déplacer des tâches (HTTP `403` côté backend et désactivation des actions côté UI).
- Les notes privées (`privateNotes`) d'une séance de coaching ne peuvent être rédigées et consultées que par le coach de la séance (`coachId === userId`).
- Une formation ayant atteint sa capacité maximale (`capacity`) rejette toute nouvelle inscription.

---

## 3. Scénarios par Profil d'Équipe

| Rôle | Profil | Parcours & Fonctionnalités Clés |
| :--- | :--- | :--- |
| **Chef de Projet (`OWNER`)** | **Léa Martin** | Crée et organise les colonnes Kanban, gère les projets, génère les rapports d'avancement, invite des membres via le code d'équipe. |
| **Administrateur (`ADMIN`)** | **Karim Belkacem** | Filtre sur « Mes tâches », déplace les cartes entre colonnes, coche les sous-tâches, partage et prévisualise des fichiers. |
| **Membre (`MEMBER`)** | **Sami Youssef** | Consulte ses tâches assignées, s'inscrit aux formations disponibles, demande une séance de coaching (créneau, durée, mode), suit ses objectifs. |
| **Coach Pédagogique (`COACH`)** | **Mme Dupont** | Supervise les projets sans altérer les tâches étudiantes, crée des formations, confirme et clôture les séances avec synthèse partagée et **notes privées confidentielles**, évalue la matrice de compétences. |

---

## 4. Fonctionnalités Avancées

1. **Architecture Modulaire par Couches & Domaines :**
   - Séparation stricte en `models/`, `services/`, `repositories/`, `providers/`, `screens/` et `widgets/`, découpée sur 5 domaines (`auth`, `kanban`, `calendar`, `communication`, `coaching`).
2. **Découpage Automatique de Tâches (`aiBreakdownTask`) :**
   - Génère automatiquement 3 sous-tâches pertinentes à partir du titre de la tâche lors de la création.
3. **Agenda Mensuel & Multi-Sources :**
   - Grille calendaire mensuelle interactive + flux chronologique fusionnant échéances de tâches, jalons, formations et séances de coaching.
4. **Upload & Prévisualisation de Fichiers Réels :**
   - Sélection multi-plateforme (`file_picker`), encodage Base64 vers `backend/uploads/`, stockage `File` + `FileVersion`, et visionneuse intégrée.
5. **Création de Compte Sécurisée :**
   - Générateur automatique de mot de passe robuste (`Random.secure()`) avec copie en 1 clic dans le presse-papiers.

---

## 5. Qualité, Tests & Résilience

- **State Management Réactif :** `StudyFlowStore` (`ChangeNotifier`) composé de mixins par domaine (`AuthProviderMixin`, `KanbanProviderMixin`, `CalendarProviderMixin`, `CommunicationProviderMixin`, `CoachingProviderMixin`) avec mises à jour optimistes.
- **Tests Automatisés (`flutter test`) :** 11 tests couvrant les contrats métier, la gestion des colonnes Kanban (réorganisation, interdiction de supprimer la dernière colonne, migration des tâches, préservation de `isDone`), l'indexation fractionnaire `calculateBetween`, la capacité des formations et les restrictions de rôle.
- **Analyse Statique (`flutter analyze`) :** 0 erreur, 0 warning.
