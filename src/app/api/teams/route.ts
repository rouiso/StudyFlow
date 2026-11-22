import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateInviteToken, slugifyTeamName } from '@/lib/user-management';

export async function GET(req: NextRequest) {
  try {
    const sessionUserId = req.cookies.get('studyflow_session')?.value;
    if (!sessionUserId) {
      return NextResponse.json({ ok: false, error: 'Authentification requise.' }, { status: 401 });
    }
    const memberships = await prisma.teamMember.findMany({ where: { userId: sessionUserId } });
    const teamIds = memberships.map((membership: any) => membership.teamId);

    const allTeams = await prisma.team.findMany({
      where: { id: { in: teamIds } },
      include: {
        members: {
          include: { user: true },
        },
        projects: {
          include: { columns: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedTeams = allTeams.map((t) => {
      const myMembership = sessionUserId
        ? t.members.find((m) => m.userId === sessionUserId)
        : undefined;
      const ownerMember = t.members.find((m) => m.userId === t.ownerId);

      const toIso = (val: unknown) => (val ? new Date(val as string | number | Date) : new Date()).toISOString();

      return {
        id: t.id,
        name: t.name,
        description: t.description || '',
        slug: t.slug,
        ownerId: t.ownerId,
        ownerName: ownerMember?.user?.name || 'Propriétaire',
        inviteToken: t.inviteToken,
        createdAt: toIso(t.createdAt),
        memberCount: t.members.length,
        isMember: !!myMembership,
        myRole: myMembership?.role || null,
        members: t.members.map((m) => ({
          id: m.id,
          teamId: m.teamId,
          userId: m.userId,
          role: m.role,
          joinedAt: toIso(m.joinedAt || m.createdAt),
          user: {
            id: m.user.id,
            name: m.user.name,
            email: m.user.email,
            avatar: '',
            role: m.role,
            joinedAt: toIso(m.joinedAt || m.createdAt),
          },
        })),
        projects: t.projects.map((p) => ({
          id: p.id,
          teamId: p.teamId,
          name: p.name,
          description: p.description || '',
          color: p.color,
          startDate: p.startDate ? toIso(p.startDate).split('T')[0] : new Date().toISOString().split('T')[0],
          endDate: p.endDate ? toIso(p.endDate).split('T')[0] : new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
          columns: p.columns.map((c) => ({
            id: c.id,
            projectId: c.projectId,
            name: c.name,
            position: c.position,
            wipLimit: c.wipLimit,
            isDone: c.isDone,
          })),
        })),
      };
    });

    return NextResponse.json({
      ok: true,
      teams: formattedTeams,
      myTeams: formattedTeams.filter((t) => t.isMember),
    });
  } catch (error: any) {
    console.error('Erreur GET /api/teams:', error);
    return NextResponse.json(
      { ok: false, error: 'Impossible de charger les équipes.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const sessionUserId = req.cookies.get('studyflow_session')?.value;
    if (!sessionUserId) {
      return NextResponse.json({ ok: false, error: 'Authentification requise.' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: sessionUserId } });
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Utilisateur introuvable.' }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, projectName } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { ok: false, error: 'Le nom de l’équipe est obligatoire.' },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();
    const existingSlugs = (await prisma.team.findMany({ select: { slug: true } })).map((t) => t.slug);
    const slug = slugifyTeamName(trimmedName, existingSlugs);
    const inviteToken = generateInviteToken();

    const createdTeam = await prisma.team.create({
      data: {
        name: trimmedName,
        description: description?.trim() || `Espace collaboratif de ${trimmedName}`,
        slug,
        ownerId: user.id,
        inviteToken,
        members: {
          create: {
            userId: user.id,
            role: 'OWNER',
          },
        },
        projects: {
          create: {
            name: projectName?.trim() || `Projet Principal — ${trimmedName}`,
            description: `Tableau Kanban principal de l'équipe ${trimmedName}`,
            color: '#4f46e5',
            startDate: new Date(),
            endDate: new Date(Date.now() + 45 * 86400000),
            columns: {
              create: [
                { name: 'À faire', position: 1000, isDone: false },
                { name: 'En cours', position: 2000, wipLimit: 4, isDone: false },
                { name: 'En relecture', position: 3000, wipLimit: 3, isDone: false },
                { name: 'Terminé', position: 4000, isDone: true },
              ],
            },
          },
        },
      },
      include: {
        members: {
          include: { user: true },
        },
        projects: {
          include: { columns: true },
        },
      },
    });

    const project = createdTeam.projects[0];
    const membership = createdTeam.members[0];

    return NextResponse.json({
      ok: true,
      team: {
        id: createdTeam.id,
        name: createdTeam.name,
        description: createdTeam.description || '',
        slug: createdTeam.slug,
        ownerId: createdTeam.ownerId,
        inviteToken: createdTeam.inviteToken,
        createdAt: (createdTeam.createdAt ? new Date(createdTeam.createdAt) : new Date()).toISOString(),
      },
      membership: {
        id: membership.id,
        teamId: createdTeam.id,
        userId: user.id,
        role: 'OWNER',
        joinedAt: (membership.joinedAt ? new Date(membership.joinedAt) : new Date()).toISOString(),
      },
      project: project
        ? {
            id: project.id,
            teamId: project.teamId,
            name: project.name,
            description: project.description || '',
            color: project.color,
            startDate: project.startDate ? project.startDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            endDate: project.endDate ? project.endDate.toISOString().split('T')[0] : new Date(Date.now() + 45 * 86400000).toISOString().split('T')[0],
          }
        : null,
      columns: project
        ? project.columns.map((c) => ({
            id: c.id,
            projectId: c.projectId,
            name: c.name,
            position: c.position,
            wipLimit: c.wipLimit,
            isDone: c.isDone,
          }))
        : [],
    });
  } catch (error: any) {
    console.error('Erreur POST /api/teams:', error);
    return NextResponse.json(
      { ok: false, error: 'Erreur lors de la création de l’équipe.' },
      { status: 500 }
    );
  }
}

