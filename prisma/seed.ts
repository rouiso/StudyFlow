import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Amorçage de la base de données StudyFlow...');

  // Nettoyage préalable
  await prisma.activity.deleteMany();
  await prisma.report.deleteMany();
  await prisma.projectSnapshot.deleteMany();
  await prisma.fileVersion.deleteMany();
  await prisma.file.deleteMany();
  await prisma.folder.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.message.deleteMany();
  await prisma.channel.deleteMany();
  await prisma.calendarToken.deleteMany();
  await prisma.reminder.deleteMany();
  await prisma.milestone.deleteMany();
  await prisma.taskAssignee.deleteMany();
  await prisma.taskLabel.deleteMany();
  await prisma.subtask.deleteMany();
  await prisma.task.deleteMany();
  await prisma.label.deleteMany();
  await prisma.column.deleteMany();
  await prisma.project.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.team.deleteMany();
  await prisma.user.deleteMany();

  // 1. Création des 5 utilisateurs (Persona du cahier des charges)
  const u1 = await prisma.user.create({
    data: {
      id: 'user-1',
      name: 'Léa Martin',
      email: 'lea.martin@univ-etudiant.fr',
      image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    },
  });

  const u2 = await prisma.user.create({
    data: {
      id: 'user-2',
      name: 'Karim Belkacem',
      email: 'karim.belkacem@univ-etudiant.fr',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    },
  });

  const u3 = await prisma.user.create({
    data: {
      id: 'user-3',
      name: 'Sami Youssef',
      email: 'sami.youssef@univ-etudiant.fr',
      image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    },
  });

  const u4 = await prisma.user.create({
    data: {
      id: 'user-4',
      name: 'Chloé Dubois',
      email: 'chloe.dubois@univ-etudiant.fr',
      image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    },
  });

  const u5 = await prisma.user.create({
    data: {
      id: 'user-5',
      name: 'Mme Dupont',
      email: 'helene.dupont@univ-prof.fr',
      image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    },
  });

  // 2. Création de l'Équipe
  const team = await prisma.team.create({
    data: {
      id: 'team-1',
      name: 'Équipe Projet Web S5',
      description: 'Groupe de développement StudyFlow pour le module Modern Mobile Application',
      slug: 'projet-web-s5',
      ownerId: u1.id,
      inviteToken: 'STUDY-S5-2026',
    },
  });

  // 3. Adhésion des membres avec rôles
  await prisma.teamMember.createMany({
    data: [
      { teamId: team.id, userId: u1.id, role: 'OWNER' },
      { teamId: team.id, userId: u2.id, role: 'ADMIN' },
      { teamId: team.id, userId: u3.id, role: 'MEMBER' },
      { teamId: team.id, userId: u4.id, role: 'MEMBER' },
      { teamId: team.id, userId: u5.id, role: 'VIEWER' },
    ],
  });

  // 4. Création des Projets
  const project = await prisma.project.create({
    data: {
      id: 'proj-1',
      teamId: team.id,
      name: 'StudyFlow PWA v1.0',
      description: 'Plateforme mobile-first de gestion de projet étudiant avec mode hors-ligne et assistant IA.',
      color: '#4f46e5',
      startDate: new Date('2026-10-01'),
      endDate: new Date('2026-11-15'),
    },
  });

  // 5. Colonnes Kanban
  const col1 = await prisma.column.create({
    data: { id: 'col-1', projectId: project.id, name: 'À faire', position: 1000.0, isDone: false },
  });
  const col2 = await prisma.column.create({
    data: { id: 'col-2', projectId: project.id, name: 'En cours', position: 2000.0, wipLimit: 4, isDone: false },
  });
  const col3 = await prisma.column.create({
    data: { id: 'col-3', projectId: project.id, name: 'En relecture', position: 3000.0, wipLimit: 3, isDone: false },
  });
  const col4 = await prisma.column.create({
    data: { id: 'col-4', projectId: project.id, name: 'Terminé', position: 4000.0, isDone: true },
  });

  // 6. Étiquettes
  const lbl1 = await prisma.label.create({
    data: { id: 'lbl-1', projectId: project.id, name: 'PWA / Mobile', color: '#6366f1' },
  });
  const lbl2 = await prisma.label.create({
    data: { id: 'lbl-2', projectId: project.id, name: 'Backend & CRUD', color: '#10b981' },
  });
  const lbl3 = await prisma.label.create({
    data: { id: 'lbl-3', projectId: project.id, name: 'IA Bonus', color: '#ec4899' },
  });

  // 7. Tâches
  const t1 = await prisma.task.create({
    data: {
      id: 'task-1',
      projectId: project.id,
      columnId: col4.id,
      title: 'Configuration Manifest PWA & Standalone mode',
      description: 'Créer le fichier manifest.json complet avec icônes haute résolution et shortcuts.',
      position: 1000.0,
      priority: 'HAUTE',
      dueDate: new Date('2026-10-25'),
      createdById: u1.id,
      completedAt: new Date('2026-10-25T16:00:00Z'),
    },
  });

  const t2 = await prisma.task.create({
    data: {
      id: 'task-2',
      projectId: project.id,
      columnId: col4.id,
      title: 'Mise en place du Service Worker & Cache Offline',
      description: 'Garantir le fonctionnement sans réseau via Cache API.',
      position: 2000.0,
      priority: 'URGENTE',
      dueDate: new Date('2026-10-26'),
      createdById: u1.id,
      completedAt: new Date('2026-10-26T17:30:00Z'),
    },
  });

  const t3 = await prisma.task.create({
    data: {
      id: 'task-3',
      projectId: project.id,
      columnId: col2.id,
      title: 'Navigation Mobile-First & Barre Basse',
      description: 'Implémenter une barre de navigation inférieure tactile et réactive.',
      position: 1000.0,
      priority: 'HAUTE',
      dueDate: new Date('2026-10-29'),
      createdById: u1.id,
    },
  });

  const t4 = await prisma.task.create({
    data: {
      id: 'task-4',
      projectId: project.id,
      columnId: col2.id,
      title: 'Opérations CRUD complètes sur les tâches & Kanban',
      description: 'Ajouter, éditer, déplacer, archiver les tâches avec gestion des sous-tâches.',
      position: 2000.0,
      priority: 'URGENTE',
      dueDate: new Date('2026-10-30'),
      createdById: u1.id,
    },
  });

  // Sous-tâches
  await prisma.subtask.createMany({
    data: [
      { taskId: t1.id, title: 'Définir manifest.json conforme W3C', done: true, position: 1 },
      { taskId: t1.id, title: 'Générer icônes 192x192 et 512x512', done: true, position: 2 },
      { taskId: t2.id, title: 'Écrire sw.js avec mise en cache', done: true, position: 1 },
      { taskId: t2.id, title: 'Tester mode hors ligne', done: true, position: 2 },
      { taskId: t3.id, title: 'Bottom Navigation Bar tactile', done: true, position: 1 },
      { taskId: t4.id, title: 'Formulaire d’édition avec priorités', done: true, position: 1 },
      { taskId: t4.id, title: 'Calcul de la progression des sous-tâches', done: false, position: 2 },
    ],
  });

  // Assignations
  await prisma.taskAssignee.createMany({
    data: [
      { taskId: t1.id, userId: u2.id },
      { taskId: t2.id, userId: u3.id },
      { taskId: t3.id, userId: u4.id },
      { taskId: t4.id, userId: u1.id },
    ],
  });

  // Jalons
  await prisma.milestone.create({
    data: {
      id: 'mile-1',
      projectId: project.id,
      title: 'Validation Notée Modern Mobile App (PWA)',
      date: new Date('2026-11-03'),
      description: 'Démonstration devant le professeur : PWA installable, offline, CRUD, bonus IA.',
    },
  });

  // Canal et messages
  const channel = await prisma.channel.create({
    data: {
      id: 'chan-1',
      teamId: team.id,
      projectId: project.id,
      name: 'Général',
      type: 'PROJECT',
    },
  });

  await prisma.message.create({
    data: {
      channelId: channel.id,
      authorId: u1.id,
      content: 'Bonjour à tous ! Bienvenue sur StudyFlow. Les fondations du backend et de la PWA sont prêtes.',
    },
  });

  console.log('✅ Base de données initialisée avec succès !');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
