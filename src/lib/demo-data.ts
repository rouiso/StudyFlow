import { Milestone, Task, UserRole } from '@/types';

export interface DemoUser {
  id: string;
  previousEmail: string;
  name: string;
  email: string;
  role: UserRole;
  joinedAt: string;
}

export const DEMO_USERS: DemoUser[] = [
  {
    id: 'user-1',
    previousEmail: 'lea.martin@univ-etudiant.fr',
    name: 'Achref Arous',
    email: 'achraflarousse52@gmail.com',
    role: 'OWNER',
    joinedAt: '2026-09-01T08:00:00Z',
  },
  {
    id: 'user-2',
    previousEmail: 'karim.belkacem@univ-etudiant.fr',
    name: 'Mehdi Joudi',
    email: 'mehdijoudi01@gmail.com',
    role: 'MEMBER',
    joinedAt: '2026-09-01T08:15:00Z',
  },
  {
    id: 'user-3',
    previousEmail: 'sami.youssef@univ-etudiant.fr',
    name: 'Oumaima Rouis',
    email: 'oumaimarouis58@gmail.com',
    role: 'MEMBER',
    joinedAt: '2026-09-02T10:00:00Z',
  },
  {
    id: 'user-4',
    previousEmail: 'chloe.dubois@univ-etudiant.fr',
    name: 'Iheb Kouki',
    email: 'iehb.kouki@esprit.tn',
    role: 'MEMBER',
    joinedAt: '2026-09-03T14:30:00Z',
  },
  {
    id: 'user-5',
    previousEmail: 'helene.dupont@univ-prof.fr',
    name: 'Maysa Tebai',
    email: 'maysa.tebai@esprit.tn',
    role: 'COACH',
    joinedAt: '2026-09-05T09:00:00Z',
  },
];

export const FUTURE_DEMO_TASKS: Task[] = [
  {
    id: 'task-9',
    projectId: 'proj-1',
    columnId: 'col-1',
    title: 'Finaliser les règles d’accès et vérifier les rôles d’équipe',
    description: 'Vérifier les permissions du propriétaire, des membres et du coach sur les modules du projet.',
    position: 3,
    priority: 'HAUTE',
    dueDate: '2026-11-30',
    createdById: 'user-1',
    createdAt: '2026-11-22T09:00:00Z',
    assigneeIds: ['user-2', 'user-4'],
    labelIds: ['lbl-2'],
  },
  {
    id: 'task-10',
    projectId: 'proj-1',
    columnId: 'col-2',
    title: 'Tester la connexion avec les nouveaux comptes de démonstration',
    description: 'Valider les adresses de connexion et la conservation des rôles existants.',
    position: 4,
    priority: 'URGENTE',
    dueDate: '2026-12-05',
    createdById: 'user-1',
    createdAt: '2026-11-22T09:15:00Z',
    assigneeIds: ['user-1', 'user-3'],
    labelIds: ['lbl-2'],
  },
  {
    id: 'task-11',
    projectId: 'proj-1',
    columnId: 'col-1',
    title: 'Valider les scénarios du calendrier et des jalons',
    description: 'Vérifier la création, l’affichage et l’export des échéances du projet.',
    position: 4,
    priority: 'NORMALE',
    dueDate: '2026-12-15',
    createdById: 'user-1',
    createdAt: '2026-11-22T09:30:00Z',
    assigneeIds: ['user-3', 'user-4'],
    labelIds: ['lbl-2', 'lbl-5'],
  },
  {
    id: 'task-12',
    projectId: 'proj-1',
    columnId: 'col-2',
    title: 'Préparer la livraison finale et la documentation StudyFlow',
    description: 'Relire la documentation, vérifier les parcours principaux et préparer la version de démonstration.',
    position: 5,
    priority: 'HAUTE',
    dueDate: '2026-12-28',
    createdById: 'user-1',
    createdAt: '2026-11-22T09:45:00Z',
    assigneeIds: ['user-1', 'user-2', 'user-3', 'user-4'],
    labelIds: ['lbl-2', 'lbl-5'],
  },
];

export const FUTURE_DEMO_MILESTONES: Milestone[] = [
  {
    id: 'mile-4',
    projectId: 'proj-1',
    title: 'Revue des comptes et des droits d’équipe',
    date: '2026-12-05',
    description: 'Confirmer que les cinq comptes conservent leurs rôles et accès actuels.',
    completed: false,
  },
  {
    id: 'mile-5',
    projectId: 'proj-1',
    title: 'Gel de la version StudyFlow',
    date: '2026-12-15',
    description: 'Stabiliser les fonctionnalités et terminer la validation des parcours.',
    completed: false,
  },
  {
    id: 'mile-6',
    projectId: 'proj-1',
    title: 'Livraison finale StudyFlow 2026',
    date: '2026-12-30',
    description: 'Présenter la version finale avant la fin de l’année 2026.',
    completed: false,
  },
];
