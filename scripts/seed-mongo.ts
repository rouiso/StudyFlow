import { prisma, $disconnect } from '../src/lib/prisma';
import { DEMO_USERS, FUTURE_DEMO_MILESTONES, FUTURE_DEMO_TASKS } from '../src/lib/demo-data';

async function main() {
  const modelNames = [
    'feedback', 'skillLevel', 'coachingGoal', 'coachingSession', 'trainingResource',
    'trainingEnrollment', 'training', 'activity', 'report', 'projectSnapshot',
    'fileVersion', 'file', 'folder', 'notification', 'message', 'channel',
    'calendarToken', 'reminder', 'milestone', 'taskAssignee', 'taskLabel',
    'subtask', 'task', 'label', 'column', 'project', 'teamMember', 'team', 'user',
  ];

  for (const modelName of modelNames) {
    await (prisma as any)[modelName].deleteMany();
  }

  const users = DEMO_USERS.map(({ id, name, email }) => ({ id, name, email, image: '' }));
  await prisma.user.createMany({ data: users });

  await prisma.team.create({
    data: {
      id: 'team-1',
      name: 'Équipe Projet Web S5',
      description: 'Groupe de développement StudyFlow',
      slug: 'projet-web-s5',
      ownerId: 'user-1',
      inviteToken: 'STUDY-S5-2026',
      members: {
        create: [
          { id: 'tm-1', userId: 'user-1', role: 'OWNER' },
          { id: 'tm-2', userId: 'user-2', role: 'MEMBER' },
          { id: 'tm-3', userId: 'user-3', role: 'MEMBER' },
          { id: 'tm-4', userId: 'user-4', role: 'MEMBER' },
          { id: 'tm-5', userId: 'user-5', role: 'COACH' },
        ],
      },
      projects: {
        create: {
          id: 'proj-1',
          name: 'StudyFlow PWA v1.0',
          description: 'Plateforme mobile-first de gestion de projet étudiant.',
          color: '#4f46e5',
          startDate: new Date('2026-10-01'),
          endDate: new Date('2026-12-31'),
          columns: {
            create: [
              { id: 'col-1', name: 'À faire', position: 1000, isDone: false },
              { id: 'col-2', name: 'En cours', position: 2000, wipLimit: 4, isDone: false },
              { id: 'col-3', name: 'En relecture', position: 3000, wipLimit: 3, isDone: false },
              { id: 'col-4', name: 'Terminé', position: 4000, isDone: true },
            ],
          },
        },
      },
    },
  });

  await prisma.task.create({
    data: {
      id: 'task-1',
      projectId: 'proj-1',
      columnId: 'col-2',
      title: 'Navigation Mobile-First & Barre Basse',
      description: 'Implémenter une barre de navigation inférieure tactile.',
      position: 1000,
      priority: 'HAUTE',
      dueDate: new Date('2026-10-29'),
      createdById: 'user-1',
      subtasks: {
        create: [
          { id: 'st-1', title: 'Bottom Navigation Bar tactile', done: true, position: 1 },
          { id: 'st-2', title: 'Tester sur mobile', done: false, position: 2 },
        ],
      },
      assignees: { create: [{ userId: 'user-4' }] },
    },
  });

  for (const task of FUTURE_DEMO_TASKS) {
    const { assigneeIds, labelIds, dueDate, createdAt, ...taskData } = task;
    await prisma.task.create({
      data: {
        ...taskData,
        dueDate: new Date(`${dueDate}T12:00:00.000Z`),
        createdAt: new Date(createdAt),
        assignees: { create: assigneeIds.map((userId) => ({ userId })) },
        labels: { create: labelIds.map((labelId) => ({ labelId })) },
      },
    });
  }
  await prisma.milestone.createMany({
    data: FUTURE_DEMO_MILESTONES.map((milestone) => ({
      ...milestone,
      date: new Date(`${milestone.date}T12:00:00.000Z`),
    })),
  });

  await prisma.channel.create({
    data: { id: 'chan-1', teamId: 'team-1', projectId: 'proj-1', name: 'Général', type: 'PROJECT' },
  });
  await prisma.message.create({
    data: {
      channelId: 'chan-1',
      authorId: 'user-1',
      content: 'Bienvenue sur StudyFlow. La base MongoDB est active.',
    },
  });

  console.log('Base MongoDB StudyFlow initialisée.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally($disconnect);
