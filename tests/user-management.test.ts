import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  hasMinRole,
  getRolePermissions,
  getAssignableRoles,
  canChangeMemberRole,
  canRemoveTeamMember,
  applyRoleChange,
  applyRemoveMember,
  transferTeamOwnership,
  createTeamWithOwner,
  joinTeamWithToken,
  generateInviteToken,
} from '../src/lib/user-management';
import { Team, TeamMember, User } from '../src/types';

describe('User Management & RBAC Engine (Module 1)', () => {
  const ownerUser: User = {
    id: 'u-owner',
    name: 'Léa Owner',
    email: 'lea@univ.fr',
    avatar: '',
    role: 'OWNER',
    joinedAt: '2026-09-01T08:00:00Z',
  };

  const baseTeam: Team = {
    id: 'team-1',
    name: 'Équipe Alpha',
    description: 'Équipe test',
    slug: 'equipe-alpha',
    ownerId: 'u-owner',
    inviteToken: 'STUDY-ALPH-2026',
    createdAt: '2026-09-01T08:00:00Z',
  };

  const baseMembers: TeamMember[] = [
    { id: 'tm-1', teamId: 'team-1', userId: 'u-owner', role: 'OWNER', joinedAt: '2026-09-01T08:00:00Z' },
    { id: 'tm-2', teamId: 'team-1', userId: 'u-admin', role: 'ADMIN', joinedAt: '2026-09-01T09:00:00Z' },
    { id: 'tm-3', teamId: 'team-1', userId: 'u-coach', role: 'COACH', joinedAt: '2026-09-01T10:00:00Z' },
    { id: 'tm-4', teamId: 'team-1', userId: 'u-member', role: 'MEMBER', joinedAt: '2026-09-01T11:00:00Z' },
    { id: 'tm-5', teamId: 'team-1', userId: 'u-viewer', role: 'VIEWER', joinedAt: '2026-09-01T12:00:00Z' },
  ];

  it('hiérarchie des rôles : OWNER > ADMIN > COACH > MEMBER > VIEWER', () => {
    assert.strictEqual(hasMinRole('OWNER', 'ADMIN'), true);
    assert.strictEqual(hasMinRole('ADMIN', 'OWNER'), false);
    assert.strictEqual(hasMinRole('ADMIN', 'MEMBER'), true);
    assert.strictEqual(hasMinRole('MEMBER', 'ADMIN'), false);
    assert.strictEqual(hasMinRole('VIEWER', 'MEMBER'), false);
  });

  it('matrice de permissions par rôle (OWNER, ADMIN, COACH, MEMBER, VIEWER)', () => {
    const ownerPerms = getRolePermissions('OWNER');
    const adminPerms = getRolePermissions('ADMIN');
    const coachPerms = getRolePermissions('COACH');
    const memberPerms = getRolePermissions('MEMBER');
    const viewerPerms = getRolePermissions('VIEWER');

    // OWNER peut tout faire, y compris transférer la propriété et supprimer l'équipe
    assert.strictEqual(ownerPerms.canTransferOwnership, true);
    assert.strictEqual(ownerPerms.canDeleteTeam, true);
    assert.strictEqual(ownerPerms.canManageRoles, true);
    assert.strictEqual(ownerPerms.canWriteTasks, true);

    // ADMIN peut gérer les membres et projets, mais pas transférer la propriété ni supprimer l'équipe
    assert.strictEqual(adminPerms.canTransferOwnership, false);
    assert.strictEqual(adminPerms.canDeleteTeam, false);
    assert.strictEqual(adminPerms.canManageRoles, true);
    assert.strictEqual(adminPerms.canCreateProject, true);
    assert.strictEqual(adminPerms.canWriteTasks, true);

    // COACH peut gérer les formations et évaluer, mais ne peut pas modifier les tâches ni gérer les membres
    assert.strictEqual(coachPerms.canManageTrainings, true);
    assert.strictEqual(coachPerms.canAssessSkills, true);
    assert.strictEqual(coachPerms.canWriteTasks, false);
    assert.strictEqual(coachPerms.canManageRoles, false);

    // MEMBER peut gérer les tâches mais pas les membres ni les formations
    assert.strictEqual(memberPerms.canWriteTasks, true);
    assert.strictEqual(memberPerms.canManageRoles, false);
    assert.strictEqual(memberPerms.canCreateProject, false);

    // VIEWER est en lecture seule stricte
    assert.strictEqual(viewerPerms.canWriteTasks, false);
    assert.strictEqual(viewerPerms.canPostMessages, false);
    assert.strictEqual(viewerPerms.canManageRoles, false);
  });

  it('rôles assignables selon le rôle de l’acteur', () => {
    assert.deepStrictEqual(getAssignableRoles('OWNER'), ['ADMIN', 'COACH', 'MEMBER', 'VIEWER']);
    assert.deepStrictEqual(getAssignableRoles('ADMIN'), ['COACH', 'MEMBER', 'VIEWER']);
    assert.deepStrictEqual(getAssignableRoles('MEMBER'), []);
  });

  it('OWNER peut promouvoir un MEMBER en ADMIN et rétrograder un ADMIN en MEMBER', () => {
    const promoteCheck = canChangeMemberRole({
      actorId: 'u-owner',
      actorRole: 'OWNER',
      targetId: 'u-member',
      targetRole: 'MEMBER',
      newRole: 'ADMIN',
      teamOwnerId: 'u-owner',
    });
    assert.strictEqual(promoteCheck.allowed, true);

    const demoteCheck = canChangeMemberRole({
      actorId: 'u-owner',
      actorRole: 'OWNER',
      targetId: 'u-admin',
      targetRole: 'ADMIN',
      newRole: 'MEMBER',
      teamOwnerId: 'u-owner',
    });
    assert.strictEqual(demoteCheck.allowed, true);
  });

  it('ADMIN peut changer le rôle d’un MEMBER en COACH ou VIEWER, mais ne peut pas toucher un ADMIN ni promouvoir en ADMIN', () => {
    const allowedChange = canChangeMemberRole({
      actorId: 'u-admin',
      actorRole: 'ADMIN',
      targetId: 'u-member',
      targetRole: 'MEMBER',
      newRole: 'COACH',
      teamOwnerId: 'u-owner',
    });
    assert.strictEqual(allowedChange.allowed, true);

    const forbiddenTargetAdmin = canChangeMemberRole({
      actorId: 'u-admin',
      actorRole: 'ADMIN',
      targetId: 'u-admin-2',
      targetRole: 'ADMIN',
      newRole: 'MEMBER',
      teamOwnerId: 'u-owner',
    });
    assert.strictEqual(forbiddenTargetAdmin.allowed, false);

    const forbiddenPromoteToAdmin = canChangeMemberRole({
      actorId: 'u-admin',
      actorRole: 'ADMIN',
      targetId: 'u-member',
      targetRole: 'MEMBER',
      newRole: 'ADMIN',
      teamOwnerId: 'u-owner',
    });
    assert.strictEqual(forbiddenPromoteToAdmin.allowed, false);
  });

  it('personne ne peut modifier directement le rôle du OWNER sans transfert de propriété', () => {
    const res = canChangeMemberRole({
      actorId: 'u-owner',
      actorRole: 'OWNER',
      targetId: 'u-owner',
      targetRole: 'OWNER',
      newRole: 'ADMIN',
      teamOwnerId: 'u-owner',
    });
    assert.strictEqual(res.allowed, false);
  });

  it('applyRoleChange met à jour le rôle dans la liste des membres si autorisé', () => {
    const result = applyRoleChange(baseMembers, {
      actorId: 'u-owner',
      targetId: 'u-member',
      newRole: 'ADMIN',
      team: baseTeam,
    });
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.members.find((m) => m.userId === 'u-member')?.role, 'ADMIN');
  });

  it('suppression de membre : OWNER peut retirer ADMIN/MEMBER, ADMIN peut retirer MEMBER mais pas ADMIN ni OWNER', () => {
    assert.strictEqual(
      canRemoveTeamMember({
        actorId: 'u-owner',
        actorRole: 'OWNER',
        targetId: 'u-admin',
        targetRole: 'ADMIN',
        teamOwnerId: 'u-owner',
      }).allowed,
      true
    );

    assert.strictEqual(
      canRemoveTeamMember({
        actorId: 'u-admin',
        actorRole: 'ADMIN',
        targetId: 'u-member',
        targetRole: 'MEMBER',
        teamOwnerId: 'u-owner',
      }).allowed,
      true
    );

    assert.strictEqual(
      canRemoveTeamMember({
        actorId: 'u-admin',
        actorRole: 'ADMIN',
        targetId: 'u-owner',
        targetRole: 'OWNER',
        teamOwnerId: 'u-owner',
      }).allowed,
      false
    );

    // Un membre non-owner peut quitter l'équipe lui-même
    assert.strictEqual(
      canRemoveTeamMember({
        actorId: 'u-member',
        actorRole: 'MEMBER',
        targetId: 'u-member',
        targetRole: 'MEMBER',
        teamOwnerId: 'u-owner',
      }).allowed,
      true
    );

    // Le OWNER ne peut pas quitter/se supprimer sans transférer la propriété
    assert.strictEqual(
      canRemoveTeamMember({
        actorId: 'u-owner',
        actorRole: 'OWNER',
        targetId: 'u-owner',
        targetRole: 'OWNER',
        teamOwnerId: 'u-owner',
      }).allowed,
      false
    );

    const removeRes = applyRemoveMember(baseMembers, {
      actorId: 'u-admin',
      targetId: 'u-viewer',
      team: baseTeam,
    });
    assert.strictEqual(removeRes.ok, true);
    assert.strictEqual(removeRes.members.some((m) => m.userId === 'u-viewer'), false);
  });

  it('transferTeamOwnership transfère le rôle OWNER au nouveau propriétaire et passe l’ancien OWNER en ADMIN', () => {
    const transferRes = transferTeamOwnership(baseTeam, baseMembers, {
      actorId: 'u-owner',
      newOwnerId: 'u-admin',
    });

    assert.strictEqual(transferRes.ok, true);
    assert.strictEqual(transferRes.team.ownerId, 'u-admin');
    assert.strictEqual(transferRes.members.find((m) => m.userId === 'u-admin')?.role, 'OWNER');
    assert.strictEqual(transferRes.members.find((m) => m.userId === 'u-owner')?.role, 'ADMIN');

    // Un non-owner ne peut pas transférer la propriété
    const forbiddenTransfer = transferTeamOwnership(baseTeam, baseMembers, {
      actorId: 'u-admin',
      newOwnerId: 'u-member',
    });
    assert.strictEqual(forbiddenTransfer.ok, false);
  });

  it('createTeamWithOwner crée une nouvelle équipe avec son créateur en tant que OWNER et un projet initial', () => {
    const created = createTeamWithOwner({
      name: 'Groupe IA & Robotique',
      description: 'Projet de fin de semestre',
      owner: ownerUser,
      existingTeams: [baseTeam],
    });

    assert.strictEqual(created.team.name, 'Groupe IA & Robotique');
    assert.strictEqual(created.team.ownerId, ownerUser.id);
    assert.ok(created.team.inviteToken.startsWith('STUDY-'));
    assert.strictEqual(created.membership.userId, ownerUser.id);
    assert.strictEqual(created.membership.role, 'OWNER');
    assert.strictEqual(created.defaultProject.teamId, created.team.id);
    assert.strictEqual(created.defaultColumns.length, 4);
    assert.strictEqual(created.defaultColumns[3].isDone, true);
  });

  it('joinTeamWithToken permet à un utilisateur de rejoindre une équipe existante en tant que MEMBER via son code d’invitation', () => {
    const newUser: User = {
      id: 'u-new',
      name: 'Nadia Benali',
      email: 'nadia@univ.fr',
      avatar: '',
      role: 'MEMBER',
      joinedAt: '2026-11-07T10:00:00Z',
    };

    // Code invalide
    const invalidJoin = joinTeamWithToken({
      token: 'INVALID-CODE',
      user: newUser,
      teams: [baseTeam],
      members: baseMembers,
    });
    assert.strictEqual(invalidJoin.ok, false);

    // Code valide (insensible à la casse et aux espaces)
    const validJoin = joinTeamWithToken({
      token: '  study-alph-2026 ',
      user: newUser,
      teams: [baseTeam],
      members: baseMembers,
    });
    assert.strictEqual(validJoin.ok, true);
    assert.strictEqual(validJoin.alreadyMember, false);
    assert.strictEqual(validJoin.team?.id, 'team-1');
    assert.strictEqual(validJoin.membership?.userId, 'u-new');
    assert.strictEqual(validJoin.membership?.role, 'MEMBER');

    // Déjà membre
    const duplicateJoin = joinTeamWithToken({
      token: 'STUDY-ALPH-2026',
      user: ownerUser,
      teams: [baseTeam],
      members: baseMembers,
    });
    assert.strictEqual(duplicateJoin.ok, true);
    assert.strictEqual(duplicateJoin.alreadyMember, true);
    assert.strictEqual(duplicateJoin.membership?.role, 'OWNER');
  });

  it('generateInviteToken génère un jeton au format STUDY-XXXX-2026', () => {
    const token = generateInviteToken();
    assert.match(token, /^STUDY-[A-Z0-9]{4,6}-2026$/);
  });

  it('Service Worker (public/sw.js) ne doit jamais mettre en cache les routes /api/ (notamment /api/auth/me)', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const swContent = fs.readFileSync(path.join(process.cwd(), 'public', 'sw.js'), 'utf-8');
    assert.ok(
      swContent.includes("'/api/'") || swContent.includes('"/api/"'),
      'Le Service Worker doit exclure explicitement les routes /api/ du cache pour éviter de renvoyer un ancien compte (ex: Karim Belkacem) après une nouvelle inscription'
    );
    assert.ok(
      swContent.includes('self.location.origin'),
      'Le Service Worker ne doit pas mettre en cache les sondes réseau externes (cross-origin)'
    );
  });

  it('PwaProvider détecte activement la coupure Wi-Fi via sonde réseau réelle et permet la bascule hors-ligne', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const pwaContent = fs.readFileSync(
      path.join(process.cwd(), 'src', 'components', 'pwa', 'PwaProvider.tsx'),
      'utf-8'
    );
    assert.ok(
      pwaContent.includes('generate_204') && pwaContent.includes('toggleOfflineMode'),
      'PwaProvider doit vérifier la connectivité Internet réelle (quand le Wi-Fi est coupé sous Windows/localhost) et exposer toggleOfflineMode'
    );
  });

  it('Module 6 (Fichiers & Documents) : validation taille/quota/extensions, versioning v1->v2 et permissions RBAC', async () => {
    const {
      validateFileUpload,
      appendOrVersionFile,
      canDeleteFile,
      getFileCategory,
    } = await import('../src/lib/file-manager');

    // 1. Refus d'un fichier exécutable dangereux
    const forbiddenRes = validateFileUpload({
      fileName: 'malware.exe',
      fileSize: 1024,
      currentTotalBytes: 0,
      userRole: 'MEMBER',
    });
    assert.strictEqual(forbiddenRes.valid, false);
    assert.strictEqual(forbiddenRes.code, 'FORBIDDEN_EXTENSION');

    // 2. Refus pour un VIEWER (lecture seule)
    const viewerRes = validateFileUpload({
      fileName: 'notes.pdf',
      fileSize: 1024,
      currentTotalBytes: 0,
      userRole: 'VIEWER',
    });
    assert.strictEqual(viewerRes.valid, false);
    assert.strictEqual(viewerRes.code, 'FORBIDDEN_ROLE');

    // 3. Refus au-delà de 20 Mo par fichier
    const tooLargeRes = validateFileUpload({
      fileName: 'video-demo.mp4',
      fileSize: 25 * 1024 * 1024,
      currentTotalBytes: 0,
      userRole: 'MEMBER',
    });
    assert.strictEqual(tooLargeRes.valid, false);
    assert.strictEqual(tooLargeRes.code, 'FILE_TOO_LARGE');

    // 4. Versioning automatique : téléverser un fichier portant le même nom dans le même projet incrémente currentVersion (v1 -> v2)
    const existingFiles = [
      {
        id: 'file-1',
        projectId: 'proj-1',
        uploaderId: 'u-owner',
        name: 'architecture.pdf',
        mimeType: 'application/pdf',
        size: 120000,
        currentVersion: 1,
        createdAt: '2026-10-20T10:00:00Z',
      },
    ];

    const versioned = appendOrVersionFile(existingFiles, {
      projectId: 'proj-1',
      uploaderId: 'u-member',
      name: 'architecture.pdf',
      mimeType: 'application/pdf',
      size: 150000,
      note: 'Ajout du diagramme de séquence',
    });

    assert.strictEqual(versioned.isNewVersion, true);
    assert.strictEqual(versioned.files.length, 1);
    assert.strictEqual(versioned.files[0].currentVersion, 2);
    assert.strictEqual(versioned.files[0].versions?.length, 2);

    // 5. Permissions de suppression : OWNER/ADMIN peuvent supprimer tout fichier, MEMBER uniquement les siens, VIEWER aucun
    assert.strictEqual(canDeleteFile(versioned.files[0], 'u-admin', 'ADMIN'), true);
    assert.strictEqual(canDeleteFile(versioned.files[0], 'u-other', 'MEMBER'), false);
    assert.strictEqual(canDeleteFile(versioned.files[0], 'u-owner', 'MEMBER'), true);
    assert.strictEqual(canDeleteFile(versioned.files[0], 'u-owner', 'VIEWER'), false);

    // 6. Catégorisation automatique
    assert.strictEqual(getFileCategory('rapport.pdf', 'application/pdf'), 'document');
    assert.strictEqual(getFileCategory('maquette.png', 'image/png'), 'image');
    assert.strictEqual(getFileCategory('audit.json', 'application/json'), 'code');
  });
});


