import { prisma } from './prisma';

export type Role = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

const ROLE_HIERARCHY: Record<Role, number> = {
  OWNER: 4,
  ADMIN: 3,
  MEMBER: 2,
  VIEWER: 1,
};

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

/**
 * Récupère l'utilisateur courant (simulé ou via session Auth.js)
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
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
export async function requireTeamRole(teamId: string, minRole: Role): Promise<{ authorized: boolean; memberRole?: Role }> {
  const user = await getCurrentUser();
  if (!user) return { authorized: false };

  const member = await prisma.teamMember.findUnique({
    where: {
      teamId_userId: {
        teamId,
        userId: user.id,
      },
    },
  });

  if (!member) return { authorized: false };

  const userRole = member.role as Role;
  const isAuthorized = (ROLE_HIERARCHY[userRole] ?? 0) >= (ROLE_HIERARCHY[minRole] ?? 99);

  return { authorized: isAuthorized, memberRole: userRole };
}

/**
 * Vérifie l'accès à un projet (doit être membre de l'équipe parente)
 */
export async function requireProjectAccess(projectId: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { team: true },
  });

  if (!project) return false;

  const member = await prisma.teamMember.findUnique({
    where: {
      teamId_userId: {
        teamId: project.teamId,
        userId: user.id,
      },
    },
  });

  return !!member;
}

/**
 * Assertion stricte de permission conformément au §4.2 du Cahier des Charges
 */
export async function assertPermission(action: string, context: { teamId?: string; projectId?: string }) {
  if (context.projectId) {
    const hasAccess = await requireProjectAccess(context.projectId);
    if (!hasAccess) {
      throw new Error(`Accès refusé au projet : ${context.projectId}`);
    }
  }

  if (context.teamId) {
    const { authorized } = await requireTeamRole(context.teamId, 'MEMBER');
    if (!authorized) {
      throw new Error(`Permission insuffisante pour l'action : ${action}`);
    }
  }
}
