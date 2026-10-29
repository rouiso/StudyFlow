# 🚀 StudyFlow v1.0 — Progressive Web App (PWA)

> **Application de gestion de projet mobile-first pour équipes étudiantes avec mode hors-ligne et assistant IA.**
> Réalisée conformément au cahier des charges StudyFlow et aux exigences de la validation notée du module **Modern Mobile Application**.

---

## 📱 Points Clés pour la Validation Notée du Professeur

### 1. Progressive Web App (PWA) & Mode Hors-ligne
- **Fichier Manifest (`/manifest.json`)** : Application installable en mode *standalone*, avec icônes haute résolution (192x192, 512x512 et maskable), `theme_color` (#4f46e5), et raccourcis d'accès rapide (Kanban, Calendrier, Assistant IA).
- **Service Worker (`/sw.js`)** : Stratégie de mise en cache hybride (*Stale-While-Revalidate* pour les assets statiques, *Network First* avec secours *Offline Cache* pour les pages).
- **Indicateur Réseau & Persistance Local-First** : Détection en direct de l'état `Online` / `Offline` avec sauvegarde instantanée dans le stockage local (LocalStorage / IndexedDB). Même déconnecté d'Internet, **toutes les opérations CRUD fonctionnent sans interruption**.

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
- **Découpage Intelligent de Tâches (*Smart Breakdown*)** : L'IA analyse n'importe quel intitulé de travail étudiant et génère instantanément les sous-tâches techniques, l'estimation horaire et la priorité, avec possibilité d'insertion directe dans le Kanban en 1 clic.
- **Audit de Santé du Projet (*Project Health Audit*)** : Score de maturité sur 100, détection des goulots d'étranglement (dépassement WIP, retards, charge déséquilibrée) et recommandations d'optimisation.
- **Fiche de Synthèse pour la Soutenance** : Synthèse exécutive prête pour la présentation orale devant Mme Dupont.

---

## 🛠️ Lancement en Local

```bash
# 1. Installer les dépendances
npm install

# 2. Configurer la base SQLite locale
# Créer .env à partir de .env.example, puis conserver DATABASE_URL=file:./dev.db
npx prisma db push
npm run db:seed

# 3. Lancer le serveur de développement
npm run dev

# 4. Ouvrir l'application
# Rendez-vous sur http://localhost:3000 depuis votre navigateur ou votre smartphone (via l'adresse IP locale)
```

Le fichier `.env` doit définir `DATABASE_URL` pour Prisma. Pour une installation locale SQLite, utilisez `DATABASE_URL="file:./dev.db"`.

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
   - Ouvrir l'onglet **IA Copilot**.
   - Lancer un découpage automatique de tâche et l'insérer dans le Kanban.
   - Montrer l'audit de santé et la fiche de soutenance.
