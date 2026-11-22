import { loadEnvConfig } from '@next/env';
import {
  DEMO_USERS,
  FUTURE_DEMO_MILESTONES,
  FUTURE_DEMO_TASKS,
} from '../src/lib/demo-data';

async function main() {
  loadEnvConfig(process.cwd());
  const { prisma, $disconnect } = await import('../src/lib/prisma');

  try {
    const userUpdates: Array<{ demoId: string; id: string; name: string; email: string }> = [];
    const userCreates: Array<{ id: string; name: string; email: string }> = [];
    const userIdByDemoId = new Map<string, string>();
    for (const demoUser of DEMO_USERS) {
      const previousUser = await prisma.user.findUnique({
        where: { email: demoUser.previousEmail.toLowerCase() },
      });
      const currentUser = await prisma.user.findUnique({
        where: { email: demoUser.email.toLowerCase() },
      });
      const userById = await prisma.user.findUnique({ where: { id: demoUser.id } });
      const candidates = [previousUser, currentUser, userById].filter(Boolean);
      if (new Set(candidates.map((user) => user.id)).size > 1) {
        throw new Error(`Conflicting demo account records found for ${demoUser.id}.`);
      }
      const user = candidates[0];
      if (user) {
        userUpdates.push({
          demoId: demoUser.id,
          id: user.id,
          name: demoUser.name,
          email: demoUser.email,
        });
        userIdByDemoId.set(demoUser.id, user.id);
      } else {
        userCreates.push({ id: demoUser.id, name: demoUser.name, email: demoUser.email });
        userIdByDemoId.set(demoUser.id, demoUser.id);
      }
    }

    for (const user of userUpdates) {
      await prisma.user.update({
        where: { id: user.id },
        data: { name: user.name, email: user.email, image: '' },
      });
    }
    for (const user of userCreates) {
      await prisma.user.create({
        data: { ...user, image: '' },
      });
    }

    const project = await prisma.project.findUnique({ where: { id: 'proj-1' } })
      || await prisma.project.findFirst({ where: { name: 'StudyFlow PWA v1.0' } });
    if (!project) {
      console.warn('[demo] Project proj-1 was not found; account updates completed, task and milestone sync skipped.');
      return;
    }

    const columns = await prisma.column.findMany({ where: { projectId: project.id } });
    const columnNameBySeedId: Record<string, string> = {
      'col-1': 'À faire',
      'col-2': 'En cours',
    };
    const resolvedTasks = FUTURE_DEMO_TASKS.map((task) => {
      const column = columns.find((item: { id: string }) => item.id === task.columnId)
        || columns.find((item: { name: string }) => item.name === columnNameBySeedId[task.columnId]);
      if (!column) throw new Error(`Required column for demo task ${task.id} was not found.`);
      return { ...task, projectId: project.id, columnId: column.id };
    });

    const taskConflicts: string[] = [];
    for (const task of resolvedTasks) {
      const existing = await prisma.task.findUnique({ where: { id: task.id } });
      if (existing && existing.projectId !== project.id) taskConflicts.push(task.id);
    }
    for (const milestone of FUTURE_DEMO_MILESTONES) {
      const existing = await prisma.milestone.findUnique({ where: { id: milestone.id } });
      if (existing && existing.projectId !== project.id) taskConflicts.push(milestone.id);
    }
    if (taskConflicts.length) {
      throw new Error(`Demo task or milestone IDs already belong to another project: ${taskConflicts.join(', ')}.`);
    }

    await prisma.project.update({
      where: { id: project.id },
      data: { endDate: new Date('2026-12-31T12:00:00.000Z') },
    });

    let tasksAdded = 0;
    for (const task of resolvedTasks) {
      if (await prisma.task.findUnique({ where: { id: task.id } })) continue;
      const { assigneeIds, labelIds, dueDate, createdAt, createdById, ...taskData } = task;
      await prisma.task.create({
        data: {
          ...taskData,
          createdById: userIdByDemoId.get(createdById) || createdById,
          dueDate: new Date(`${dueDate}T12:00:00.000Z`),
          createdAt: new Date(createdAt),
          assignees: {
            create: assigneeIds.map((userId) => ({
              userId: userIdByDemoId.get(userId) || userId,
            })),
          },
          labels: { create: labelIds.map((labelId) => ({ labelId })) },
        },
      });
      tasksAdded += 1;
    }

    let milestonesAdded = 0;
    for (const milestone of FUTURE_DEMO_MILESTONES) {
      if (await prisma.milestone.findUnique({ where: { id: milestone.id } })) continue;
      await prisma.milestone.create({
        data: {
          ...milestone,
          projectId: project.id,
          date: new Date(`${milestone.date}T12:00:00.000Z`),
        },
      });
      milestonesAdded += 1;
    }

    console.log(
      `[demo] Updated ${userUpdates.length} accounts, created ${userCreates.length} accounts; added ${tasksAdded} tasks and ${milestonesAdded} milestones.`
    );
  } finally {
    await $disconnect();
  }
}

main().catch((error) => {
  console.error('[demo] Failed to synchronize demo data.', error);
  process.exitCode = 1;
});
