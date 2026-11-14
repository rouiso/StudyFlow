# StudyFlow — Architecture Complète & Guide des Modules

## 1. Vue d'ensemble de l'architecture

StudyFlow est structuré en **architecture en couches (Layered Architecture)** organisée par **domaines métier**. Chaque couche a une responsabilité unique et stricte :

```text
frontend/lib/
├── main.dart                         # Point d'entrée, thème Material 3 & navigation adaptative
├── widgets/
│   └── studyflow_logo.dart           # Logo vectoriel StudyFlow (CustomPainter)
├── core/
│   ├── domain/                       # Contrats métier et règles pures (ex: kanban_columns.dart)
│   └── models/
│       └── studyflow_models.dart     # Barrel export de tous les modèles par domaine
├── models/                           # Modèles immuables + fromJson / copyWith par domaine
│   ├── auth_models.dart
│   ├── kanban_models.dart
│   ├── calendar_models.dart
│   ├── communication_models.dart
│   └── coaching_models.dart
├── services/                         # Transport HTTP bas niveau & données de repli hors ligne
│   ├── api/api_client.dart           # Client HTTP générique (GET / POST JSON + timeout)
│   ├── auth/auth_api_service.dart    # Endpoints /api/mobile/auth, JOIN_TEAM, INVITE_MEMBER
│   ├── sync/sync_api_service.dart    # Endpoints /api/mobile/bootstrap et /api/mobile/sync
│   ├── kanban/kanban_api_service.dart
│   ├── calendar/calendar_api_service.dart
│   ├── communication/communication_api_service.dart
│   ├── coaching/coaching_api_service.dart
│   ├── prisma_api_service.dart       # Façade unifiée exposant les services par module
│   └── seed_data.dart                # Jeu de données hors ligne (StudyFlowSeedData)
├── repositories/                     # Mapping JSON -> Modèles & orchestration des syncs
│   ├── auth/auth_repository.dart
│   ├── kanban/kanban_repository.dart
│   ├── calendar/calendar_repository.dart
│   ├── communication/communication_repository.dart
│   ├── coaching/coaching_repository.dart
│   └── studyflow_repository.dart     # Agrégateur WorkspaceSnapshot (bootstrap)
├── providers/                        # État réactif UI (ChangeNotifier + mises à jour optimistes)
│   ├── studyflow_provider_base.dart  # État partagé, getters et hydrateFromPrisma()
│   ├── studyflow_provider.dart       # Store composite (StudyFlowStore / StudyFlowProvider)
│   ├── auth/auth_provider.dart
│   ├── kanban/kanban_provider.dart
│   ├── calendar/calendar_provider.dart
│   ├── communication/communication_provider.dart
│   └── coaching/coaching_provider.dart
└── screens/                          # Interfaces utilisateur (Auth & Modules)
    ├── auth/login_screen.dart
    └── modules/
        ├── kanban_screen.dart
        ├── tasks_screen.dart
        ├── calendar_reports_screen.dart
        ├── chat_files_screen.dart
        ├── training_coaching_screen.dart
        └── teams_overview_screen.dart
```

### Flux de données (Data Flow)
1. **UI (`screens/`)** déclenche une action sur le **Provider** (`StudyFlowStore`).
2. **Provider (`providers/`)** applique une mise à jour optimiste locale (`notifyListeners()`) puis délègue au **Repository**.
3. **Repository (`repositories/`)** appelle le **Service** du module correspondant (`services/`) et transforme les réponses JSON en modèles typés (`models/`).
4. **Backend (`backend/server.js`)** valide les droits, persiste via **Prisma ORM** dans SQLite (`dev.db`) et renvoie `{ ok: true, data }`.

---

## 2. Explication détaillée de chaque module

### Module 1 — Authentification & Équipes (`auth`)
- **Fichiers clés :** [auth_models.dart](file:///C:/Users/moham/Documents/StudyFlow-Mobile-Project/frontend/lib/models/auth_models.dart), [auth_api_service.dart](file:///C:/Users/moham/Documents/StudyFlow-Mobile-Project/frontend/lib/services/auth/auth_api_service.dart), [auth_repository.dart](file:///C:/Users/moham/Documents/StudyFlow-Mobile-Project/frontend/lib/repositories/auth/auth_repository.dart), [auth_provider.dart](file:///C:/Users/moham/Documents/StudyFlow-Mobile-Project/frontend/lib/providers/auth/auth_provider.dart), [login_screen.dart](file:///C:/Users/moham/Documents/StudyFlow-Mobile-Project/frontend/lib/screens/auth/login_screen.dart), [teams_overview_screen.dart](file:///C:/Users/moham/Documents/StudyFlow-Mobile-Project/frontend/lib/screens/modules/teams_overview_screen.dart).
- **Fonctionnement :**
  - Connexion classique email/mot de passe, inscription avec générateur de mot de passe fort (`Random.secure()`), et accès rapide pour les 4 profils de l'équipe.
  - Lors d'une inscription (`mode: 'register'`), le backend crée automatiquement une équipe dédiée (`Team` avec `inviteToken`), un projet initial et ses colonnes par défaut.
  - Gestion d'équipe : affichage du code d'invitation, adhésion à une autre équipe (`JOIN_TEAM`), et invitation d'un membre par e-mail avec choix du rôle (`INVITE_MEMBER`).
  - **Rôles :** `OWNER`, `ADMIN`, `MEMBER`, `COACH`, `VIEWER`.

### Module 2 — Projets & Tableau Kanban (`kanban`)
- **Fichiers clés :** [kanban_models.dart](file:///C:/Users/moham/Documents/StudyFlow-Mobile-Project/frontend/lib/models/kanban_models.dart), [kanban_columns.dart](file:///C:/Users/moham/Documents/StudyFlow-Mobile-Project/frontend/lib/core/domain/kanban_columns.dart), [kanban_api_service.dart](file:///C:/Users/moham/Documents/StudyFlow-Mobile-Project/frontend/lib/services/kanban/kanban_api_service.dart), [kanban_repository.dart](file:///C:/Users/moham/Documents/StudyFlow-Mobile-Project/frontend/lib/repositories/kanban/kanban_repository.dart), [kanban_provider.dart](file:///C:/Users/moham/Documents/StudyFlow-Mobile-Project/frontend/lib/providers/kanban/kanban_provider.dart), [kanban_screen.dart](file:///C:/Users/moham/Documents/StudyFlow-Mobile-Project/frontend/lib/screens/modules/kanban_screen.dart).
- **Fonctionnement :**
  - Multi-projets : création, sélection et modification des projets depuis l'en-tête.
  - Colonnes Kanban dynamiques : création, renommage, limite WIP (`wipLimit`), marquage `Terminé` (`isDone`), réorganisation gauche/droite (`REORDER_COLUMNS`), et suppression sécurisée (refus si dernière colonne, migration automatique des tâches et préservation du statut `isDone`).
  - Indexation fractionnaire `calculateBetween(prev, next)` pour positionner les cartes sans réindexer toute la colonne.

### Module 3 — Tâches, Sous-tâches & Découpage IA (`kanban` / `tasks_screen.dart`)
- **Fichiers clés :** [tasks_screen.dart](file:///C:/Users/moham/Documents/StudyFlow-Mobile-Project/frontend/lib/screens/modules/tasks_screen.dart), [kanban_screen.dart](file:///C:/Users/moham/Documents/StudyFlow-Mobile-Project/frontend/lib/screens/modules/kanban_screen.dart), [kanban_provider.dart](file:///C:/Users/moham/Documents/StudyFlow-Mobile-Project/frontend/lib/providers/kanban/kanban_provider.dart).
- **Fonctionnement :**
  - Création et édition complète des tâches : titre, description, colonne cible, priorité (`basse`, `normale`, `haute`, `urgente`), date d'échéance optionnelle (`showDatePicker`), et assignation multi-membres.
  - Générateur automatique de sous-tâches (`aiBreakdownTask`) basé sur le titre de la tâche.
  - Vue liste dédiée avec suivi de progression des sous-tâches et bascule `TOGGLE_SUBTASK`.
  - Respect strict du rôle `COACH` / `VIEWER` (`canEditTasks == false` en UI et HTTP `403` côté serveur).

### Module 4 — Agenda, Jalons & Rapports (`calendar`)
- **Fichiers clés :** [calendar_models.dart](file:///C:/Users/moham/Documents/StudyFlow-Mobile-Project/frontend/lib/models/calendar_models.dart), [calendar_api_service.dart](file:///C:/Users/moham/Documents/StudyFlow-Mobile-Project/frontend/lib/services/calendar/calendar_api_service.dart), [calendar_repository.dart](file:///C:/Users/moham/Documents/StudyFlow-Mobile-Project/frontend/lib/repositories/calendar/calendar_repository.dart), [calendar_provider.dart](file:///C:/Users/moham/Documents/StudyFlow-Mobile-Project/frontend/lib/providers/calendar/calendar_provider.dart), [calendar_reports_screen.dart](file:///C:/Users/moham/Documents/StudyFlow-Mobile-Project/frontend/lib/screens/modules/calendar_reports_screen.dart).
- **Fonctionnement :**
  - **Calendrier mensuel interactif** : grille mois par mois avec navigation, indicateurs colorés par type d'événement et détail du jour sélectionné.
  - **Agenda consolidé** : agrège échéances de tâches, jalons du projet, formations et séances de coaching.
  - **Jalons & Rapports** : CRUD complet sur les jalons (`CREATE_MILESTONE`, `UPDATE_MILESTONE`), calcul en direct du taux d'avancement, et génération/suppression de rapports persistés (`GENERATE_REPORT`, `DELETE_REPORT`).

### Module 5 & 6 — Messagerie & Fichiers Partagés (`communication`)
- **Fichiers clés :** [communication_models.dart](file:///C:/Users/moham/Documents/StudyFlow-Mobile-Project/frontend/lib/models/communication_models.dart), [communication_api_service.dart](file:///C:/Users/moham/Documents/StudyFlow-Mobile-Project/frontend/lib/services/communication/communication_api_service.dart), [communication_repository.dart](file:///C:/Users/moham/Documents/StudyFlow-Mobile-Project/frontend/lib/repositories/communication/communication_repository.dart), [communication_provider.dart](file:///C:/Users/moham/Documents/StudyFlow-Mobile-Project/frontend/lib/providers/communication/communication_provider.dart), [chat_files_screen.dart](file:///C:/Users/moham/Documents/StudyFlow-Mobile-Project/frontend/lib/screens/modules/chat_files_screen.dart).
- **Fonctionnement :**
  - **Chat d'équipe par projet** : envoi, modification (`EDIT_MESSAGE`) et suppression (`DELETE_MESSAGE`) des messages par leur auteur.
  - **Gestion documentaire réelle** : sélection de fichier local via `file_picker`, envoi Base64 (`UPLOAD_FILE`), écriture sur disque dans `backend/uploads/` avec versioning (`File` + `FileVersion`), suppression (`DELETE_FILE`), et **visionneuse intégrée** (images, texte/code/Markdown/JSON, PDF).

### Module 7 — Formations, Coaching, Objectifs & Compétences (`coaching`)
- **Fichiers clés :** [coaching_models.dart](file:///C:/Users/moham/Documents/StudyFlow-Mobile-Project/frontend/lib/models/coaching_models.dart), [coaching_api_service.dart](file:///C:/Users/moham/Documents/StudyFlow-Mobile-Project/frontend/lib/services/coaching/coaching_api_service.dart), [coaching_repository.dart](file:///C:/Users/moham/Documents/StudyFlow-Mobile-Project/frontend/lib/repositories/coaching/coaching_repository.dart), [coaching_provider.dart](file:///C:/Users/moham/Documents/StudyFlow-Mobile-Project/frontend/lib/providers/coaching/coaching_provider.dart), [training_coaching_screen.dart](file:///C:/Users/moham/Documents/StudyFlow-Mobile-Project/frontend/lib/screens/modules/training_coaching_screen.dart).
- **Fonctionnement :**
  - **Formations** : création/édition/suppression (réservées aux `COACH`/`ADMIN`/`OWNER`) avec dates de début/fin, mode (`ONLINE`/`ONSITE`), salle et contrôle strict de la capacité lors des inscriptions (`ENROLL_TRAINING`, `UNENROLL_TRAINING`).
  - **Coaching** : demande de séance avec choix du coach, sujet, durée, mode et créneau ; confirmation par le coach avec lien de visioconférence unique (`CONFIRM_COACHING`) ; clôture avec synthèse partagée et **notes privées strictement confidentielles** (`COMPLETE_COACHING`).
  - **Objectifs & Matrice de compétences** : suivi de progression par curseur (`0-100%`), suppression d'objectifs, et auto-évaluation ou évaluation par le coach sur 5 niveaux (`ASSESS_SKILL`).
