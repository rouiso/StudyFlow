import { Column, Task } from '@/types';

/**
 * Réorganise les colonnes d'un projet en déplaçant `sourceColId` à la position de `targetColId`
 * et recalcule les positions (1000, 2000, 3000...).
 */
export function reorderProjectColumns(
  allColumns: Column[],
  projectId: string,
  sourceColId: string,
  targetColId: string
): Column[] {
  if (sourceColId === targetColId) return allColumns;

  const projectCols = allColumns
    .filter((c) => c.projectId === projectId)
    .sort((a, b) => a.position - b.position);

  const sourceIdx = projectCols.findIndex((c) => c.id === sourceColId);
  const targetIdx = projectCols.findIndex((c) => c.id === targetColId);

  if (sourceIdx === -1 || targetIdx === -1) return allColumns;

  const reordered = [...projectCols];
  const [moved] = reordered.splice(sourceIdx, 1);
  reordered.splice(targetIdx, 0, moved);

  const positionMap = new Map<string, number>();
  reordered.forEach((col, idx) => {
    positionMap.set(col.id, (idx + 1) * 1000);
  });

  return allColumns.map((col) => {
    const nextPos = positionMap.get(col.id);
    return nextPos !== undefined ? { ...col, position: nextPos } : col;
  });
}

/**
 * Déplace une colonne d'un cran vers la gauche (-1) ou vers la droite (+1).
 */
export function moveColumnByDirection(
  allColumns: Column[],
  projectId: string,
  columnId: string,
  direction: 'left' | 'right'
): Column[] {
  const projectCols = allColumns
    .filter((c) => c.projectId === projectId)
    .sort((a, b) => a.position - b.position);

  const idx = projectCols.findIndex((c) => c.id === columnId);
  if (idx === -1) return allColumns;

  const targetIdx = direction === 'left' ? idx - 1 : idx + 1;
  if (targetIdx < 0 || targetIdx >= projectCols.length) return allColumns;

  return reorderProjectColumns(allColumns, projectId, columnId, projectCols[targetIdx].id);
}

/**
 * Supprime une colonne d'un projet.
 * - Refuse la suppression s'il ne reste qu'une seule colonne dans le projet.
 * - Si la colonne supprimée contient des tâches, les transfère automatiquement vers
 *   la première colonne disponible du projet afin d'éviter toute perte de données.
 * - Si la colonne supprimée était marquée `isDone: true`, transfère le statut `isDone`
 *   à la dernière colonne restante si aucune autre colonne n'est `isDone`.
 */
export function deleteProjectColumn(
  allColumns: Column[],
  allTasks: Task[],
  projectId: string,
  columnId: string
): {
  ok: boolean;
  error?: string;
  columns: Column[];
  tasks: Task[];
  fallbackColumnName?: string;
  migratedTaskCount?: number;
} {
  const projectCols = allColumns
    .filter((c) => c.projectId === projectId)
    .sort((a, b) => a.position - b.position);

  if (projectCols.length <= 1) {
    return {
      ok: false,
      error: 'Impossible de supprimer la dernière colonne du tableau Kanban.',
      columns: allColumns,
      tasks: allTasks,
    };
  }

  const targetCol = projectCols.find((c) => c.id === columnId);
  if (!targetCol) {
    return {
      ok: false,
      error: 'Colonne introuvable.',
      columns: allColumns,
      tasks: allTasks,
    };
  }

  const remainingProjectCols = projectCols
    .filter((c) => c.id !== columnId)
    .map((c, idx) => ({
      ...c,
      position: (idx + 1) * 1000,
    }));

  // Garantir qu'au moins une colonne reste marquée isDone si la colonne supprimée l'était
  if (targetCol.isDone && !remainingProjectCols.some((c) => c.isDone)) {
    remainingProjectCols[remainingProjectCols.length - 1] = {
      ...remainingProjectCols[remainingProjectCols.length - 1],
      isDone: true,
    };
  }

  const fallbackCol = remainingProjectCols[0];
  let migratedTaskCount = 0;

  const updatedTasks = allTasks.map((t) => {
    if (t.columnId === columnId) {
      migratedTaskCount++;
      return {
        ...t,
        columnId: fallbackCol.id,
        completedAt: fallbackCol.isDone ? t.completedAt || new Date().toISOString() : null,
      };
    }
    return t;
  });

  const updatedColumns = allColumns
    .filter((c) => c.id !== columnId)
    .map((c) => {
      const updatedProjCol = remainingProjectCols.find((rc) => rc.id === c.id);
      return updatedProjCol || c;
    });

  return {
    ok: true,
    columns: updatedColumns,
    tasks: updatedTasks,
    fallbackColumnName: fallbackCol.name,
    migratedTaskCount,
  };
}

