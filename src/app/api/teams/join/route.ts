import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('token')?.trim();
    if (!token) {
      return NextResponse.json({ ok: false, error: 'Jeton manquant.' }, { status: 400 });
    }

    const team = await prisma.team.findFirst({
      where: {
        OR: [
          { inviteToken: token },
          { inviteToken: token.toUpperCase() },
          { slug: token.toLowerCase() },
          { id: token },
        ],
      },
      include: {
        members: { include: { user: true } },
        projects: true,
      },
    });

    if (!team) {
      return NextResponse.json(
        { ok: false, error: 'Aucune équipe ne correspond à ce jeton d’invitation.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      team: {
        id: team.id,
        name: team.name,
        description: team.description || '',
        slug: team.slug,
        ownerId: team.ownerId,
        inviteToken: team.inviteToken,
        memberCount: team.members.length,
        projectCount: team.projects.length,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
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
    const rawToken = (body.token || body.inviteToken || body.teamId || '').trim();

    if (!rawToken) {
      return NextResponse.json(
        { ok: false, error: 'Veuillez saisir un code d’invitation ou sélectionner une équipe.' },
        { status: 400 }
      );
    }

    const team = await prisma.team.findFirst({
      where: {
        OR: [
          { inviteToken: rawToken },
          { inviteToken: rawToken.toUpperCase() },
          { slug: rawToken.toLowerCase() },
          { id: rawToken },
        ],
      },
      include: {
        members: { include: { user: true } },
        projects: { include: { columns: true } },
      },
    });

    if (!team) {
      return NextResponse.json(
        { ok: false, error: 'Aucune équipe ne correspond à ce code d’invitation.' },
        { status: 404 }
      );
    }

    if (team.inviteExpiresAt && new Date(team.inviteExpiresAt) < new Date()) {
      return NextResponse.json(
        { ok: false, error: 'Ce lien d’invitation a expiré.' },
        { status: 410 }
      );
    }

    const existingMembership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: team.id,
          userId: user.id,
        },
      },
    });

    let membership = existingMembership;
    let alreadyMember = true;

    if (!membership) {
      membership = await prisma.teamMember.create({
        data: {
          teamId: team.id,
          userId: user.id,
          role: 'MEMBER',
        },
      });
      alreadyMember = false;
    }

    // Recharger les membres avec l'utilisateur ajouté
    const updatedMembers = await prisma.teamMember.findMany({
      where: { teamId: team.id },
      include: { user: true },
    });

    return NextResponse.json({
      ok: true,
      alreadyMember,
      team: {
        id: team.id,
        name: team.name,
        description: team.description || '',
        slug: team.slug,
        ownerId: team.ownerId,
        inviteToken: team.inviteToken,
        createdAt: team.createdAt.toISOString(),
      },
      membership: {
        id: membership.id,
        teamId: membership.teamId,
        userId: membership.userId,
        role: membership.role,
        joinedAt: membership.joinedAt.toISOString(),
      },
      members: updatedMembers.map((m) => ({
        id: m.id,
        teamId: m.teamId,
        userId: m.userId,
        role: m.role,
        joinedAt: m.joinedAt.toISOString(),
        user: {
          id: m.user.id,
          name: m.user.name,
          email: m.user.email,
          avatar: m.user.image || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
          role: m.role,
          joinedAt: m.joinedAt.toISOString(),
        },
      })),
      projects: team.projects.map((p) => ({
        id: p.id,
        teamId: p.teamId,
        name: p.name,
        description: p.description || '',
        color: p.color,
        startDate: p.startDate ? p.startDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        endDate: p.endDate ? p.endDate.toISOString().split('T')[0] : new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        columns: p.columns.map((c) => ({
          id: c.id,
          projectId: c.projectId,
          name: c.name,
          position: c.position,
          wipLimit: c.wipLimit,
          isDone: c.isDone,
        })),
      })),
    });
  } catch (error: any) {
    console.error('Erreur POST /api/teams/join:', error);
    return NextResponse.json(
      { ok: false, error: 'Impossible de rejoindre cette équipe.' },
      { status: 500 }
    );
  }
}

