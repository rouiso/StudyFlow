import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function isDateOnly(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export async function POST(req: NextRequest) {
  try {
    const userId = req.cookies.get('studyflow_session')?.value;
    if (!userId) return NextResponse.json({ ok: false, error: 'Authentification requise.' }, { status: 401 });

    const body = await req.json();
    const projectId = typeof body.projectId === 'string' ? body.projectId : '';
    const events = Array.isArray(body.events) ? body.events : [];
    if (!projectId || !events.length || events.length > 30) {
      return NextResponse.json({ ok: false, error: 'projectId et 1 à 30 événements sont requis.' }, { status: 400 });
    }

    const normalized = events.map((event: any, index: number) => ({
      id: typeof event.id === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(event.id)
        ? event.id
        : `mile-${Date.now()}-${index}`,
      title: typeof event.title === 'string' ? event.title.trim() : '',
      date: event.date,
      description: typeof event.description === 'string' ? event.description.trim() : '',
      completed: Boolean(event.completed),
    }));
    if (normalized.some((event: any) =>
      !event.title || event.title.length > 120 || event.description.length > 500 || !isDateOnly(event.date)
    )) {
      return NextResponse.json({ ok: false, error: 'Un événement contient un titre, une date ou une description invalide.' }, { status: 400 });
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return NextResponse.json({ ok: false, error: 'Projet introuvable.' }, { status: 404 });
    const membership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: project.teamId, userId } },
    });
    if (!membership || !['OWNER', 'MEMBER'].includes(membership.role)) {
      return NextResponse.json({ ok: false, error: 'Accès refusé à la création d’événements.' }, { status: 403 });
    }

    const saved: {
      id: string;
      projectId: string;
      title: string;
      date: Date;
      description: string;
      completed: boolean;
    }[] = [];
    for (const event of normalized) {
      const existing = await prisma.milestone.findUnique({ where: { id: event.id } });
      if (existing && existing.projectId !== projectId) {
        return NextResponse.json({ ok: false, error: 'Un événement ne peut pas être déplacé entre projets.' }, { status: 409 });
      }
      const milestone = await prisma.milestone.upsert({
        where: { id: event.id },
        create: {
          id: event.id,
          projectId,
          title: event.title,
          date: new Date(`${event.date}T00:00:00.000Z`),
          description: event.description,
          completed: event.completed,
        },
        update: {
          title: event.title,
          date: new Date(`${event.date}T00:00:00.000Z`),
          description: event.description,
          completed: event.completed,
        },
      });
      saved.push(milestone);
    }

    return NextResponse.json({ ok: true, data: saved });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur lors de l’enregistrement des événements.';
    console.error('[Milestones] Save failed:', message);
    return NextResponse.json({ ok: false, error: 'Impossible d’enregistrer les événements.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const userId = req.cookies.get('studyflow_session')?.value;
  if (!userId) return NextResponse.json({ ok: false, error: 'Authentification requise.' }, { status: 401 });
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ ok: false, error: 'id requis.' }, { status: 400 });

  try {
    const milestone = await prisma.milestone.findUnique({ where: { id } });
    if (!milestone) return NextResponse.json({ ok: false, error: 'Jalon introuvable.' }, { status: 404 });
    const project = await prisma.project.findUnique({ where: { id: milestone.projectId } });
    if (!project) return NextResponse.json({ ok: false, error: 'Projet introuvable.' }, { status: 404 });
    const membership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: project.teamId, userId } },
    });
    if (!membership || !['OWNER', 'MEMBER'].includes(membership.role)) {
      return NextResponse.json({ ok: false, error: 'Accès refusé à la suppression de jalons.' }, { status: 403 });
    }

    await prisma.milestone.delete({ where: { id } });
    return NextResponse.json({ ok: true, data: { id } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur lors de la suppression du jalon.';
    console.error('[Milestones] Delete failed:', message);
    return NextResponse.json({ ok: false, error: 'Impossible de supprimer le jalon.' }, { status: 500 });
  }
}
