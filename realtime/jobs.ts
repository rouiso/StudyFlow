import { prisma } from '../src/lib/prisma';

/**
 * Tâche planifiée : Envoi des rappels d'échéances 24h et 1h avant (M4)
 */
export async function sendDueRemindersJob() {
  const now = new Date();
  const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const dueSoonTasks = await prisma.task.findMany({
    where: {
      completedAt: null,
      dueDate: {
        gte: now,
        lte: next24h,
      },
    },
    include: {
      assignees: true,
    },
  });

  console.log(`[Jobs] ${dueSoonTasks.length} tâche(s) avec échéance proche identifiée(s).`);
}

/**
 * Tâche planifiée : Instantané quotidien de l'état du projet pour le Burndown (M7)
 */
export async function createDailyProjectSnapshotsJob() {
  const projects = await prisma.project.findMany({
    include: {
      tasks: true,
      columns: true,
    },
  });

  for (const p of projects) {
    const doneCol = p.columns.find((c) => c.isDone);
    const completed = p.tasks.filter((t) => t.columnId === doneCol?.id).length;
    const now = new Date();
    const overdue = p.tasks.filter((t) => t.dueDate && t.dueDate < now && t.columnId !== doneCol?.id).length;

    await prisma.projectSnapshot.create({
      data: {
        projectId: p.id,
        date: new Date(),
        total: p.tasks.length,
        done: completed,
        overdue,
      },
    });
  }

  console.log('[Jobs] Instantanés quotidiens enregistrés pour les projets.');
}
