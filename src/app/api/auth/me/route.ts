import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get('studyflow_session')?.value;

    if (!sessionCookie) {
      return NextResponse.json({ ok: false, error: 'Non authentifié' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionCookie },
      include: {
        teamMembers: {
          include: {
            team: {
              include: {
                members: {
                  include: { user: true },
                },
                projects: {
                  include: { columns: true },
                },
              },
            },
          },
          orderBy: { joinedAt: 'desc' },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ ok: false, error: 'Utilisateur introuvable' }, { status: 401 });
    }

    const primaryMembership = user.teamMembers[0];
    const needsOnboarding = user.teamMembers.length === 0;

    return NextResponse.json(
      {
        ok: true,
        needsOnboarding,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: primaryMembership?.role || 'MEMBER',
        },
        memberships: user.teamMembers.map((tm) => ({
          id: tm.id,
          teamId: tm.teamId,
          userId: tm.userId,
          role: tm.role,
          joinedAt: tm.joinedAt.toISOString(),
          team: {
            id: tm.team.id,
            name: tm.team.name,
            description: tm.team.description || '',
            slug: tm.team.slug,
            ownerId: tm.team.ownerId,
            inviteToken: tm.team.inviteToken,
            createdAt: tm.team.createdAt.toISOString(),
            members: tm.team.members.map((m) => ({
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
            projects: tm.team.projects.map((p) => ({
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
          },
        })),
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
