# 🚀 StudyFlow v1.0 — Progressive Web App (PWA)

> **Application de gestion de projet mobile-first pour équipes étudiantes avec mode hors-ligne et assistant IA.**
> Réalisée conformément au cahier des charges StudyFlow et aux exigences de la validation notée du module **Modern Mobile Application**.

---

## 📱 Points Clés pour la Validation Notée du Professeur

### 1. Progressive Web App (PWA) & Mode Hors-ligne
- **Fichier Manifest (`/manifest.json`)** : Application installable en mode *standalone*, avec icônes haute résolution (192x192, 512x512 et maskable), `theme_color` (#4f46e5), et raccourcis d'accès rapide (Kanban, Calendrier, Assistant IA).
- **Service Worker (`/sw.js`)** : Stratégie de mise en cache hybride (*Stale-While-Revalidate* pour les assets statiques, *Network First* avec secours *Offline Cache* pour les pages).
- **Indicateur Réseau & Persistance Local-First** : Détection en direct de l'état `Online` / `Offline` avec sauvegarde instantanée dans le stockage local (LocalStorage / IndexedDB). Même déconnecté d'Internet **toutes les opérations CRUD fonctionnent sans interruption**.

### 2. Interface Mobile-First & Responsive
- **Navigation Tactile** : Barre inférieure flottante (`MobileBottomNav`) spécialement pensée pour l'usage smartphone avec retour visuel et badges.
- **Tableau Kanban Mobile** : Boutons de transfert rapide entre colonnes (`<` et `>`) sur chaque carte pour un déplacement fluide à une main sur écran tactile, en plus du drag-and-drop.
- **Design System Sombre & Élégant** : Tokens Tailwind, composants glassmorphism, contrastes WCAG AA, modales et fiches adaptées aux petits et grands écrans.

### 3. Opérations CRUD & Logiques Métiers
- **Tableau Kanban dynamique (M2 & M3)** : Colonnes d'avancement (*À faire*, *En cours*, *En relecture*, *Terminé*), respect des limites de travail en cours (**WIP Limits** avec avertissement visuel), déplacement et mise à jour automatique de la date d'achèvement (`completedAt`).
- **Gestion Complète des Tâches (CRUD)** :
  - Création, modification, duplication, suppression.
  - Priorités (*Basse*, *Normale*, *Haute*, *Urgente*).
  - Gestion des échéances avec détection automatique des retards.
  - Étiquettes colorées et assignations multi-membres.
  - **Checklist de sous-tâches interactive** avec calcul de la barre de progression en temps réel.
- **Calendrier & Jalons Clés (M4)** : Vue mensuelle des échéances, détection des retards, et gestion des dates clés de soutenance (*Milestones*).
- **Messagerie & Partage de Fichiers (M5 & M6)** : Salon de discussion en temps réel du projet et gestionnaire de fichiers avec jauge de quota disque (500 Mo).
- **Tableau de Bord & Burndown Chart (M7)** : Taux d'avancement global en %, graphique Burndown (reste à faire idéal vs réel), charge par étudiant, et générateur de rapport de projet.

### 4. 🌟 Module Bonus : Assistant d'Intelligence Artificielle
- **Génération Kanban** : Génération d'un tableau complet (colonnes, tâches et sous-tâches) ou prévisualisation de colonnes avant leur ajout au projet.
- **Chatbot contextuel** : Assistant disponible sur tous les écrans, qui répond aux questions en fonction du projet et du module affiché.
- **Calendrier assisté par IA** : Extraction d'événements datés depuis un texte, aperçu avant ajout aux jalons du projet et export iCalendar (`.ics`).
- **Résumé hebdomadaire par e-mail** : Le scheduler envoie un récapitulatif des tâches, jalons, formations et coachings à venir.
- **Découpage Intelligent de Tâches (*Smart Breakdown*)** : L'IA analyse n'importe quel intitulé de travail étudiant et génère instantanément les sous-tâches techniques, l'estimation horaire et la priorité, avec possibilité d'insertion directe dans le Kanban en 1 clic.
- **Audit de Santé du Projet (*Project Health Audit*)** : Score de maturité sur 100, détection des goulots d'étranglement (dépassement WIP, retards, charge déséquilibrée) et recommandations d'optimisation.
- **Fiche de Synthèse pour la Soutenance** : Synthèse exécutive prête pour la présentation orale devant Maysa Tebai.

---

## 🛠️ Lancement en Local

```bash
# 1. Installation des dépendances (déjà effectuée)
npm install

# 2. Lancer le serveur de développement
npm run dev

# 3. Ouvrir l'application
# Rendez-vous sur http://localhost:3000 depuis votre navigateur ou votre smartphone (via l'adresse IP locale)
```

### Synchroniser les données de démonstration existantes

Pour mettre à jour les profils de démonstration et ajouter les tâches et jalons de fin 2026 sans réinitialiser MongoDB :

```bash
npm run db:sync-demo
```

Cette synchronisation conserve les équipes, les rôles et les mots de passe existants.

---

## 📋 Scénario Recommandé pour la Démonstration Notée

1. **Présentation de la PWA & Installation** : Montrer l'icône de l'application, le bouton d'installation PWA dans l'en-tête, et la navigation mobile-first.
2. **Preuve du Mode Hors-ligne** : Ouvrir l'inspecteur Chrome (ou couper le Wi-Fi), passer en mode *Offline* : le badge passe en mode hors-ligne et l'application continue de fonctionner parfaitement sans rechargement.
3. **Cycle CRUD Tâche & Kanban** :
   - Créer ou éditer une tâche avec sous-tâches et priorités.
   - Utiliser le bouton de déplacement rapide pour passer la carte en « Terminé ».
   - Constater la mise à jour immédiate du pourcentage d'avancement et du journal d'activité.
4. **Vue Calendrier & Jalons** : Montrer les échéances et le jalon de la soutenance.
5. **Démonstration du Module Bonus IA** :
   - Utiliser le bouton IA du Kanban pour générer un tableau ou des colonnes.
   - Utiliser le bouton IA de la vue Tâches pour découper une tâche.
   - Utiliser le bouton IA des statistiques pour consulter l'audit de santé et la fiche de soutenance.
   - Ouvrir le chatbot contextuel depuis n'importe quel écran.

---

## API IA, rôles et notifications

StudyFlow utilise Next.js Route Handlers et son adaptateur MongoDB existant (et non NestJS/Mongoose). Les nouvelles fonctionnalités suivent cette architecture afin d'éviter une migration de framework.

### Endpoints

- `POST /api/ai` : assistant contextuel; transmettez `question`, le `module` actif, `projectId` et éventuellement l'historique récent (`history`).
- `POST /api/ai` avec `operation` :
  - `AI_GENERATE_KANBAN` : `prompt`, et `projectId` ou `createNewProject: true` avec `projectName`.
  - `AI_GENERATE_COLUMNS` : `projectId` et `prompt`.
  - `AI_EXTRACT_CALENDAR_EVENTS` : `projectId` et texte source (`text`); seuls les événements datés extraits et validés sont ajoutés au calendrier.
  - `AI_GENERATE_TASK` : `projectId` et `prompt`.
  - `AI_ADD_SUBTASKS` : `taskId`.
  - `AI_EXTRACT_PROFILE_SKILLS` : `teamId` et `text`.
- `POST /api/cron` : prépare les rappels H-24, les rappels de retard, le résumé hebdomadaire et traite la file. Cet endpoint exige l'en-tête `x-cron-secret`.
- `GET /api/calendar/export?projectId=...` : télécharge les échéances et jalons du projet au format `.ics` pour un membre connecté.
- `POST /api/milestones` et `DELETE /api/milestones?id=...` : enregistre ou supprime les événements du calendrier avec vérification d'appartenance au projet.

Les assistants n'incluent pas les notes privées de coaching. La génération IA vérifie l'appartenance au projet et n'autorise que `OWNER` et `MEMBER`; le coach ne peut modifier ni tâches, ni colonnes, ni fichiers. `OWNER` est seul à gérer l'équipe, les rôles et la création de projets.

### Variables d'environnement

Les valeurs sont lues depuis `.env` et ne doivent pas être commitées :

- IA : `GEMINI_API_KEY` et `GEMINI_MODEL` (Gemini est le fournisseur principal; `GROQ_API_KEY` et `GROQ_MODEL` sont facultatifs comme repli). Les clés restent côté serveur.
- E-mails : `MAIL_ENABLED`, `EMAIL_SERVER` (ou `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`), `SMTP_USER`, `SMTP_PASS` et `EMAIL_FROM`.
- Planification : `CRON_SECRET`, `SCHEDULER_INTERVAL_MIN` et `NEXT_PUBLIC_APP_URL`.

Le worker appelle `/api/cron` périodiquement. Démarrez l'application, puis le worker dans un second terminal avec `npm run scheduler`. Le résumé hebdomadaire est dédupliqué par membre et semaine. Si l'envoi SMTP est désactivé, les e-mails restent en attente et seul le nombre de messages est journalisé.

### MongoDB et données historiques

La collection `emailQueues` est créée au premier envoi en file. Le premier rappel crée également un index unique partiel sur `fingerprint`, afin de dédupliquer par type, tâche et utilisateur; aucun changement de schéma n'est requis. Les collections de l'application restent celles de l'adaptateur MongoDB existant.

Les rôles acceptés par le code sont maintenant `OWNER`, `MEMBER` et `COACH`. Les anciennes valeurs `ADMIN` et `VIEWER` ne sont pas converties automatiquement : un propriétaire doit réattribuer les membres historiques depuis la gestion d'équipe avant de déployer, car toute conversion automatique pourrait accorder des droits différents.
