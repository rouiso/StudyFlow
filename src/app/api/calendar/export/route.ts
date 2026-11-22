import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function toIcsDate(value: unknown): string | null {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value.replace(/-/g, '');
  }
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10).replace(/-/g, '');
}

function toIcsDateTime(value: unknown): string | null {
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function escapeIcsText(value: unknown): string {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

export async function GET(req: NextRequest) {
  const userId = req.cookies.get('studyflow_session')?.value;
  if (!userId) return NextResponse.json({ ok: false, error: 'Authentification requise.' }, { status: 401 });

  const projectId = req.nextUrl.searchParams.get('projectId');
  if (!projectId) return NextResponse.json({ ok: false, error: 'projectId requis.' }, { status: 400 });

  try {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return NextResponse.json({ ok: false, error: 'Projet introuvable.' }, { status: 404 });
    const membership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: project.teamId, userId } },
    });
    if (!membership) return NextResponse.json({ ok: false, error: 'Accès refusé à ce projet.' }, { status: 403 });

    const [tasks, milestones, trainings, coachingSessions] = await Promise.all([
      prisma.task.findMany({
        where: { projectId, dueDate: { not: null } },
        include: { column: true },
      }),
      prisma.milestone.findMany({ where: { projectId } }),
      prisma.training.findMany({ where: { teamId: project.teamId, status: 'PUBLISHED' } }),
      prisma.coachingSession.findMany({
        where: {
          teamId: project.teamId,
          OR: [{ coachId: userId }, { coacheeId: userId }],
          status: { not: 'CANCELLED' },
          scheduledAt: { not: null },
        },
      }),
    ]);

    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//StudyFlow//FR',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${escapeIcsText(project.name)}`,
    ];

    for (const task of tasks) {
      const date = toIcsDate(task.dueDate);
      if (!date) continue;
      lines.push(
        'BEGIN:VEVENT',
        `UID:task-${escapeIcsText(task.id)}@studyflow.local`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${date}`,
        `SUMMARY:${escapeIcsText(`Échéance : ${task.title}`)}`,
        `DESCRIPTION:${escapeIcsText(task.description)}`,
        `STATUS:${task.completedAt || task.column?.isDone ? 'COMPLETED' : 'CONFIRMED'}`,
        'END:VEVENT'
      );
    }

    for (const milestone of milestones) {
      const date = toIcsDate(milestone.date);
      if (!date) continue;
      lines.push(
        'BEGIN:VEVENT',
        `UID:milestone-${escapeIcsText(milestone.id)}@studyflow.local`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${date}`,
        `SUMMARY:${escapeIcsText(`Jalon : ${milestone.title}`)}`,
        `DESCRIPTION:${escapeIcsText(milestone.description)}`,
        `STATUS:${milestone.completed ? 'COMPLETED' : 'CONFIRMED'}`,
        'END:VEVENT'
      );
    }

    for (const training of trainings) {
      const start = toIcsDateTime(training.startsAt);
      if (!start) continue;
      const end = toIcsDateTime(training.endsAt);
      lines.push(
        'BEGIN:VEVENT',
        `UID:training-${escapeIcsText(training.id)}@studyflow.local`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${start}`,
        ...(end ? [`DTEND:${end}`] : []),
        `SUMMARY:${escapeIcsText(`Formation : ${training.title}`)}`,
        `DESCRIPTION:${escapeIcsText(training.description)}`,
        'END:VEVENT'
      );
    }

    for (const session of coachingSessions) {
      const start = toIcsDateTime(session.scheduledAt);
      if (!start) continue;
      const endDate = new Date(String(session.scheduledAt));
      endDate.setUTCMinutes(endDate.getUTCMinutes() + Number(session.durationMin || 0));
      const end = toIcsDateTime(endDate);
      lines.push(
        'BEGIN:VEVENT',
        `UID:coaching-${escapeIcsText(session.id)}@studyflow.local`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${start}`,
        ...(end ? [`DTEND:${end}`] : []),
        `SUMMARY:${escapeIcsText(`Coaching : ${session.topic}`)}`,
        `DESCRIPTION:${escapeIcsText([session.location, session.meetingUrl].filter(Boolean).join(' — '))}`,
        'END:VEVENT'
      );
    }

    lines.push('END:VCALENDAR');
    return new NextResponse(lines.join('\r\n'), {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="studyflow-calendar.ics"',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur lors de l’export calendrier.';
    console.error('[Calendar export] Failed:', message);
    return NextResponse.json({ ok: false, error: 'Impossible d’exporter le calendrier.' }, { status: 500 });
  }
}
