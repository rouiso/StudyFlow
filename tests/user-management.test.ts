import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  canChangeMemberRole,
  canRemoveTeamMember,
  getAssignableRoles,
  getRolePermissions,
  hasMinRole,
  transferTeamOwnership,
  applyRoleChange,
  createTeamWithOwner,
  joinTeamWithToken,
  generateInviteToken,
} from '../src/lib/user-management';
import { Team, TeamMember, User } from '../src/types';
import { fallbackKanban, fallbackProfile, normalizePriority, relativeDueDate } from '../src/lib/ai-service';
import { escapeHtml, renderEmail } from '../src/lib/email-service';

describe('StudyFlow role and assistant policies', () => {
  const team: Team = {
    id: 'team-1',
    name: 'Équipe',
    description: '',
    slug: 'equipe',
    ownerId: 'owner',
    inviteToken: 'STUDY-ABCD-2026',
    createdAt: '2026-09-01T08:00:00Z',
  };
  const members: TeamMember[] = [
    { id: 'owner-membership', teamId: team.id, userId: 'owner', role: 'OWNER', joinedAt: team.createdAt },
    { id: 'member-membership', teamId: team.id, userId: 'member', role: 'MEMBER', joinedAt: team.createdAt },
    { id: 'coach-membership', teamId: team.id, userId: 'coach', role: 'COACH', joinedAt: team.createdAt },
  ];

  it('only defines OWNER, MEMBER, and COACH capabilities', () => {
    assert.deepStrictEqual(getAssignableRoles('OWNER'), ['COACH', 'MEMBER']);
    assert.deepStrictEqual(getAssignableRoles('MEMBER'), []);
    assert.strictEqual(hasMinRole('OWNER', 'MEMBER'), true);

    const owner = getRolePermissions('OWNER');
    const member = getRolePermissions('MEMBER');
    const coach = getRolePermissions('COACH');
    assert.strictEqual(owner.canManageRoles, true);
    assert.strictEqual(member.canWriteTasks, true);
    assert.strictEqual(member.canCreateProject, false);
    assert.strictEqual(coach.canWriteTasks, false);
    assert.strictEqual(coach.canManageColumns, false);
    assert.strictEqual(coach.canManageTrainings, true);
  });

  it('requires OWNER for role changes and forbids assigning unsupported roles', () => {
    assert.strictEqual(
      canChangeMemberRole({
        actorId: 'member',
        actorRole: 'MEMBER',
        targetId: 'coach',
        targetRole: 'COACH',
        newRole: 'MEMBER',
        teamOwnerId: 'owner',
      }).allowed,
      false
    );
    assert.strictEqual(
      canChangeMemberRole({
        actorId: 'owner',
        actorRole: 'OWNER',
        targetId: 'member',
        targetRole: 'MEMBER',
        newRole: 'COACH',
        teamOwnerId: 'owner',
      }).allowed,
      true
    );
    assert.strictEqual(
      canChangeMemberRole({
        actorId: 'owner',
        actorRole: 'OWNER',
        targetId: 'member',
        targetRole: 'MEMBER',
        newRole: 'OWNER',
        teamOwnerId: 'owner',
      }).allowed,
      false
    );
  });

  it('prevents coaches from changing project work and protects the team owner', () => {
    assert.strictEqual(
      canRemoveTeamMember({
        actorId: 'coach',
        actorRole: 'COACH',
        targetId: 'member',
        targetRole: 'MEMBER',
        teamOwnerId: 'owner',
      }).allowed,
      false
    );
    assert.strictEqual(
      canRemoveTeamMember({
        actorId: 'owner',
        actorRole: 'OWNER',
        targetId: 'owner',
        targetRole: 'OWNER',
        teamOwnerId: 'owner',
      }).allowed,
      false
    );
  });

  it('transfers ownership without introducing an ADMIN role', () => {
    const result = transferTeamOwnership(team, members, { actorId: 'owner', newOwnerId: 'member' });
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.team.ownerId, 'member');
    assert.strictEqual(result.members.find((member) => member.userId === 'owner')?.role, 'MEMBER');
    assert.deepStrictEqual(result.members.map((member) => member.role).sort(), ['COACH', 'MEMBER', 'OWNER']);
  });

  it('creates teams with an OWNER and lets new members join as MEMBER', () => {
    const owner: User = {
      id: 'owner',
      name: 'Owner',
      email: 'owner@example.test',
      avatar: '',
      role: 'OWNER',
      joinedAt: team.createdAt,
    };
    const created = createTeamWithOwner({ name: 'Équipe de test', owner });
    assert.strictEqual(created.membership.role, 'OWNER');
    assert.strictEqual(created.defaultColumns.length, 4);
    assert.strictEqual(created.defaultColumns[created.defaultColumns.length - 1].isDone, true);

    const member: User = { ...owner, id: 'new-member', role: 'MEMBER' };
    const joined = joinTeamWithToken({
      token: team.inviteToken,
      user: member,
      teams: [team],
      members,
    });
    assert.strictEqual(joined.ok, true);
    assert.strictEqual(joined.membership?.role, 'MEMBER');
    assert.match(generateInviteToken(), /^STUDY-[A-Z0-9]{4}-2026$/);
  });

  it('applies allowed role updates without permitting self-promotion', () => {
    const result = applyRoleChange(members, {
      actorId: 'owner',
      targetId: 'member',
      newRole: 'COACH',
      team,
    });
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.members.find((member) => member.userId === 'member')?.role, 'COACH');
    assert.strictEqual(
      applyRoleChange(members, { actorId: 'member', targetId: 'member', newRole: 'COACH', team }).ok,
      false
    );
  });

  it('normalizes generated values and calculates dates from server time', () => {
    assert.strictEqual(normalizePriority('INVALID'), 'NORMALE');
    assert.strictEqual(relativeDueDate(2, new Date('2026-01-01T00:00:00.000Z')), '2026-01-03');
    const generated = fallbackKanban('Préparer une soutenance');
    assert.ok(generated.columns.length >= 2 && generated.columns.length <= 6);
    assert.ok(generated.tasks.length >= 3 && generated.tasks.length <= 10);
    const profile = fallbackProfile('Parcours étudiant en TypeScript, React et gestion de projet.');
    assert.ok(profile.bio.length >= 220 && profile.bio.length <= 240);
    assert.ok(profile.skills.every((skill) => Number.isInteger(skill.level) && skill.level >= 1 && skill.level <= 5));
  });

  it('escapes user content in both email formats', () => {
    const input = '<script>alert("x")</script>';
    assert.strictEqual(escapeHtml(input), '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
    const rendered = renderEmail('welcome', { message: input });
    assert.ok(!rendered.html.includes('<script>'));
    assert.ok(rendered.text.includes(input));
  });

  it('keeps file upload and deletion permissions aligned with COACH restrictions', async () => {
    const { validateFileUpload, canDeleteFile } = await import('../src/lib/file-manager');
    assert.strictEqual(
      validateFileUpload({ fileName: 'notes.pdf', fileSize: 10, currentTotalBytes: 0, userRole: 'COACH' }).valid,
      false
    );
    const file = {
      id: 'file-1',
      projectId: 'project-1',
      uploaderId: 'member',
      name: 'notes.pdf',
      mimeType: 'application/pdf',
      size: 10,
      createdAt: team.createdAt,
    };
    assert.strictEqual(canDeleteFile(file, 'coach', 'COACH'), false);
    assert.strictEqual(canDeleteFile(file, 'member', 'MEMBER'), true);
    assert.strictEqual(canDeleteFile(file, 'owner', 'OWNER'), true);
  });

  it('preserves Kanban column reordering and task migration behavior', async () => {
    const { reorderProjectColumns, deleteProjectColumn } = await import('../src/lib/kanban-columns');
    const columns = [
      { id: 'todo', projectId: 'p1', name: 'À faire', position: 1000, isDone: false },
      { id: 'doing', projectId: 'p1', name: 'En cours', position: 2000, isDone: false },
      { id: 'done', projectId: 'p1', name: 'Terminé', position: 3000, isDone: true },
    ];
    const task = {
      id: 't1',
      projectId: 'p1',
      columnId: 'doing',
      title: 'Tâche',
      description: '',
      position: 1000,
      priority: 'NORMALE' as const,
      dueDate: '',
      createdById: 'member',
      createdAt: team.createdAt,
      assigneeIds: [],
      labelIds: [],
    };
    const reordered = reorderProjectColumns(columns, 'p1', 'done', 'doing');
    assert.deepStrictEqual(
      reordered.sort((left, right) => left.position - right.position).map((column) => column.id),
      ['todo', 'done', 'doing']
    );
    const removed = deleteProjectColumn(columns, [task], 'p1', 'doing');
    assert.strictEqual(removed.ok, true);
    assert.strictEqual(removed.tasks[0].columnId, 'todo');
  });

  it('excludes API routes from service-worker caching', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const sw = fs.readFileSync(path.join(process.cwd(), 'public', 'sw.js'), 'utf8');
    assert.ok(sw.includes("'/api/'") || sw.includes('"/api/"'));
  });
});
