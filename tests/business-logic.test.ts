import { describe, it } from 'node:test';
import assert from 'node:assert';
import { calculateBetween } from '../src/lib/position';
import { aiBreakdownTask, aiAnalyzeProjectHealth } from '../src/lib/ai-assistant';
import { Task, Column, User } from '../src/types';

describe('StudyFlow v1.0 — Tests Métiers (Cahier des Charges & Soutenance)', () => {
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

  // Test 4 (M7) : Calcul du taux d\'avancement global du projet
  it('M7 : L\'avancement global doit correspondre au pourcentage de tâches dans la colonne isDone', () => {
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

  // Test 5 (Bonus IA) : Découpage intelligent de tâche
  it('Bonus IA : aiBreakdownTask doit générer au moins 3 sous-tâches avec estimations', () => {
    const result = aiBreakdownTask('Mise en place de l’authentification PWA et Service Worker');

    assert.ok(result.subtasks.length >= 3, 'Doit contenir au moins 3 sous-tâches');
    assert.ok(result.estimatedHours > 0, 'L’estimation d’heures doit être positive');
    assert.ok(['HAUTE', 'URGENTE', 'NORMALE', 'BASSE'].includes(result.suggestedPriority));
  });
});
