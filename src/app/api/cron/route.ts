import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { enqueueEmail, processEmailQueue } from '@/lib/email-service';

function asDate(value: unknown): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function isCompleted(task: any) {
  return Boolean(task.completedAt || task.column?.isDone);
}

export async function POST(req: NextRequest) {
  const configuredSecret = process.env.CRON_SECRET;
  if (!configuredSecret) {
    return NextResponse.json({ ok: false, error: 'CRON_SECRET doit être configuré.' }, { status: 503 });
  }
  if (req.headers.get('x-cron-secret') !== configuredSecret) {
    return NextResponse.json({ ok: false, error: 'Non autorisé.' }, { status: 401 });
  }

  const now = new Date();
  const soon = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const allTasks = await prisma.task.findMany({
    include: { assignees: true, project: true, column: true },
    take: 5000,
  });
  const dueSoon = allTasks.filter((task: any) => {
    const due = asDate(task.dueDate);
    return due && due > now && due <= soon && !isCompleted(task);
  });
  const overdue = allTasks.filter((task: any) => {
    const due = asDate(task.dueDate);
    return due && due < now && !isCompleted(task);
  });

  for (const task of [...dueSoon, ...overdue]) {
    const isDueSoon = dueSoon.includes(task);
    for (const assignee of task.assignees || []) {
      const user = await prisma.user.findUnique({ where: { id: assignee.userId } });
      if (!user) continue;
      const type = isDueSoon ? 'due-soon' : 'overdue';
      await enqueueEmail(
        user.email,
        isDueSoon ? 'due-soon' : 'task-overdue',
        { taskTitle: task.title, dueDate: task.dueDate, projectName: task.project?.name },
        `${type}:${task.id}:${user.id}`
      );
    }
  }

  const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const todayStart = new Date(now);
  todayStart.setUTCHours(0, 0, 0, 0);
  const weekStart = new Date(now);
  weekStart.setUTCDate(weekStart.getUTCDate() - ((weekStart.getUTCDay() + 6) % 7));
  weekStart.setUTCHours(0, 0, 0, 0);
  const users = await prisma.user.findMany();
  for (const user of users) {
    const memberships = await prisma.teamMember.findMany({ where: { userId: user.id } });
    if (!memberships.length) continue;
    const teamIds = memberships.map((membership: any) => membership.teamId);
    const projects = await prisma.project.findMany({ where: { teamId: { in: teamIds } } });
    const projectIds = projects.map((project: any) => project.id);
    const [userTasks, milestones, trainings, sessions] = await Promise.all([
      prisma.task.findMany({ where: { projectId: { in: projectIds } }, include: { column: true }, take: 5000 }),
      prisma.milestone.findMany({ where: { projectId: { in: projectIds } }, take: 1000 }),
      prisma.training.findMany({ where: { teamId: { in: teamIds } }, take: 1000 }),
      prisma.coachingSession.findMany({
        where: { OR: [{ coachId: user.id }, { coacheeId: user.id }] },
        take: 100,
      }),
    ]);

    const upcoming = userTasks.filter((task: any) => {
      const due = asDate(task.dueDate);
      return due && due >= todayStart && due <= weekEnd && !isCompleted(task);
    });
    const late = userTasks.filter((task: any) => {
      const due = asDate(task.dueDate);
      return due && due < todayStart && !isCompleted(task);
    });
    const weekMilestones = milestones.filter((item: any) => {
      const date = asDate(item.date);
      return date && date >= todayStart && date <= weekEnd && !item.completed;
    });
    const weekTrainings = trainings.filter((item: any) => {
      const date = asDate(item.startsAt);
      return date && date >= todayStart && date <= weekEnd;
    });
    const weekSessions = sessions.filter((item: any) => {
      const date = asDate(item.scheduledAt);
      return date && date >= todayStart && date <= weekEnd && item.status !== 'CANCELLED';
    });
    const details = [
      'Tâches à venir :',
      ...upcoming.slice(0, 20).map((task: any) => `- ${task.title} (${asDate(task.dueDate)?.toISOString().slice(0, 10)})`),
      'Tâches en retard :',
      ...late.slice(0, 20).map((task: any) => `- ${task.title} (${asDate(task.dueDate)?.toISOString().slice(0, 10)})`),
      'Événements et jalons du calendrier :',
      ...weekMilestones.slice(0, 20).map((item: any) => `- ${item.title} (${asDate(item.date)?.toISOString().slice(0, 10)})`),
      'Formations :',
      ...weekTrainings.slice(0, 20).map((item: any) => `- ${item.title} (${asDate(item.startsAt)?.toISOString().slice(0, 10)})`),
      'Coachings :',
      ...weekSessions.slice(0, 20).map((item: any) => `- ${item.topic} (${asDate(item.scheduledAt)?.toISOString().slice(0, 10)})`),
    ].join('\n');

    await enqueueEmail(
      user.email,
      'weekly-summary',
      {
        upcomingCount: upcoming.length,
        overdueCount: late.length,
        milestoneCount: weekMilestones.length,
        message: details,
      },
      `weekly:${user.id}:${weekStart.toISOString().slice(0, 10)}`
    );
  }

  const queue = await processEmailQueue();
  return NextResponse.json({ ok: true, data: { dueSoon: dueSoon.length, overdue: overdue.length, queue } });
}
