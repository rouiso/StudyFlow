import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  canChangeMemberRole,
  canRemoveTeamMember,
  generateInviteToken,
  getRolePermissions,
} from '@/lib/user-management';
import { UserRole } from '@/types';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId } = await context.params;
    const sessionUserId = req.cookies.get('studyflow_session')?.value;
    if (!sessionUserId) {
      return NextResponse.json({ ok: false, error: 'Authentification requise.' }, { status: 401 });
    }
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          include: { user: true },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });

    if (!team) {
      return NextResponse.json({ ok: false, error: 'Équipe introuvable.' }, { status: 404 });
    }
    if (!team.members.some((member) => member.userId === sessionUserId)) {
      return NextResponse.json({ ok: false, error: 'Accès refusé à cette équipe.' }, { status: 403 });
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
        createdAt: team.createdAt.toISOString(),
      },
      members: team.members.map((m) => ({
        id: m.id,
        teamId: m.teamId,
        userId: m.userId,
        role: m.role,
        joinedAt: m.joinedAt.toISOString(),
        user: {
          id: m.user.id,
          name: m.user.name,
          email: m.user.email,
          avatar: '',
          role: m.role,
          joinedAt: m.joinedAt.toISOString(),
        },
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId } = await context.params;
    const sessionUserId = req.cookies.get('studyflow_session')?.value;
    if (!sessionUserId) {
      return NextResponse.json({ ok: false, error: 'Non authentifié.' }, { status: 401 });
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: { members: true },
    });

    if (!team) {
      return NextResponse.json({ ok: false, error: 'Équipe introuvable.' }, { status: 404 });
    }

    const actorMembership = team.members.find((m) => m.userId === sessionUserId);
    if (!actorMembership) {
      return NextResponse.json({ ok: false, error: 'Vous n’êtes pas membre de cette équipe.' }, { status: 403 });
    }

    const actorRole = actorMembership.role as UserRole;
    const perms = getRolePermissions(actorRole);
    if (!perms.canInviteMembers) {
      return NextResponse.json(
        { ok: false, error: 'Seul le Propriétaire (OWNER) peut ajouter des membres.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const email = (body.email || '').trim().toLowerCase();
    const name = (body.name || email.split('@')[0] || 'Nouveau Membre').trim();
    const requestedRole = (body.role || 'MEMBER') as UserRole;

    if (!email) {
      return NextResponse.json({ ok: false, error: 'L’adresse e-mail est obligatoire.' }, { status: 400 });
    }

    if (requestedRole === 'OWNER') {
      return NextResponse.json(
        { ok: false, error: 'Impossible d’inviter directement en tant que OWNER. Utilisez le transfert de propriété.' },
        { status: 400 }
      );
    }

    if (!['MEMBER', 'COACH'].includes(requestedRole)) {
      return NextResponse.json({ ok: false, error: 'Rôle invalide.' }, { status: 400 });
    }

    let targetUser = await prisma.user.findUnique({ where: { email } });
    if (!targetUser) {
      targetUser = await prisma.user.create({
        data: {
          name,
          email,
          image: '',
        },
      });
    }

    const existingMember = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: team.id,
          userId: targetUser.id,
        },
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { ok: false, error: 'Cet utilisateur fait déjà partie de l’équipe.' },
        { status: 409 }
      );
    }

    const createdMember = await prisma.teamMember.create({
      data: {
        teamId: team.id,
        userId: targetUser.id,
        role: requestedRole,
      },
    });

    return NextResponse.json({
      ok: true,
      member: {
        id: createdMember.id,
        teamId: createdMember.teamId,
        userId: createdMember.userId,
        role: createdMember.role as UserRole,
        joinedAt: createdMember.joinedAt.toISOString(),
        user: {
          id: targetUser.id,
          name: targetUser.name,
          email: targetUser.email,
          avatar: '',
          role: createdMember.role as UserRole,
          joinedAt: createdMember.joinedAt.toISOString(),
        },
      },
    });
  } catch (error: any) {
    console.error('Erreur POST /api/teams/[teamId]/members:', error);
    return NextResponse.json({ ok: false, error: 'Erreur lors de l’ajout du membre.' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId } = await context.params;
    const sessionUserId = req.cookies.get('studyflow_session')?.value;
    if (!sessionUserId) {
      return NextResponse.json({ ok: false, error: 'Non authentifié.' }, { status: 401 });
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: { members: true },
    });

    if (!team) {
      return NextResponse.json({ ok: false, error: 'Équipe introuvable.' }, { status: 404 });
    }

    const actorMembership = team.members.find((m) => m.userId === sessionUserId);
    if (!actorMembership) {
      return NextResponse.json({ ok: false, error: 'Accès refusé.' }, { status: 403 });
    }

    const actorRole = actorMembership.role as UserRole;
    const body = await req.json();
    const { action } = body;

    if (action === 'update_role') {
      const { userId, role } = body as { userId: string; role: UserRole };
      const targetMembership = team.members.find((m) => m.userId === userId);
      if (!targetMembership) {
        return NextResponse.json({ ok: false, error: 'Membre introuvable.' }, { status: 404 });
      }

      const check = canChangeMemberRole({
        actorId: sessionUserId,
        actorRole,
        targetId: userId,
        targetRole: targetMembership.role as UserRole,
        newRole: role,
        teamOwnerId: team.ownerId,
      });

      if (!check.allowed) {
        return NextResponse.json({ ok: false, error: check.reason }, { status: 403 });
      }

      const updated = await prisma.teamMember.update({
        where: { id: targetMembership.id },
        data: { role },
      });

      return NextResponse.json({ ok: true, member: updated });
    }

    if (action === 'transfer_ownership') {
      const { newOwnerId } = body as { newOwnerId: string };
      if (sessionUserId !== team.ownerId || actorRole !== 'OWNER') {
        return NextResponse.json(
          { ok: false, error: 'Seul le propriétaire actuel (OWNER) peut transférer la propriété.' },
          { status: 403 }
        );
      }

      const targetMembership = team.members.find((m) => m.userId === newOwnerId);
      if (!targetMembership) {
        return NextResponse.json(
          { ok: false, error: 'Le nouveau propriétaire doit être membre de l’équipe.' },
          { status: 404 }
        );
      }

      await prisma.$transaction([
        prisma.team.update({
          where: { id: team.id },
          data: { ownerId: newOwnerId },
        }),
        prisma.teamMember.update({
          where: { id: targetMembership.id },
          data: { role: 'OWNER' },
        }),
        prisma.teamMember.update({
          where: { id: actorMembership.id },
          data: { role: 'MEMBER' },
        }),
      ]);

      return NextResponse.json({ ok: true, newOwnerId, previousOwnerId: sessionUserId });
    }

    if (action === 'regenerate_token') {
      if (!getRolePermissions(actorRole).canRegenerateInviteToken) {
        return NextResponse.json(
          { ok: false, error: 'Seul OWNER peut régénérer le jeton d’invitation.' },
          { status: 403 }
        );
      }

      const newToken = generateInviteToken();
      const updatedTeam = await prisma.team.update({
        where: { id: team.id },
        data: { inviteToken: newToken },
      });

      return NextResponse.json({ ok: true, inviteToken: updatedTeam.inviteToken });
    }

    if (action === 'update_team') {
      if (!getRolePermissions(actorRole).canManageTeamSettings) {
        return NextResponse.json(
          { ok: false, error: 'Seul OWNER peut modifier les paramètres de l’équipe.' },
          { status: 403 }
        );
      }

      const updatedTeam = await prisma.team.update({
        where: { id: team.id },
        data: {
          name: body.name?.trim() || team.name,
          description: body.description !== undefined ? body.description.trim() : team.description,
        },
      });

      return NextResponse.json({ ok: true, team: updatedTeam });
    }

    return NextResponse.json({ ok: false, error: 'Action non reconnue.' }, { status: 400 });
  } catch (error: any) {
    console.error('Erreur PATCH /api/teams/[teamId]/members:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId } = await context.params;
    const sessionUserId = req.cookies.get('studyflow_session')?.value;
    if (!sessionUserId) {
      return NextResponse.json({ ok: false, error: 'Non authentifié.' }, { status: 401 });
    }

    const targetUserId = req.nextUrl.searchParams.get('userId') || (await req.json().catch(() => ({}))).userId;
    if (!targetUserId) {
      return NextResponse.json({ ok: false, error: 'Identifiant du membre requis.' }, { status: 400 });
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: { members: true },
    });

    if (!team) {
      return NextResponse.json({ ok: false, error: 'Équipe introuvable.' }, { status: 404 });
    }

    const actorMembership = team.members.find((m) => m.userId === sessionUserId);
    const targetMembership = team.members.find((m) => m.userId === targetUserId);

    if (!actorMembership || !targetMembership) {
      return NextResponse.json({ ok: false, error: 'Membre introuvable.' }, { status: 404 });
    }

    const check = canRemoveTeamMember({
      actorId: sessionUserId,
      actorRole: actorMembership.role as UserRole,
      targetId: targetUserId,
      targetRole: targetMembership.role as UserRole,
      teamOwnerId: team.ownerId,
    });

    if (!check.allowed) {
      return NextResponse.json({ ok: false, error: check.reason }, { status: 403 });
    }

    await prisma.teamMember.delete({
      where: { id: targetMembership.id },
    });

    return NextResponse.json({ ok: true, removedUserId: targetUserId });
  } catch (error: any) {
    console.error('Erreur DELETE /api/teams/[teamId]/members:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

