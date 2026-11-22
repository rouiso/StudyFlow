import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { enqueueEmail, processEmailQueue } from '@/lib/email-service';

function asDate(value: unknown): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function isCompleted(task: { completedAt: unknown; column?: { isDone?: boolean } | null }) {
  return Boolean(task.completedAt || task.column?.isDone);
}

function formatDate(value: unknown) {
  return asDate(value)?.toISOString().slice(0, 10) || 'date inconnue';
}

export async function POST(req: NextRequest) {
  const userId = req.cookies.get('studyflow_session')?.value;
  if (!userId) {
    return NextResponse.json({ ok: false, error: 'Authentification requise.' }, { status: 401 });
  }

  let projectId = '';
  try {
    const body = await req.json();
    projectId = typeof body.projectId === 'string' ? body.projectId : '';
  } catch {
    return NextResponse.json({ ok: false, error: 'Requête invalide.' }, { status: 400 });
  }
  if (!projectId) {
    return NextResponse.json({ ok: false, error: 'projectId requis.' }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Utilisateur introuvable.' }, { status: 401 });
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return NextResponse.json({ ok: false, error: 'Projet introuvable.' }, { status: 404 });
    }
    const membership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: project.teamId, userId } },
    });
    if (!membership) {
      return NextResponse.json({ ok: false, error: 'Accès refusé à ce projet.' }, { status: 403 });
    }

    const now = new Date();
    const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const todayStart = new Date(now);
    todayStart.setUTCHours(0, 0, 0, 0);
    const weekStart = new Date(now);
    weekStart.setUTCDate(weekStart.getUTCDate() - ((weekStart.getUTCDay() + 6) % 7));
    weekStart.setUTCHours(0, 0, 0, 0);

    const [tasks, milestones, trainings, sessions] = await Promise.all([
      prisma.task.findMany({ where: { projectId }, include: { column: true }, take: 5000 }),
      prisma.milestone.findMany({ where: { projectId }, take: 1000 }),
      prisma.training.findMany({ where: { teamId: project.teamId, status: 'PUBLISHED' }, take: 1000 }),
      prisma.coachingSession.findMany({
        where: {
          teamId: project.teamId,
          OR: [{ coachId: userId }, { coacheeId: userId }],
          status: { not: 'CANCELLED' },
        },
        take: 100,
      }),
    ]);

    const upcoming = tasks.filter((task) => {
      const due = asDate(task.dueDate);
      return due && due >= todayStart && due <= weekEnd && !isCompleted(task);
    });
    const overdue = tasks.filter((task) => {
      const due = asDate(task.dueDate);
      return due && due < todayStart && !isCompleted(task);
    });
    const upcomingMilestones = milestones.filter((item) => {
      const date = asDate(item.date);
      return date && date >= todayStart && date <= weekEnd && !item.completed;
    });
    const upcomingTrainings = trainings.filter((item) => {
      const date = asDate(item.startsAt);
      return date && date >= todayStart && date <= weekEnd;
    });
    const upcomingSessions = sessions.filter((item) => {
      const date = asDate(item.scheduledAt);
      return date && date >= todayStart && date <= weekEnd;
    });

    const details = [
      `Projet : ${project.name}`,
      'Tâches à venir :',
      ...upcoming.slice(0, 20).map((task) => `- ${task.title} (${formatDate(task.dueDate)})`),
      'Tâches en retard :',
      ...overdue.slice(0, 20).map((task) => `- ${task.title} (${formatDate(task.dueDate)})`),
      'Événements et jalons du calendrier :',
      ...upcomingMilestones.slice(0, 20).map((item) => `- ${item.title} (${formatDate(item.date)})`),
      'Formations :',
      ...upcomingTrainings.slice(0, 20).map((item) => `- ${item.title} (${formatDate(item.startsAt)})`),
      'Coachings :',
      ...upcomingSessions.slice(0, 20).map((item) => `- ${item.topic} (${formatDate(item.scheduledAt)})`),
    ].join('\n');

    const email = await enqueueEmail(
      user.email,
      'weekly-summary',
      {
        upcomingCount: upcoming.length,
        overdueCount: overdue.length,
        milestoneCount: upcomingMilestones.length,
        message: details,
      },
      `weekly-manual:${user.id}:${project.id}:${weekStart.toISOString().slice(0, 10)}`
    );
    const alreadySent = email.status === 'SENT';
    if (email.status === 'PENDING') {
      await processEmailQueue(1, email.id);
    }
    const delivery = await prisma.emailQueue.findUnique({ where: { id: email.id } });
    if (!delivery) throw new Error('Résumé introuvable dans la file d’envoi.');
    if (delivery.status === 'FAILED') {
      return NextResponse.json(
        { ok: false, error: 'L’envoi du résumé a échoué. Vérifiez la configuration SMTP.' },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: {
        status: delivery.status === 'SENT' ? 'sent' : delivery.lastError ? 'retrying' : 'queued',
        alreadySent,
        error: delivery.lastError || undefined,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur lors de l’envoi du résumé.';
    console.error('[Weekly summary] Send failed:', message);
    return NextResponse.json(
      { ok: false, error: 'Impossible d’envoyer le résumé hebdomadaire.' },
      { status: 500 }
    );
  }
}
