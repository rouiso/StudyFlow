# StudyFlow — Dossier de Présentation & Réflexion Technique
## Séance 2 (14) & Séance 3 Finale (21)

---

## 1. Contexte & Choix d'Architecture (Séance 2)

### 1.1 Problématique & Objectif
StudyFlow est une plateforme collaborative de gestion de projet universitaire (mini-Trello / Notion augmenté) dotée d'un espace de formations et de coaching pédagogique (Modules 1 à 7).

Pour répondre aux exigences de la **Séance 2**, le projet a mis en œuvre :
- Une architecture hybride Web (PWA Next.js) et Mobile (Flutter / Dart).
- Une couche backend robuste basée sur **Node.js / Next.js API Routes** adossée à l'ORM **Prisma** et une base relationnelle **SQLite / PostgreSQL**.
- La consommation de services web via **REST API complète (CRUD)** pour consulter, créer, modifier et supprimer des ressources en direct depuis le client mobile Flutter.

### 1.2 Justification du choix de la stack Backend (Next.js + Prisma vs Firebase / Spring / Django)
| Critère | Next.js 15 + Prisma (Choisi) | Firebase | Spring Boot / Django |
| :--- | :--- | :--- | :--- |
| **Typage de bout en bout** | Schéma déclaratif `schema.prisma` unique, typage strict TypeScript et équivalents Dart. | NoSQL non structuré, règles de sécurité complexes à maintenir. | Très verbeux (Spring) ou typage partiel (Django standard). |
| **Règles métier strictes** | Contrôles d'accès précis (§4.2 : rôle COACH en lecture seule sur les tâches, §7.3 : confidentialité des notes privées). | Règles Firestore limitées pour les logiques transversales conditionnelles. | Possible mais demande une configuration lourde de controllers et d'entités. |
| **Cohérence Web + Mobile** | La même base de données alimente à la fois l'application Web PWA et l'application mobile Flutter. | Nécessite des connecteurs séparés et une synchronisation manuelle. | Développements séparés. |
| **Temps d'exécution & Démo** | Démarrage instantané, base SQLite embarquée sans dépendance cloud externe bloquante. | Dépend d'une connexion internet et de quotas de projet. | Démarrage lent (JVM). |

---

## 2. Évaluation de la Consommation de Web Services REST API (Séance 2)

Le client mobile Flutter consomme les web services REST exposés par le serveur Next.js :

| Action REST | Endpoint API | Description & Logique Métier Prisma |
| :--- | :--- | :--- |
| **GET (Consulter)** | `/api/mobile/bootstrap?userId={id}` | Récupère l'état complet du projet (projets, colonnes, tâches, sous-tâches, jalons, formations, sessions). Filtre strictement les `privateNotes` pour que seul le Coach puisse les lire. |
| **POST (Créer)** | `/api/mobile/sync` (`CREATE_TASK`) | Crée une tâche avec ses sous-tâches et assignés dans Prisma. Journalise l'événement dans la table `Activity`. |
| **PUT/POST (Modifier)** | `/api/mobile/sync` (`UPDATE_TASK` / `MOVE_TASK`) | Modifie le titre, la description, la priorité ou déplace la carte entre colonnes Kanban avec calcul de position. |
| **DELETE (Supprimer)** | `/api/mobile/sync` (`DELETE_TASK`) | Supprime la tâche et ses sous-tâches en cascade. |
| **POST (Authentification)** | `/api/mobile/auth` | Login et Inscription avec rattachement automatique à l'équipe. |

### Vérification des Permissions Métier (§4.2 & §7.3) :
- Si un utilisateur ayant le rôle **`COACH`** ou **`VIEWER`** tente une action de création, modification ou suppression de tâche, l'API renvoie immédiatement un code **`HTTP 403 Forbidden`** et l'interface Flutter désactive les boutons correspondants.
- Lors d'une inscription à une formation, si la capacité maximale est atteinte (`capacity`), l'API refuse l'inscription avec un message d'erreur explicite.

---

## 3. Scénarios par Membre d'Équipe (Séance 3 — 15 points)

| Rôle | Membre Démo | Scénario & Parcours de Test |
| :--- | :--- | :--- |
| **Chef de Projet (OWNER)** | **Léa Martin** | 1. Se connecte en 1 clic.<br>2. Crée et organise les colonnes Kanban.<br>3. Assigne des tâches aux membres.<br>4. Génère le rapport d'avancement global (M4). |
| **Lead Developer (ADMIN)** | **Thomas Dubois** | 1. Filtre sur « Mes tâches » pour visualiser son travail.<br>2. Déplace une tâche vers *En cours* ou *Terminé*.<br>3. Coche les sous-tâches terminées.<br>4. Partage des fichiers de spécifications. |
| **Développeuse (MEMBER)** | **Sarah Benali** | 1. Consulte ses tâches assignées.<br>2. S'inscrit à une formation technique disponible.<br>3. Envoie une demande de séance de coaching pédagogique.<br>4. Met à jour la progression de ses objectifs. |
| **Coach Pédagogique (COACH)** | **Mme Claire Dupont** | 1. Accède en mode supervision (§4.2 : pas de modification des tâches étudiantes).<br>2. Confirme les créneaux de coaching demandés.<br>3. Rédige la synthèse partagée et **accède à ses notes privées confidentielles**.<br>4. Évalue les compétences des étudiants sur la matrice. |

---

## 4. Fonctionnalités Avancées & IA (Séance 3 & Bonus)

1. **Découpage Automatique de Tâches par IA (`aiBreakdownTask`) :**
   - Lors de la création d'une tâche (ex: « Conception API Prisma »), le moteur d'assistance génère automatiquement 3 sous-tâches techniques pertinentes et estimées.
2. **Agenda Multi-Sources Consolidé (Module 4) :**
   - Fusionne en temps réel 4 flux temporels distincts avec codes couleurs : Échéances des tâches, Jalons du projet, Formations planifiées et Séances de coaching.
3. **Bascule Instantanée de Session & Démo (1-clic) :**
   - Sélecteur de persona en en-tête permettant au jury ou aux évaluateurs de basculer instantanément entre les 4 profils sans ressaisie de mot de passe.

---

## 5. Justification des Choix Techniques (Notions de base Flutter — 5 points)

- **State Management (Store Réactif via `ChangeNotifier`) :**
  - Utilisation du pattern Provider / ListenableBuilder natif Flutter : architecture découplée, propre, sans dépendances lourdes, assurant une réactivité immédiate de l'interface lors des appels API.
- **Null Safety & Dart 3 :**
  - Utilisation des records Dart, patterns exhaustifs pour les enums et null safety stricte garantissant zéro plantage au runtime.
- **Résilience & Mode Hors-ligne :**
  - Si le serveur backend Next.js n'est pas lancé, l'application bascule automatiquement sur les données seedées Prisma locales sans bloquer l'utilisateur.

