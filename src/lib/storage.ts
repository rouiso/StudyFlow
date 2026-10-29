import {
  User,
  Team,
  TeamMember,
  Project,
  Column,
  Task,
  Subtask,
  Label,
  Milestone,
  Message,
  AppNotification,
  FileItem,
  Activity,
  ProjectReport,
} from '@/types';

export interface StudyFlowData {
  currentUser: User;
  users: User[];
  teams: Team[];
  members: TeamMember[];
  projects: Project[];
  columns: Column[];
  tasks: Task[];
  subtasks: Subtask[];
  labels: Label[];
  milestones: Milestone[];
  messages: Message[];
  notifications: AppNotification[];
  files: FileItem[];
  activities: Activity[];
  reports: ProjectReport[];
}

const STORAGE_KEY = 'studyflow_data_v1.0';

// Seed data initial fidèle au cahier des charges StudyFlow
export const initialData: StudyFlowData = {
  currentUser: {
    id: 'user-1',
    name: 'Léa Martin',
    email: 'lea.martin@univ-etudiant.fr',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    role: 'OWNER',
    joinedAt: '2026-09-01T08:00:00Z',
  },
  users: [
    {
      id: 'user-1',
      name: 'Léa Martin',
      email: 'lea.martin@univ-etudiant.fr',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      role: 'OWNER',
      joinedAt: '2026-09-01T08:00:00Z',
    },
    {
      id: 'user-2',
      name: 'Karim Belkacem',
      email: 'karim.belkacem@univ-etudiant.fr',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      role: 'ADMIN',
      joinedAt: '2026-09-01T08:15:00Z',
    },
    {
      id: 'user-3',
      name: 'Sami Youssef',
      email: 'sami.youssef@univ-etudiant.fr',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      role: 'MEMBER',
      joinedAt: '2026-09-02T10:00:00Z',
    },
    {
      id: 'user-4',
      name: 'Chloé Dubois',
      email: 'chloe.dubois@univ-etudiant.fr',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      role: 'MEMBER',
      joinedAt: '2026-09-03T14:30:00Z',
    },
    {
      id: 'user-5',
      name: 'Mme Dupont',
      email: 'helene.dupont@univ-prof.fr',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      role: 'VIEWER',
      joinedAt: '2026-09-05T09:00:00Z',
    },
  ],
  teams: [
    {
      id: 'team-1',
      name: 'Équipe Projet Web S5',
      description: 'Groupe de développement StudyFlow pour le module Modern Mobile Application',
      slug: 'projet-web-s5',
      ownerId: 'user-1',
      inviteToken: 'STUDY-S5-2026',
      createdAt: '2026-09-01T08:00:00Z',
    },
  ],
  members: [
    { id: 'tm-1', teamId: 'team-1', userId: 'user-1', role: 'OWNER', joinedAt: '2026-09-01T08:00:00Z' },
    { id: 'tm-2', teamId: 'team-1', userId: 'user-2', role: 'ADMIN', joinedAt: '2026-09-01T08:15:00Z' },
    { id: 'tm-3', teamId: 'team-1', userId: 'user-3', role: 'MEMBER', joinedAt: '2026-09-02T10:00:00Z' },
    { id: 'tm-4', teamId: 'team-1', userId: 'user-4', role: 'MEMBER', joinedAt: '2026-09-03T14:30:00Z' },
    { id: 'tm-5', teamId: 'team-1', userId: 'user-5', role: 'VIEWER', joinedAt: '2026-09-05T09:00:00Z' },
  ],
  projects: [
    {
      id: 'proj-1',
      teamId: 'team-1',
      name: 'StudyFlow PWA v1.0',
      description: 'Plateforme mobile-first de gestion de projet étudiant avec mode hors-ligne et assistant IA.',
      color: '#4f46e5',
      startDate: '2026-10-01',
      endDate: '2026-11-15',
    },
    {
      id: 'proj-2',
      teamId: 'team-1',
      name: 'Application Réservation Campus',
      description: 'Système de réservation des salles de travail et matériel audiovisuel.',
      color: '#0ea5e9',
      startDate: '2026-11-01',
      endDate: '2026-12-20',
    },
  ],
  columns: [
    { id: 'col-1', projectId: 'proj-1', name: 'À faire', position: 1, isDone: false, color: '#94a3b8' },
    { id: 'col-2', projectId: 'proj-1', name: 'En cours', position: 2, wipLimit: 4, isDone: false, color: '#38bdf8' },
    { id: 'col-3', projectId: 'proj-1', name: 'En relecture', position: 3, wipLimit: 3, isDone: false, color: '#fbbf24' },
    { id: 'col-4', projectId: 'proj-1', name: 'Terminé', position: 4, isDone: true, color: '#34d399' },
  ],
  labels: [
    { id: 'lbl-1', projectId: 'proj-1', name: 'PWA / Mobile', color: '#6366f1' },
    { id: 'lbl-2', projectId: 'proj-1', name: 'Backend & CRUD', color: '#10b981' },
    { id: 'lbl-3', projectId: 'proj-1', name: 'IA Bonus', color: '#ec4899' },
    { id: 'lbl-4', projectId: 'proj-1', name: 'Offline Cache', color: '#f59e0b' },
    { id: 'lbl-5', projectId: 'proj-1', name: 'UI / UX', color: '#8b5cf6' },
  ],
  tasks: [
    {
      id: 'task-1',
      projectId: 'proj-1',
      columnId: 'col-4',
      title: 'Configuration Manifest PWA & Standalone mode',
      description: 'Créer le fichier manifest.json complet avec icônes haute résolution (192, 512, maskable) et shortcuts.',
      position: 1,
      priority: 'HAUTE',
      dueDate: '2026-10-25',
      createdById: 'user-1',
      createdAt: '2026-10-20T10:00:00Z',
      completedAt: '2026-10-25T16:00:00Z',
      assigneeIds: ['user-2'],
      labelIds: ['lbl-1'],
    },
    {
      id: 'task-2',
      projectId: 'proj-1',
      columnId: 'col-4',
      title: 'Mise en place du Service Worker & Cache Offline',
      description: 'Garantir que la PWA fonctionne sans connexion réseau (Network First / Stale While Revalidate).',
      position: 2,
      priority: 'URGENTE',
      dueDate: '2026-10-26',
      createdById: 'user-1',
      createdAt: '2026-10-21T09:00:00Z',
      completedAt: '2026-10-26T17:30:00Z',
      assigneeIds: ['user-3'],
      labelIds: ['lbl-1', 'lbl-4'],
    },
    {
      id: 'task-3',
      projectId: 'proj-1',
      columnId: 'col-2',
      title: 'Navigation Mobile-First & Barre Basse',
      description: 'Implémenter une barre de navigation inférieure fluide sur smartphone (bottom nav) et responsive desktop.',
      position: 1,
      priority: 'HAUTE',
      dueDate: '2026-10-29',
      createdById: 'user-1',
      createdAt: '2026-10-22T11:00:00Z',
      assigneeIds: ['user-4', 'user-2'],
      labelIds: ['lbl-1', 'lbl-5'],
    },
    {
      id: 'task-4',
      projectId: 'proj-1',
      columnId: 'col-2',
      title: 'Opérations CRUD complètes sur les tâches & Kanban',
      description: 'Ajouter, éditer, déplacer, archiver les tâches avec gestion des sous-tâches et calcul de progression.',
      position: 2,
      priority: 'URGENTE',
      dueDate: '2026-10-30',
      createdById: 'user-1',
      createdAt: '2026-10-23T08:30:00Z',
      assigneeIds: ['user-3', 'user-1'],
      labelIds: ['lbl-2'],
    },
    {
      id: 'task-5',
      projectId: 'proj-1',
      columnId: 'col-2',
      title: 'Module IA : Assistant de découpage intelligent de tâches',
      description: 'Intégrer le module d’intelligence artificielle capable de découper une tâche complexe en sous-tâches concrètes.',
      position: 3,
      priority: 'NORMALE',
      dueDate: '2026-11-02',
      createdById: 'user-1',
      createdAt: '2026-10-24T14:00:00Z',
      assigneeIds: ['user-2'],
      labelIds: ['lbl-3'],
    },
    {
      id: 'task-6',
      projectId: 'proj-1',
      columnId: 'col-3',
      title: 'Vue Calendrier et gestion des Jalons (Milestones)',
      description: 'Afficher les dates clés (rendu, soutenance) et visualiser les échéances avec alerte visuelle en retard.',
      position: 1,
      priority: 'NORMALE',
      dueDate: '2026-11-05',
      createdById: 'user-2',
      createdAt: '2026-10-24T15:00:00Z',
      assigneeIds: ['user-4'],
      labelIds: ['lbl-2'],
    },
    {
      id: 'task-7',
      projectId: 'proj-1',
      columnId: 'col-1',
      title: 'Génération du rapport d’avancement & Burndown Chart',
      description: 'Calculer la vélocité, le temps restant idéal vs réel, et permettre l’export du rapport pour l’enseignant.',
      position: 1,
      priority: 'NORMALE',
      dueDate: '2026-11-08',
      createdById: 'user-1',
      createdAt: '2026-10-25T10:00:00Z',
      assigneeIds: ['user-1'],
      labelIds: ['lbl-2', 'lbl-5'],
    },
    {
      id: 'task-8',
      projectId: 'proj-1',
      columnId: 'col-1',
      title: 'Messagerie de projet instantanée & centre de notifications',
      description: 'Chat d’équipe en temps réel avec notifications pour les assignations et mentions.',
      position: 2,
      priority: 'BASSE',
      dueDate: '2026-11-10',
      createdById: 'user-3',
      createdAt: '2026-10-25T11:00:00Z',
      assigneeIds: ['user-3'],
      labelIds: ['lbl-2'],
    },
  ],
  subtasks: [
    { id: 'sub-1', taskId: 'task-1', title: 'Définir manifest.json conforme W3C', done: true, position: 1 },
    { id: 'sub-2', taskId: 'task-1', title: 'Générer icônes 192x192 et 512x512', done: true, position: 2 },
    { id: 'sub-3', taskId: 'task-1', title: 'Configurer theme_color et background_color', done: true, position: 3 },
    { id: 'sub-4', taskId: 'task-2', title: 'Écrire sw.js avec mise en cache des assets statiques', done: true, position: 1 },
    { id: 'sub-5', taskId: 'task-2', title: 'Tester la navigation hors-ligne sans connexion', done: true, position: 2 },
    { id: 'sub-6', taskId: 'task-3', title: 'Concevoir la Bottom Navigation Bar pour mobile', done: true, position: 1 },
    { id: 'sub-7', taskId: 'task-3', title: 'Ajouter les gestes tactiles et bottom sheets', done: false, position: 2 },
    { id: 'sub-8', taskId: 'task-4', title: 'Créer formulaire d’ajout de tâche avec priorités', done: true, position: 1 },
    { id: 'sub-9', taskId: 'task-4', title: 'Ajouter bouton de déplacement rapide de colonne', done: false, position: 2 },
    { id: 'sub-10', taskId: 'task-4', title: 'Persister les modifications dans le Local-First store', done: true, position: 3 },
    { id: 'sub-11', taskId: 'task-5', title: 'Créer le prompt de découpage intelligent de tâche', done: true, position: 1 },
    { id: 'sub-12', taskId: 'task-5', title: 'Générer l’estimation horaire et assignation recommandée', done: false, position: 2 },
  ],
  milestones: [
    {
      id: 'mile-1',
      projectId: 'proj-1',
      title: 'Validation Notée Modern Mobile App (PWA)',
      date: '2026-11-03',
      description: 'Démonstration devant le professeur : PWA installable, mode hors ligne, CRUD complet et bonus IA.',
      completed: false,
    },
    {
      id: 'mile-2',
      projectId: 'proj-1',
      title: 'Remise du Cahier de Recette & Rapport',
      date: '2026-11-10',
      description: 'Dépôt des documents techniques et métriques de projet.',
      completed: false,
    },
    {
      id: 'mile-3',
      projectId: 'proj-1',
      title: 'Soutenance Finale du Projet',
      date: '2026-11-15',
      description: 'Présentation orale et démonstration de bout en bout de StudyFlow.',
      completed: false,
    },
  ],
  messages: [
    {
      id: 'msg-1',
      channelId: 'proj-1',
      authorId: 'user-1',
      content: 'Bonjour à tous ! Bienvenue sur StudyFlow. N’oubliez pas que la validation notée PWA a lieu la semaine prochaine.',
      createdAt: '2026-10-25T09:15:00Z',
    },
    {
      id: 'msg-2',
      channelId: 'proj-1',
      authorId: 'user-2',
      content: 'Super Léa ! Le Manifest PWA et les icônes sont configurés et testés.',
      createdAt: '2026-10-25T10:00:00Z',
    },
    {
      id: 'msg-3',
      channelId: 'proj-1',
      authorId: 'user-3',
      content: 'Le Service Worker intercepte bien le cache hors-ligne. Même en coupant le Wi-Fi, l’app s’affiche instantanément !',
      createdAt: '2026-10-25T11:20:00Z',
    },
    {
      id: 'msg-4',
      channelId: 'proj-1',
      authorId: 'user-5',
      content: 'Bravo à l’équipe pour cette belle avancée. N’oubliez pas de tester le scénario complet sur vos téléphones.',
      createdAt: '2026-10-25T14:45:00Z',
    },
  ],
  notifications: [
    {
      id: 'notif-1',
      userId: 'user-1',
      title: 'Validation PWA imminente',
      message: 'Jalon "Validation Notée Modern Mobile App" prévu la semaine prochaine.',
      type: 'MILESTONE',
      readAt: null,
      createdAt: '2026-10-26T08:00:00Z',
    },
    {
      id: 'notif-2',
      userId: 'user-1',
      title: 'Nouvelle tâche assignée',
      message: 'Vous avez été assignée à "Génération du rapport d’avancement".',
      type: 'ASSIGNMENT',
      readAt: null,
      createdAt: '2026-10-26T09:30:00Z',
    },
    {
      id: 'notif-3',
      userId: 'user-1',
      title: 'Recommandation IA',
      message: 'L’assistant IA suggère de rééquilibrer la colonne "En cours" (limite WIP atteinte).',
      type: 'AI_ALERT',
      readAt: null,
      createdAt: '2026-10-26T11:00:00Z',
    },
  ],
  files: [
    {
      id: 'file-1',
      projectId: 'proj-1',
      taskId: 'task-1',
      uploaderId: 'user-1',
      name: 'cahier-des-charges-studyflow.pdf',
      mimeType: 'application/pdf',
      size: 3027224,
      createdAt: '2026-10-20T10:00:00Z',
    },
    {
      id: 'file-2',
      projectId: 'proj-1',
      taskId: 'task-3',
      uploaderId: 'user-4',
      name: 'maquettes-mobile-studyflow.fig',
      mimeType: 'application/octet-stream',
      size: 1450000,
      createdAt: '2026-10-22T14:30:00Z',
    },
    {
      id: 'file-3',
      projectId: 'proj-1',
      taskId: 'task-2',
      uploaderId: 'user-3',
      name: 'service-worker-audit.json',
      mimeType: 'application/json',
      size: 4500,
      createdAt: '2026-10-26T16:00:00Z',
    },
  ],
  activities: [
    {
      id: 'act-1',
      projectId: 'proj-1',
      userId: 'user-2',
      type: 'TASK_COMPLETED',
      payload: { taskTitle: 'Configuration Manifest PWA & Standalone mode' },
      createdAt: '2026-10-25T16:00:00Z',
    },
    {
      id: 'act-2',
      projectId: 'proj-1',
      userId: 'user-3',
      type: 'TASK_COMPLETED',
      payload: { taskTitle: 'Mise en place du Service Worker & Cache Offline' },
      createdAt: '2026-10-26T17:30:00Z',
    },
    {
      id: 'act-3',
      projectId: 'proj-1',
      userId: 'user-1',
      type: 'TASK_CREATED',
      payload: { taskTitle: 'Module IA : Assistant de découpage intelligent de tâches' },
      createdAt: '2026-10-26T18:00:00Z',
    },
  ],
  reports: [
    {
      id: 'rep-1',
      projectId: 'proj-1',
      createdById: 'user-1',
      generatedAt: '2026-10-26T18:30:00Z',
      title: 'Bilan Mi-Projet StudyFlow PWA',
      completionRate: 25,
      totalTasks: 8,
      completedTasks: 2,
      inProgressTasks: 3,
      overdueTasks: 0,
      summary: 'Les fondations PWA et Offline sont livrées avec succès. Le développement des modules CRUD et de l’IA se poursuit selon le calendrier fixé.',
      recommendations: [
        'Veiller à la limite WIP de la colonne "En cours" (max 4 tâches simultanées).',
        'Finaliser la validation des formulaires avant la pré-soutenance.',
        'Tester l’installation PWA sur plusieurs modèles de smartphones (iOS Safari et Android Chrome).'
      ],
    },
  ],
};

// Lecture depuis LocalStorage avec fallback sur initialData
export function loadStudyFlowData(): StudyFlowData {
  if (typeof window === 'undefined') {
    return initialData;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      saveStudyFlowData(initialData);
      return initialData;
    }
    return JSON.parse(raw) as StudyFlowData;
  } catch (err) {
    console.error('Erreur lecture localStorage, utilisation des données initiales:', err);
    return initialData;
  }
}

// Écriture synchrone dans LocalStorage
export function saveStudyFlowData(data: StudyFlowData): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Erreur écriture localStorage:', err);
  }
}

// Réinitialiser les données aux valeurs de démo du cahier des charges
export function resetToDemoData(): StudyFlowData {
  saveStudyFlowData(initialData);
  return initialData;
}
