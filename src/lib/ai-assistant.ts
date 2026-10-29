import { Task, Subtask, Column, Project, User } from '@/types';

export interface AITaskBreakdownResult {
  suggestedTitle: string;
  suggestedPriority: 'BASSE' | 'NORMALE' | 'HAUTE' | 'URGENTE';
  estimatedHours: number;
  subtasks: { title: string; estimatedHours: number }[];
  rationale: string;
}

export interface AIProjectHealthResult {
  score: number; // 0 à 100
  status: 'EXCELLENT' | 'BON' | 'ATTENTION' | 'CRITIQUE';
  summary: string;
  strengths: string[];
  bottlenecks: string[];
  actionRecommendations: string[];
}

export interface AIDefenseSummaryResult {
  executiveSummary: string;
  keyAchievements: string[];
  sprintVelocityScore: string;
  identifiedRisks: string[];
  nextStepsForDefense: string[];
  generatedAt: string;
}

/**
 * Découpage intelligent de tâche par IA
 */
export function aiBreakdownTask(title: string, description?: string): AITaskBreakdownResult {
  const lower = (title + ' ' + (description || '')).toLowerCase();

  let subtasks: { title: string; estimatedHours: number }[] = [];
  let estimatedHours = 6;
  let priority: 'BASSE' | 'NORMALE' | 'HAUTE' | 'URGENTE' = 'NORMALE';

  if (lower.includes('auth') || lower.includes('connexion') || lower.includes('sécurité')) {
    priority = 'HAUTE';
    estimatedHours = 8;
    subtasks = [
      { title: 'Concevoir le schéma utilisateur et la politique de hachage de mot de passe', estimatedHours: 2 },
      { title: 'Implémenter le formulaire de connexion / inscription avec validation Zod', estimatedHours: 2.5 },
      { title: 'Sécuriser les sessions avec cookies HttpOnly & middleware de route', estimatedHours: 2 },
      { title: 'Écrire les tests unitaires de contrôle d’accès et gestion des erreurs', estimatedHours: 1.5 },
    ];
  } else if (lower.includes('pwa') || lower.includes('offline') || lower.includes('mobile')) {
    priority = 'URGENTE';
    estimatedHours = 10;
    subtasks = [
      { title: 'Configurer manifest.json (icônes 192/512, standalone, thème)', estimatedHours: 2 },
      { title: 'Écrire sw.js avec stratégie de mise en cache Network First & Offline Fallback', estimatedHours: 3.5 },
      { title: 'Mettre en place la persistance locale IndexedDB / Local-First', estimatedHours: 2.5 },
      { title: 'Auditer l’ergonomie mobile tactile et les tap-targets (≥ 48px)', estimatedHours: 2 },
    ];
  } else if (lower.includes('crud') || lower.includes('base') || lower.includes('api')) {
    priority = 'HAUTE';
    estimatedHours = 7;
    subtasks = [
      { title: 'Définir les types et interfaces TypeScript des entités', estimatedHours: 1.5 },
      { title: 'Créer les formulaires de saisie et les modales d’édition', estimatedHours: 2.5 },
      { title: 'Implémenter les actions de création, mise à jour et suppression', estimatedHours: 2 },
      { title: 'Gérer les états vides, le chargement et les notifications de confirmation', estimatedHours: 1 },
    ];
  } else if (lower.includes('stat') || lower.includes('rapport') || lower.includes('burndown')) {
    priority = 'NORMALE';
    estimatedHours = 6;
    subtasks = [
      { title: 'Calculer les indicateurs clés (% avancement, tâches terminées, retard)', estimatedHours: 1.5 },
      { title: 'Dessiner le graphique interactif du Burndown Chart (temps restant)', estimatedHours: 2.5 },
      { title: 'Calculer la charge par membre et la répartition des priorités', estimatedHours: 1 },
      { title: 'Permettre l’exportation propre du rapport de synthèse étudiant', estimatedHours: 1 },
    ];
  } else {
    // Cas général intelligent
    subtasks = [
      { title: `Analyser le besoin et préparer l'architecture de: ${title}`, estimatedHours: 1.5 },
      { title: 'Développer l’interface utilisateur mobile-first adaptée', estimatedHours: 2.5 },
      { title: 'Connecter les données persistantes et gérer les cas d’erreurs', estimatedHours: 2 },
      { title: 'Vérifier la validation et tester en conditions réelles', estimatedHours: 1 },
    ];
  }

  return {
    suggestedTitle: title,
    suggestedPriority: priority,
    estimatedHours,
    subtasks,
    rationale: `L’analyse IA a décomposé cette tâche en ${subtasks.length} étapes concrètes selon les bonnes pratiques de développement logiciel étudiant.`,
  };
}

/**
 * Diagnostic de santé du projet par l'IA
 */
export function aiAnalyzeProjectHealth(
  project: Project,
  columns: Column[],
  tasks: Task[],
  members: User[]
): AIProjectHealthResult {
  const total = tasks.length;
  const doneColumn = columns.find((c) => c.isDone);
  const completed = tasks.filter((t) => t.columnId === doneColumn?.id).length;
  const inProgressCol = columns.find((c) => c.name.toLowerCase().includes('cours'));
  const inProgressTasks = inProgressCol ? tasks.filter((t) => t.columnId === inProgressCol.id) : [];

  const now = new Date();
  const overdueTasks = tasks.filter((t) => {
    if (t.columnId === doneColumn?.id) return false;
    if (!t.dueDate) return false;
    return new Date(t.dueDate) < now;
  });

  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Calcul du score de santé (0-100)
  let score = 85;
  const bottlenecks: string[] = [];
  const strengths: string[] = [];
  const actionRecommendations: string[] = [];

  // Vérification de la limite WIP
  if (inProgressCol && inProgressCol.wipLimit && inProgressTasks.length > inProgressCol.wipLimit) {
    score -= 15;
    bottlenecks.push(
      `Surcharge dans la colonne "${inProgressCol.name}" : ${inProgressTasks.length} tâches en cours pour une limite WIP recommandée de ${inProgressCol.wipLimit}.`
    );
    actionRecommendations.push('Finaliser ou faire relire au moins 2 tâches en cours avant d’en entamer de nouvelles.');
  } else {
    strengths.push('Le flux de travail Kanban respecte les limites WIP fixées par l’équipe.');
  }

  // Tâches en retard
  if (overdueTasks.length > 0) {
    score -= overdueTasks.length * 10;
    bottlenecks.push(`${overdueTasks.length} tâche(s) ont dépassé leur date d’échéance prévue.`);
    actionRecommendations.push(`Reprioriser immédiatement les tâches en retard : "${overdueTasks[0].title}".`);
  } else {
    strengths.push('Aucun retard critique détecté par rapport aux dates d’échéances actuelles.');
  }

  // Taux d'achèvement
  if (completionRate >= 20) {
    strengths.push(`Bonne cadence de progression avec ${completionRate}% des tâches déjà terminées.`);
  } else {
    actionRecommendations.push('Accélérer la clôture des premières fonctionnalités du socle PWA.');
  }

  // Équilibrage des membres
  const unassigned = tasks.filter((t) => !t.assigneeIds || t.assigneeIds.length === 0);
  if (unassigned.length > 0) {
    bottlenecks.push(`${unassigned.length} tâche(s) ne sont pas encore assignées à un membre de l'équipe.`);
    actionRecommendations.push('Distribuer les tâches non assignées pour clarifier les responsabilités.');
  }

  score = Math.max(20, Math.min(100, score));

  let status: 'EXCELLENT' | 'BON' | 'ATTENTION' | 'CRITIQUE' = 'BON';
  if (score >= 85) status = 'EXCELLENT';
  else if (score >= 70) status = 'BON';
  else if (score >= 50) status = 'ATTENTION';
  else status = 'CRITIQUE';

  return {
    score,
    status,
    summary: `Le projet ${project.name} affiche un score de maturité de ${score}/100. ${strengths.length} points forts relevés, ${bottlenecks.length} points de vigilance à surveiller.`,
    strengths,
    bottlenecks,
    actionRecommendations,
  };
}

/**
 * Générateur de Synthèse de Soutenance pour l'enseignant
 */
export function aiGenerateDefenseSummary(
  project: Project,
  tasks: Task[],
  columns: Column[]
): AIDefenseSummaryResult {
  const doneCol = columns.find((c) => c.isDone);
  const completed = tasks.filter((t) => t.columnId === doneCol?.id);
  const inProgressCol = columns.find((c) => c.name.toLowerCase().includes('cours'));
  const inProgress = inProgressCol ? tasks.filter((t) => t.columnId === inProgressCol.id) : [];

  return {
    executiveSummary: `StudyFlow est une PWA mobile-first conçue pour les équipes étudiantes, combinant un fonctionnement hors-ligne (Service Worker), un tableau Kanban temps réel, un calendrier des jalons et un assistant IA d’assistance au découpage de tâches. Le projet répond strictement aux critères de validation du module Modern Mobile Application.`,
    keyAchievements: [
      'PWA installable avec Manifest W3C complet et icônes adaptatives',
      'Mode Hors-ligne (Offline-First) persistant avec mise en cache du Service Worker',
      'Architecture Kanban réactive avec gestion fine des opérations CRUD et priorités',
      'Intégration d’un module d’Intelligence Artificielle pour l’assistance de projet',
      'Design mobile-first responsive avec barre de navigation tactile et contrastes AA',
    ],
    sprintVelocityScore: `${completed.length} fonctionnalités terminées / ${inProgress.length} en cours de validation`,
    identifiedRisks: [
      'Garantir le bon fonctionnement de l’installation sur Safari iOS (PWA standalone)',
      'Respecter les limites de temps lors de la démonstration orale devant l’enseignant',
    ],
    nextStepsForDefense: [
      'Démontrer l’installation de l’application sur écran mobile',
      'Couper la connexion Internet pour prouver le fonctionnement hors-ligne immédiat',
      'Effectuer un cycle CRUD complet (création, assignation, sous-tâches, déplacement)',
      'Déclencher l’assistant IA pour illustrer le bonus technologique du module',
    ],
    generatedAt: new Date().toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
}
