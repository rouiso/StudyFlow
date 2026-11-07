import { User, Team, TeamMember, UserRole, Project, Column } from '@/types';

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  OWNER: 5,
  ADMIN: 4,
  COACH: 3,
  MEMBER: 2,
  VIEWER: 1,
};

export interface RoleMetadata {
  role: UserRole;
  label: string;
  shortLabel: string;
  description: string;
  badgeClass: string;
}

export const ROLE_METADATA: Record<UserRole, RoleMetadata> = {
  OWNER: {
    role: 'OWNER',
    label: 'Propriétaire (Owner)',
    shortLabel: 'OWNER',
    description: 'Contrôle total : gestion des admins/membres, paramètres de l’équipe, transfert de propriété et suppression.',
    badgeClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
  },
  ADMIN: {
    role: 'ADMIN',
    label: 'Administrateur (Admin)',
    shortLabel: 'ADMIN',
    description: 'Peut inviter des membres, gérer les rôles (Coach, Member, Viewer), créer des projets et gérer le Kanban.',
    badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
  },
  COACH: {
    role: 'COACH',
    label: 'Coach / Enseignant',
    shortLabel: 'COACH',
    description: 'Anime les formations, assure le coaching et évalue les compétences. Lecture seule sur les cartes Kanban.',
    badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  },
  MEMBER: {
    role: 'MEMBER',
    label: 'Membre Contributeur',
    shortLabel: 'MEMBER',
    description: 'Crée, déplace et complète les tâches, participe au chat, partage des fichiers et s’inscrit aux formations.',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  },
  VIEWER: {
    role: 'VIEWER',
    label: 'Observateur (Viewer)',
    shortLabel: 'VIEWER',
    description: 'Accès en lecture seule aux tableaux Kanban, au calendrier et aux indicateurs du projet.',
    badgeClass: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
  },
};

export interface RolePermissions {
  canManageTeamSettings: boolean;
  canDeleteTeam: boolean;
  canTransferOwnership: boolean;
  canInviteMembers: boolean;
  canRegenerateInviteToken: boolean;
  canManageRoles: boolean;
  canRemoveMembers: boolean;
  canCreateProject: boolean;
  canDeleteProject: boolean;
  canManageColumns: boolean;
  canWriteTasks: boolean;
  canManageTrainings: boolean;
  canAssessSkills: boolean;
  canPostMessages: boolean;
}

export function hasMinRole(userRole: UserRole, minRole: UserRole): boolean {
  return (ROLE_HIERARCHY[userRole] ?? 0) >= (ROLE_HIERARCHY[minRole] ?? 99);
}

export function getRolePermissions(role: UserRole): RolePermissions {
  return {
    canManageTeamSettings: role === 'OWNER' || role === 'ADMIN',
    canDeleteTeam: role === 'OWNER',
    canTransferOwnership: role === 'OWNER',
    canInviteMembers: role === 'OWNER' || role === 'ADMIN',
    canRegenerateInviteToken: role === 'OWNER' || role === 'ADMIN',
    canManageRoles: role === 'OWNER' || role === 'ADMIN',
    canRemoveMembers: role === 'OWNER' || role === 'ADMIN',
    canCreateProject: role === 'OWNER' || role === 'ADMIN',
    canDeleteProject: role === 'OWNER' || role === 'ADMIN',
    canManageColumns: role === 'OWNER' || role === 'ADMIN' || role === 'MEMBER',
    canWriteTasks: role === 'OWNER' || role === 'ADMIN' || role === 'MEMBER',
    canManageTrainings: role === 'OWNER' || role === 'ADMIN' || role === 'COACH',
    canAssessSkills: role === 'OWNER' || role === 'ADMIN' || role === 'COACH',
    canPostMessages: role !== 'VIEWER',
  };
}

export function getAssignableRoles(actorRole: UserRole): UserRole[] {
  if (actorRole === 'OWNER') {
    return ['ADMIN', 'COACH', 'MEMBER', 'VIEWER'];
  }
  if (actorRole === 'ADMIN') {
    return ['COACH', 'MEMBER', 'VIEWER'];
  }
  return [];
}

export function canChangeMemberRole(params: {
  actorId: string;
  actorRole: UserRole;
  targetId: string;
  targetRole: UserRole;
  newRole: UserRole;
  teamOwnerId: string;
}): { allowed: boolean; reason?: string } {
  const { actorId, actorRole, targetId, targetRole, newRole, teamOwnerId } = params;

  if (targetId === teamOwnerId || targetRole === 'OWNER') {
    return {
      allowed: false,
      reason: 'Le rôle du propriétaire (OWNER) ne peut être modifié que via un transfert de propriété.',
    };
  }

  if (newRole === 'OWNER') {
    return {
      allowed: false,
      reason: 'Utilisez la fonction de transfert de propriété pour nommer un nouveau OWNER.',
    };
  }

  if (actorId === targetId) {
    return {
      allowed: false,
      reason: 'Vous ne pouvez pas modifier votre propre rôle.',
    };
  }

  if (actorRole === 'OWNER') {
    return { allowed: true };
  }

  if (actorRole === 'ADMIN') {
    if (targetRole === 'ADMIN') {
      return {
        allowed: false,
        reason: 'Seul le propriétaire (OWNER) peut modifier le rôle d’un administrateur.',
      };
    }
    if (newRole === 'ADMIN') {
      return {
        allowed: false,
        reason: 'Seul le propriétaire (OWNER) peut promouvoir un membre au rang d’administrateur (ADMIN).',
      };
    }
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: 'Vous ne disposez pas des droits nécessaires pour modifier les rôles.',
  };
}

export function canRemoveTeamMember(params: {
  actorId: string;
  actorRole: UserRole;
  targetId: string;
  targetRole: UserRole;
  teamOwnerId: string;
}): { allowed: boolean; reason?: string } {
  const { actorId, actorRole, targetId, targetRole, teamOwnerId } = params;

  if (targetId === teamOwnerId || targetRole === 'OWNER') {
    return {
      allowed: false,
      reason: 'Le propriétaire (OWNER) ne peut pas être retiré sans transférer la propriété au préalable.',
    };
  }

  // Un membre non-propriétaire peut quitter l'équipe lui-même
  if (actorId === targetId) {
    return { allowed: true };
  }

  if (actorRole === 'OWNER') {
    return { allowed: true };
  }

  if (actorRole === 'ADMIN') {
    if (targetRole === 'ADMIN') {
      return {
        allowed: false,
        reason: 'Seul le propriétaire (OWNER) peut retirer un administrateur de l’équipe.',
      };
    }
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: 'Permissions insuffisantes pour retirer un membre de l’équipe.',
  };
}

export function applyRoleChange(
  members: TeamMember[],
  params: { actorId: string; targetId: string; newRole: UserRole; team: Team }
): { ok: boolean; error?: string; members: TeamMember[] } {
  const { actorId, targetId, newRole, team } = params;
  const actorMember = members.find((m) => m.teamId === team.id && m.userId === actorId);
  const targetMember = members.find((m) => m.teamId === team.id && m.userId === targetId);

  if (!actorMember) {
    return { ok: false, error: 'Acteur non membre de cette équipe.', members };
  }
  if (!targetMember) {
    return { ok: false, error: 'Membre cible introuvable dans cette équipe.', members };
  }

  const check = canChangeMemberRole({
    actorId,
    actorRole: actorMember.role,
    targetId,
    targetRole: targetMember.role,
    newRole,
    teamOwnerId: team.ownerId,
  });

  if (!check.allowed) {
    return { ok: false, error: check.reason, members };
  }

  const updated = members.map((m) =>
    m.teamId === team.id && m.userId === targetId ? { ...m, role: newRole } : m
  );

  return { ok: true, members: updated };
}

export function applyRemoveMember(
  members: TeamMember[],
  params: { actorId: string; targetId: string; team: Team }
): { ok: boolean; error?: string; members: TeamMember[] } {
  const { actorId, targetId, team } = params;
  const actorMember = members.find((m) => m.teamId === team.id && m.userId === actorId);
  const targetMember = members.find((m) => m.teamId === team.id && m.userId === targetId);

  if (!actorMember) {
    return { ok: false, error: 'Acteur non membre de cette équipe.', members };
  }
  if (!targetMember) {
    return { ok: false, error: 'Membre cible introuvable dans cette équipe.', members };
  }

  const check = canRemoveTeamMember({
    actorId,
    actorRole: actorMember.role,
    targetId,
    targetRole: targetMember.role,
    teamOwnerId: team.ownerId,
  });

  if (!check.allowed) {
    return { ok: false, error: check.reason, members };
  }

  const updated = members.filter((m) => !(m.teamId === team.id && m.userId === targetId));
  return { ok: true, members: updated };
}

export function transferTeamOwnership(
  team: Team,
  members: TeamMember[],
  params: { actorId: string; newOwnerId: string }
): { ok: boolean; error?: string; team: Team; members: TeamMember[] } {
  const { actorId, newOwnerId } = params;

  if (actorId !== team.ownerId) {
    return {
      ok: false,
      error: 'Seul le propriétaire actuel (OWNER) peut transférer la propriété de l’équipe.',
      team,
      members,
    };
  }

  if (newOwnerId === actorId) {
    return {
      ok: false,
      error: 'Vous êtes déjà le propriétaire de cette équipe.',
      team,
      members,
    };
  }

  const targetMember = members.find((m) => m.teamId === team.id && m.userId === newOwnerId);
  if (!targetMember) {
    return {
      ok: false,
      error: 'Le nouveau propriétaire doit déjà être membre de l’équipe.',
      team,
      members,
    };
  }

  const updatedTeam: Team = {
    ...team,
    ownerId: newOwnerId,
  };

  const updatedMembers = members.map((m) => {
    if (m.teamId !== team.id) return m;
    if (m.userId === newOwnerId) return { ...m, role: 'OWNER' as UserRole };
    if (m.userId === actorId) return { ...m, role: 'ADMIN' as UserRole };
    return m;
  });

  return {
    ok: true,
    team: updatedTeam,
    members: updatedMembers,
  };
}

export function generateInviteToken(prefix = 'STUDY'): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${code}-2026`;
}

export function slugifyTeamName(name: string, existingSlugs: string[] = []): string {
  const base = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'equipe';

  if (!existingSlugs.includes(base)) return base;
  let counter = 2;
  while (existingSlugs.includes(`${base}-${counter}`)) {
    counter++;
  }
  return `${base}-${counter}`;
}

export function createTeamWithOwner(params: {
  name: string;
  description?: string;
  projectName?: string;
  owner: User;
  existingTeams?: Team[];
}): {
  team: Team;
  membership: TeamMember;
  defaultProject: Project;
  defaultColumns: Column[];
} {
  const trimmedName = params.name.trim() || 'Nouvelle Équipe';
  const existingSlugs = (params.existingTeams || []).map((t) => t.slug);
  const slug = slugifyTeamName(trimmedName, existingSlugs);
  const now = new Date().toISOString();
  const teamId = `team-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const projId = `proj-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  const team: Team = {
    id: teamId,
    name: trimmedName,
    description: params.description?.trim() || `Espace collaboratif de ${trimmedName}`,
    slug,
    ownerId: params.owner.id,
    inviteToken: generateInviteToken(),
    createdAt: now,
  };

  const membership: TeamMember = {
    id: `tm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    teamId,
    userId: params.owner.id,
    role: 'OWNER',
    joinedAt: now,
  };

  const startDate = now.split('T')[0];
  const endDate = new Date(Date.now() + 45 * 86400000).toISOString().split('T')[0];

  const defaultProject: Project = {
    id: projId,
    teamId,
    name: params.projectName?.trim() || `Projet Principal — ${trimmedName}`,
    description: `Tableau Kanban principal de l'équipe ${trimmedName}`,
    color: '#4f46e5',
    startDate,
    endDate,
  };

  const defaultColumns: Column[] = [
    { id: `col-${projId}-1`, projectId: projId, name: 'À faire', position: 1000, isDone: false, color: '#94a3b8' },
    { id: `col-${projId}-2`, projectId: projId, name: 'En cours', position: 2000, wipLimit: 4, isDone: false, color: '#38bdf8' },
    { id: `col-${projId}-3`, projectId: projId, name: 'En relecture', position: 3000, wipLimit: 3, isDone: false, color: '#fbbf24' },
    { id: `col-${projId}-4`, projectId: projId, name: 'Terminé', position: 4000, isDone: true, color: '#34d399' },
  ];

  return {
    team,
    membership,
    defaultProject,
    defaultColumns,
  };
}

export function joinTeamWithToken(params: {
  token: string;
  user: User;
  teams: Team[];
  members: TeamMember[];
  role?: UserRole;
}): {
  ok: boolean;
  error?: string;
  team?: Team;
  membership?: TeamMember;
  alreadyMember?: boolean;
} {
  const cleanToken = params.token.trim().toUpperCase();
  if (!cleanToken) {
    return { ok: false, error: 'Veuillez fournir un code d’invitation valide.' };
  }

  const matchedTeam = params.teams.find(
    (t) =>
      t.inviteToken.trim().toUpperCase() === cleanToken ||
      t.slug.toUpperCase() === cleanToken ||
      t.id.toUpperCase() === cleanToken
  );

  if (!matchedTeam) {
    return {
      ok: false,
      error: 'Aucune équipe ne correspond à ce code d’invitation. Vérifiez le jeton auprès du propriétaire de l’équipe.',
    };
  }

  const existingMembership = params.members.find(
    (m) => m.teamId === matchedTeam.id && m.userId === params.user.id
  );

  if (existingMembership) {
    return {
      ok: true,
      team: matchedTeam,
      membership: existingMembership,
      alreadyMember: true,
    };
  }

  const newMembership: TeamMember = {
    id: `tm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    teamId: matchedTeam.id,
    userId: params.user.id,
    role: params.role || 'MEMBER',
    joinedAt: new Date().toISOString(),
  };

  return {
    ok: true,
    team: matchedTeam,
    membership: newMembership,
    alreadyMember: false,
  };
}

