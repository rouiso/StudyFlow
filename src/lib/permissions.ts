import { cookies } from 'next/headers';
import { prisma } from './prisma';
import {
  ROLE_HIERARCHY,
  hasMinRole,
  getRolePermissions,
  canChangeMemberRole,
  canRemoveTeamMember,
} from './user-management';
import { UserRole } from '@/types';

export type Role = UserRole;

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

/**
 * Récupère l'utilisateur courant depuis le cookie de session ou le premier utilisateur en fallback
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const sessionUserId = cookieStore.get('studyflow_session')?.value;
    if (sessionUserId) {
      const sessionUser = await prisma.user.findUnique({ where: { id: sessionUserId } });
      if (sessionUser) {
        return {
          id: sessionUser.id,
          name: sessionUser.name,
          email: sessionUser.email,
        };
      }
    }
  } catch {
    // En dehors d'un contexte de requête HTTP (ex: scripts / tests), fallback sur mongo.user.findFirst()
  }

  const user = await prisma.user.findFirst();
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
  };
}

/**
 * Vérifie le rôle minimal requis au sein d'une équipe
 */
export async function requireTeamRole(
  teamId: string,
  minRole: Role,
  explicitUserId?: string
): Promise<{ authorized: boolean; memberRole?: Role; userId?: string }> {
  let userId = explicitUserId;
  if (!userId) {
    const user = await getCurrentUser();
    if (!user) return { authorized: false };
    userId = user.id;
  }

  const member = await prisma.teamMember.findUnique({
    where: {
      teamId_userId: {
        teamId,
        userId,
      },
    },
  });

  if (!member) return { authorized: false, userId };

  const userRole = member.role as Role;
  const isAuthorized = hasMinRole(userRole, minRole);

  return { authorized: isAuthorized, memberRole: userRole, userId };
}

/**
 * Vérifie l'accès à un projet (doit être membre de l'équipe parente)
 */
export async function requireProjectAccess(projectId: string, explicitUserId?: string): Promise<boolean> {
  let userId = explicitUserId;
  if (!userId) {
    const user = await getCurrentUser();
    if (!user) return false;
    userId = user.id;
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { team: true },
  });

  if (!project) return false;

  const member = await prisma.teamMember.findUnique({
    where: {
      teamId_userId: {
        teamId: project.teamId,
        userId,
      },
    },
  });

  return !!member;
}

/**
 * Vérifie si l'utilisateur courant est Coach de l'équipe (Module 1 - v1.1)
 */
export async function requireCoach(teamId: string, explicitUserId?: string): Promise<boolean> {
  let userId = explicitUserId;
  if (!userId) {
    const user = await getCurrentUser();
    if (!user) return false;
    userId = user.id;
  }

  const member = await prisma.teamMember.findUnique({
    where: {
      teamId_userId: {
        teamId,
        userId,
      },
    },
  });

  return member?.role === 'COACH';
}

/**
 * Assertion stricte de permission conformément au §4.2 du Cahier des Charges v1.1
 */
export async function assertPermission(
  action: string,
  context: { teamId?: string; projectId?: string; userId?: string }
) {
  let resolvedTeamId = context.teamId;

  if (context.projectId) {
    const project = await prisma.project.findUnique({
      where: { id: context.projectId },
    });
    if (!project) {
      throw new Error(`Projet introuvable : ${context.projectId}`);
    }
    resolvedTeamId = resolvedTeamId || project.teamId;

    const hasAccess = await requireProjectAccess(context.projectId, context.userId);
    if (!hasAccess) {
      throw new Error(`Accès refusé au projet : ${context.projectId}`);
    }
  }

  if (resolvedTeamId) {
    const { authorized, memberRole } = await requireTeamRole(resolvedTeamId, 'VIEWER', context.userId);
    if (!authorized || !memberRole) {
      throw new Error(`Permission insuffisante pour l'action : ${action}`);
    }

    const perms = getRolePermissions(memberRole);

    // Règle v1.1 : Le Coach et le Viewer ne peuvent pas créer, déplacer ou modifier des tâches
    const taskWriteActions = [
      'create_task',
      'move_task',
      'update_task',
      'delete_task',
      'reorder_tasks',
      'task.create',
      'task.move',
      'task.update',
      'task.delete',
    ];
    if (taskWriteActions.includes(action) && !perms.canWriteTasks) {
      throw new Error(
        `Action interdite pour le rôle ${memberRole} : les tâches ne peuvent être modifiées que par les membres contributeurs (OWNER, ADMIN, MEMBER)`
      );
    }

    if ((action === 'create_project' || action === 'delete_project') && !perms.canCreateProject) {
      throw new Error(
        `Action interdite pour le rôle ${memberRole} : seuls OWNER et ADMIN peuvent créer ou supprimer un projet`
      );
    }

    const memberManageActions = ['invite_member', 'update_role', 'remove_member', 'regenerate_token'];
    if (memberManageActions.includes(action) && !perms.canManageRoles) {
      throw new Error(
        `Action interdite pour le rôle ${memberRole} : seuls les rôles OWNER et ADMIN peuvent gérer l'équipe`
      );
    }

    if (action === 'transfer_ownership' && !perms.canTransferOwnership) {
      throw new Error(`Seul le propriétaire (OWNER) peut transférer la propriété de l'équipe.`);
    }
  }
}

export { ROLE_HIERARCHY, hasMinRole, getRolePermissions, canChangeMemberRole, canRemoveTeamMember };
