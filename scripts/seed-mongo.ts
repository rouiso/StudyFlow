import { prisma, $disconnect } from '../src/lib/prisma';

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

  const users = [
    { id: 'user-1', name: 'Léa Martin', email: 'lea.martin@univ-etudiant.fr', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150' },
    { id: 'user-2', name: 'Karim Belkacem', email: 'karim.belkacem@univ-etudiant.fr', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150' },
    { id: 'user-3', name: 'Sami Youssef', email: 'sami.youssef@univ-etudiant.fr', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150' },
    { id: 'user-4', name: 'Chloé Dubois', email: 'chloe.dubois@univ-etudiant.fr', image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150' },
    { id: 'user-5', name: 'Mme Dupont', email: 'helene.dupont@univ-prof.fr', image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150' },
  ];
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
          { id: 'tm-2', userId: 'user-2', role: 'ADMIN' },
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
          endDate: new Date('2026-11-15'),
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
