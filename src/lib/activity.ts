import { prisma } from './prisma';

export interface LogActivityParams {
  projectId: string;
  userId: string;
  type: string;
  taskId?: string | null;
  payload?: Record<string, any>;
}

/**
 * Journal d'activité centralisé (Module 4 - Cahier des charges v1.1)
 * Alimente le fil d'activité, les statistiques et les notifications.
 */
export async function logActivity(params: LogActivityParams) {
  try {
    const activity = await prisma.activity.create({
      data: {
        projectId: params.projectId,
        userId: params.userId,
        taskId: params.taskId || null,
        type: params.type,
        payload: JSON.stringify(params.payload || {}),
      },
    });
    return activity;
  } catch (error) {
    console.warn('[Activity] Failed to persist activity to DB:', error);
    return null;
  }
}

