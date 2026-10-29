import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Récupérer les tâches avec échéances et les jalons
    const tasks = await prisma.task.findMany({
      where: { dueDate: { not: null } },
      include: { project: true },
    });

    const milestones = await prisma.milestone.findMany({
      include: { project: true },
    });

    // Génération du format standard iCalendar (.ics)
    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//StudyFlow//FR',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:StudyFlow Échéances',
    ];

    for (const task of tasks) {
      if (!task.dueDate) continue;
      const dateStr = task.dueDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      icsContent.push(
        'BEGIN:VEVENT',
        `UID:task-${task.id}@studyflow.local`,
        `DTSTAMP:${dateStr}`,
        `DTSTART;VALUE=DATE:${dateStr.substring(0, 8)}`,
        `SUMMARY:Échéance : ${task.title.replace(/[\n\r]/g, ' ')}`,
        `DESCRIPTION:${(task.description || '').replace(/[\n\r]/g, ' ')}`,
        `STATUS:${task.completedAt ? 'COMPLETED' : 'CONFIRMED'}`,
        'END:VEVENT'
      );
    }

    for (const m of milestones) {
      const dateStr = m.date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      icsContent.push(
        'BEGIN:VEVENT',
        `UID:milestone-${m.id}@studyflow.local`,
        `DTSTAMP:${dateStr}`,
        `DTSTART;VALUE=DATE:${dateStr.substring(0, 8)}`,
        `SUMMARY:JALON : ${m.title.replace(/[\n\r]/g, ' ')}`,
        `DESCRIPTION:${(m.description || '').replace(/[\n\r]/g, ' ')}`,
        'END:VEVENT'
      );
    }

    icsContent.push('END:VCALENDAR');

    const body = icsContent.join('\r\n');

    return new NextResponse(body, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="studyflow-calendar.ics"',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
