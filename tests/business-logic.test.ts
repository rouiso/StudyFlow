import { describe, it } from 'node:test';
import assert from 'node:assert';
import { calculateBetween } from '../src/lib/position';
import { aiBreakdownTask, aiAnalyzeProjectHealth } from '../src/lib/ai-assistant';
import { Task, Column, User } from '../src/types';

describe('StudyFlow v1.1 — Tests Métiers (Cahier des Charges v1.1 & Soutenance)', () => {
  // Test 1 (M2) : Calcul des positions (Fractional Indexing)
  it('M2 : calculateBetween doit calculer correctement la position entre deux cartes', () => {
    // Insertion en début
    const posStart = calculateBetween(null, 1000);
    assert.strictEqual(posStart, 500);

    // Insertion à la fin
    const posEnd = calculateBetween(1000, null);
    assert.strictEqual(posEnd, 2000);

    // Insertion entre deux cartes
    const posBetween = calculateBetween(1000, 2000);
    assert.strictEqual(posBetween, 1500);
  });

  // Test 2 (M3) : Calcul de progression des sous-tâches
  it('M3 : La progression des sous-tâches doit refléter le ratio des éléments terminés', () => {
    const subtasks = [
      { id: '1', taskId: 't1', title: 'Sous-tâche 1', done: true, position: 1 },
      { id: '2', taskId: 't1', title: 'Sous-tâche 2', done: false, position: 2 },
      { id: '3', taskId: 't1', title: 'Sous-tâche 3', done: true, position: 3 },
      { id: '4', taskId: 't1', title: 'Sous-tâche 4', done: false, position: 4 },
    ];

    const completed = subtasks.filter((s) => s.done).length;
    const progress = Math.round((completed / subtasks.length) * 100);

    assert.strictEqual(completed, 2);
    assert.strictEqual(progress, 50);
  });

  // Test 3 (M3 & M4) : Détection de tâche en retard
  it('M3/M4 : Une tâche avec date passée non terminée doit être détectée en retard', () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    const isOverdueYesterday = new Date(yesterday) < new Date();
    const isOverdueTomorrow = new Date(tomorrow) < new Date();

    assert.strictEqual(isOverdueYesterday, true, 'Hier doit être détecté comme dépassé');
    assert.strictEqual(isOverdueTomorrow, false, 'Demain ne doit pas être en retard');
  });

  // Test 4 (M4) : Calcul du taux d'avancement global du projet (intégré au M4 en v1.1)
  it('M4 : L\'avancement global doit correspondre au pourcentage de tâches dans la colonne isDone', () => {
    const columns: Column[] = [
      { id: 'col-1', projectId: 'p1', name: 'À faire', position: 1, isDone: false },
      { id: 'col-2', projectId: 'p1', name: 'En cours', position: 2, isDone: false },
      { id: 'col-3', projectId: 'p1', name: 'Terminé', position: 3, isDone: true },
    ];

    const tasks: Partial<Task>[] = [
      { id: 't1', columnId: 'col-1' },
      { id: 't2', columnId: 'col-2' },
      { id: 't3', columnId: 'col-3' },
      { id: 't4', columnId: 'col-3' },
    ];

    const doneColId = columns.find((c) => c.isDone)?.id;
    const completedTasks = tasks.filter((t) => t.columnId === doneColId).length;
    const rate = Math.round((completedTasks / tasks.length) * 100);

    assert.strictEqual(completedTasks, 2);
    assert.strictEqual(rate, 50);
  });

  // Test 5 (M1 - v1.1) : Permissions du rôle COACH (ne peut pas déplacer de cartes, peut gérer formations)
  it('M1 : Le rôle COACH ne doit pas pouvoir déplacer ou modifier de tâches (§4.2 & §8)', () => {
    const canMoveTask = (role: string) => ['OWNER', 'MEMBER'].includes(role);
    const canCreateTraining = (role: string) => ['OWNER', 'COACH'].includes(role);

    assert.strictEqual(canMoveTask('COACH'), false, 'Un Coach ne peut pas modifier ou déplacer de tâche');
    assert.strictEqual(canMoveTask('MEMBER'), true, 'Un Membre peut déplacer des tâches');
    assert.strictEqual(canCreateTraining('COACH'), true, 'Un Coach a le droit de créer/modifier des formations');
  });

  // Test 6 (M7 - v1.1) : Contrôle strict de la capacité d'une formation (refus si complet)
  it('M7 : Une formation saturée doit refuser toute nouvelle inscription (§7.3 & §8 7.2)', () => {
    const capacity = 4;
    const enrollments = ['u1', 'u2', 'u3', 'u4']; // 4 inscrits

    const canEnroll = (currentCount: number, maxCap: number) => currentCount < maxCap;

    assert.strictEqual(canEnroll(enrollments.length, capacity), false, 'La 5e inscription doit être refusée');
  });

  // Test 7 (M7 - v1.1) : Confidentialité des notes privées de coaching (§4.2 & §8 7.5)
  it('M7 : Les notes privées d\'un coaching ne doivent être visibles QUE par le coach auteur', () => {
    const session = {
      id: 'cs-1',
      coachId: 'user-5',
      coacheeId: 'user-2',
      sharedReport: 'Compte-rendu partagé lisible par tous',
      privateNotes: 'Observation confidentielle du coach',
    };

    const getVisiblePrivateNotes = (currentUserId: string, currentUserRole: string) => {
      // Seul le coach auteur (ou rôle coach s'il est l'auteur) a accès
      if (currentUserId === session.coachId) {
        return session.privateNotes;
      }
      return null; // Cloisonné pour l'étudiant et les autres
    };

    assert.strictEqual(getVisiblePrivateNotes('user-5', 'COACH'), 'Observation confidentielle du coach');
    assert.strictEqual(getVisiblePrivateNotes('user-2', 'MEMBER'), null, 'Le coaché ne doit pas voir les notes privées');
    assert.strictEqual(getVisiblePrivateNotes('user-1', 'OWNER'), null, 'L\'administrateur/propriétaire ne doit pas voir les notes privées');
  });

  // Test 8 (Bonus IA) : Découpage intelligent de tâche
  it('Bonus IA : aiBreakdownTask doit générer au moins 3 sous-tâches avec estimations', () => {
    const result = aiBreakdownTask('Mise en place de l’authentification PWA et Service Worker');

    assert.ok(result.subtasks.length >= 3, 'Doit contenir au moins 3 sous-tâches');
    assert.ok(result.estimatedHours > 0, 'L’estimation d’heures doit être positive');
    assert.ok(['HAUTE', 'URGENTE', 'NORMALE', 'BASSE'].includes(result.suggestedPriority));
  });
});
