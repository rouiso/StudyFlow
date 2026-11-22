import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { assertPermission } from '@/lib/permissions';

// GET /api/projects
export async function GET(req: NextRequest) {
  try {
    const userId = req.cookies.get('studyflow_session')?.value;
    if (!userId) return NextResponse.json({ ok: false, error: 'Authentification requise.' }, { status: 401 });
    const teamId = req.nextUrl.searchParams.get('teamId') || undefined;
    const memberships = await prisma.teamMember.findMany({ where: { userId } });
    const teamIds = memberships.map((membership: any) => membership.teamId);
    if (teamId && !teamIds.includes(teamId)) {
      return NextResponse.json({ ok: false, error: 'Accès refusé à cette équipe.' }, { status: 403 });
    }
    const projects = await prisma.project.findMany({
      where: teamId ? { teamId } : { teamId: { in: teamIds } },
      include: {
        columns: { orderBy: { position: 'asc' } },
        labels: true,
        milestones: { orderBy: { date: 'asc' } },
        team: {
          include: {
            members: { include: { user: true } },
          },
        },
      },
    });

    return NextResponse.json({ ok: true, data: projects });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: { code: 'FETCH_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}

// POST /api/projects
export async function POST(req: NextRequest) {
  try {
    const sessionUserId = req.cookies.get('studyflow_session')?.value;
    if (!sessionUserId) {
      return NextResponse.json({ ok: false, error: 'Authentification requise.' }, { status: 401 });
    }
    const body = await req.json();
    const { teamId, name, description, color, startDate, endDate, templateColumns } = body;

    if (!teamId || !name?.trim()) {
      return NextResponse.json(
        { ok: false, error: { code: 'VALIDATION_ERROR', message: 'Équipe et nom du projet requis' } },
        { status: 400 }
      );
    }

    await assertPermission('create_project', { teamId, userId: sessionUserId });

    const cols: string[] =
      Array.isArray(templateColumns) && templateColumns.length > 0
        ? templateColumns
        : ['À faire', 'En cours', 'En relecture', 'Terminé'];

    const project = await prisma.project.create({
      data: {
        teamId,
        name: name.trim(),
        description: description?.trim() || null,
        color: color || '#4f46e5',
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : new Date(Date.now() + 45 * 86400000),
        columns: {
          create: cols.map((colName, idx) => ({
            name: colName,
            position: (idx + 1) * 1000,
            isDone: idx === cols.length - 1,
          })),
        },
      },
      include: {
        columns: { orderBy: { position: 'asc' } },
      },
    });

    return NextResponse.json({ ok: true, data: project });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: { code: 'CREATE_PROJECT_ERROR', message: error.message } },
      { status: 403 }
    );
  }
}
