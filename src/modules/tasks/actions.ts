'use server';

import { prisma } from '@/lib/prisma';
import { assertPermission } from '@/lib/permissions';
import { calculateBetween } from '@/lib/position';

export type ActionResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

/**
 * Server Action : Créer une tâche (M3)
 */
export async function createTaskAction(params: {
  projectId: string;
  columnId: string;
  title: string;
  description?: string;
  priority?: string;
  dueDate?: string;
  assigneeIds?: string[];
}): Promise<ActionResponse<any>> {
  try {
    await assertPermission('task.create', { projectId: params.projectId });

    const user = await prisma.user.findFirst();
    const createdById = user ? user.id : 'user-1';

    const task = await prisma.task.create({
      data: {
        projectId: params.projectId,
        columnId: params.columnId,
        title: params.title,
        description: params.description || null,
        position: 1000.0,
        priority: params.priority || 'NORMALE',
        dueDate: params.dueDate ? new Date(params.dueDate) : null,
        createdById,
        assignees: params.assigneeIds && params.assigneeIds.length > 0 ? {
          create: params.assigneeIds.map((userId) => ({ userId })),
        } : undefined,
      },
      include: {
        subtasks: true,
        assignees: { include: { user: true } },
      },
    });

    // Journal d'activité (M7)
    await prisma.activity.create({
      data: {
        projectId: params.projectId,
        taskId: task.id,
        userId: createdById,
        type: 'TASK_CREATED',
        payload: JSON.stringify({ taskTitle: task.title }),
      },
    });

    return { ok: true, data: task };
  } catch (err: any) {
    return { ok: false, error: { code: 'TASK_CREATE_FAILED', message: err.message } };
  }
}

/**
 * Server Action : Déplacer une tâche entre colonnes avec mise à jour optimiste (M2 & M3)
 */
export async function moveTaskAction(params: {
  taskId: string;
  targetColumnId: string;
  beforePosition?: number;
  afterPosition?: number;
}): Promise<ActionResponse<any>> {
  try {
    const targetColumn = await prisma.column.findUnique({
      where: { id: params.targetColumnId },
    });

    if (!targetColumn) {
      return { ok: false, error: { code: 'COLUMN_NOT_FOUND', message: 'Colonne introuvable' } };
    }

    const newPosition = calculateBetween(params.beforePosition, params.afterPosition);

    const updatedTask = await prisma.task.update({
      where: { id: params.taskId },
      data: {
        columnId: params.targetColumnId,
        position: newPosition,
        completedAt: targetColumn.isDone ? new Date() : null,
      },
    });

    return { ok: true, data: updatedTask };
  } catch (err: any) {
    return { ok: false, error: { code: 'TASK_MOVE_FAILED', message: err.message } };
  }
}

/**
 * Server Action : Supprimer une tâche (M3)
 */
export async function deleteTaskAction(taskId: string): Promise<ActionResponse<any>> {
  try {
    await prisma.task.delete({ where: { id: taskId } });
    return { ok: true, data: { id: taskId } };
  } catch (err: any) {
    return { ok: false, error: { code: 'TASK_DELETE_FAILED', message: err.message } };
  }
}
