import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Amorçage de la base de données StudyFlow...');

  // Nettoyage préalable
  await prisma.feedback.deleteMany();
  await prisma.skillLevel.deleteMany();
  await prisma.coachingGoal.deleteMany();
  await prisma.coachingSession.deleteMany();
  await prisma.trainingResource.deleteMany();
  await prisma.trainingEnrollment.deleteMany();
  await prisma.training.deleteMany();
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
      { teamId: team.id, userId: u5.id, role: 'COACH' },
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

  // ==========================================
  // MODULE 7 : Formations & Coaching (v1.1)
  // ==========================================
  // 3 formations (dont 1 complète)
  const tr1 = await prisma.training.create({
    data: {
      id: 'tr-1',
      teamId: team.id,
      title: 'Introduction à Prisma & Bases Relationnelles',
      description: 'Modélisation relationnelle, migrations, contraintes d’intégrité et transactions concurrentes.',
      skill: 'Prisma & BDD',
      level: 'BEGINNER',
      trainerId: u5.id,
      startsAt: new Date('2026-11-10T14:00:00Z'),
      endsAt: new Date('2026-11-10T16:00:00Z'),
      capacity: 4,
      mode: 'ONLINE',
      meetingUrl: 'https://meet.jit.si/studyflow-prisma',
      status: 'PUBLISHED',
    },
  });

  const tr2 = await prisma.training.create({
    data: {
      id: 'tr-2',
      teamId: team.id,
      title: 'Architecture Next.js App Router & Server Actions',
      description: 'Pattern de composants serveurs, mutations sécurisées avec Zod et gestion optimiste du cache.',
      skill: 'Next.js 15',
      level: 'INTERMEDIATE',
      trainerId: u5.id,
      startsAt: new Date('2026-11-14T10:00:00Z'),
      endsAt: new Date('2026-11-14T12:00:00Z'),
      capacity: 8,
      mode: 'ONLINE',
      meetingUrl: 'https://meet.jit.si/studyflow-nextjs',
      status: 'PUBLISHED',
    },
  });

  const tr3 = await prisma.training.create({
    data: {
      id: 'tr-3',
      teamId: team.id,
      title: 'Atelier Pratique : Service Workers & Cache PWA',
      description: 'Mise en œuvre concrète des stratégies Network First et Stale While Revalidate sur mobile.',
      skill: 'PWA & Mobile',
      level: 'ADVANCED',
      trainerId: u2.id,
      startsAt: new Date('2026-11-18T15:00:00Z'),
      endsAt: new Date('2026-11-18T17:00:00Z'),
      capacity: 6,
      mode: 'ONSITE',
      location: 'Salle TP 304 - Bâtiment Informatique',
      status: 'PUBLISHED',
    },
  });

  // Inscriptions (tr1 est complète : 4 inscrits pour 4 places)
  await prisma.trainingEnrollment.createMany({
    data: [
      { trainingId: tr1.id, userId: u1.id, status: 'ENROLLED', attended: true },
      { trainingId: tr1.id, userId: u2.id, status: 'ENROLLED', attended: true },
      { trainingId: tr1.id, userId: u3.id, status: 'ENROLLED', attended: true },
      { trainingId: tr1.id, userId: u4.id, status: 'ENROLLED', attended: false },
      { trainingId: tr2.id, userId: u2.id, status: 'ENROLLED', attended: false },
      { trainingId: tr2.id, userId: u3.id, status: 'ENROLLED', attended: false },
      { trainingId: tr3.id, userId: u1.id, status: 'ENROLLED', attended: false },
      { trainingId: tr3.id, userId: u4.id, status: 'ENROLLED', attended: false },
    ],
  });

  // 4 séances de coaching à des états différents
  await prisma.coachingSession.createMany({
    data: [
      {
        id: 'cs-1',
        teamId: team.id,
        projectId: project.id,
        coachId: u5.id,
        coacheeId: u2.id,
        topic: 'Revue architecture de persistance et cache offline',
        proposedSlots: JSON.stringify(['2026-11-05T14:00:00Z']),
        scheduledAt: new Date('2026-11-05T14:00:00Z'),
        durationMin: 45,
        mode: 'ONLINE',
        meetingUrl: 'https://meet.jit.si/coaching-karim-dupont',
        status: 'DONE',
        sharedReport: 'Validation du découpage par modules. Karim maîtrise les stratégies de mise en cache Service Worker.',
        privateNotes: 'Karim est très autonome et moteur dans le groupe.',
      },
      {
        id: 'cs-2',
        teamId: team.id,
        projectId: project.id,
        coachId: u5.id,
        coacheeId: u3.id,
        topic: 'Résolution des conflits Prisma et gestion des clés composites',
        proposedSlots: JSON.stringify(['2026-11-12T11:00:00Z', '2026-11-12T15:00:00Z']),
        scheduledAt: new Date('2026-11-12T11:00:00Z'),
        durationMin: 30,
        mode: 'ONLINE',
        meetingUrl: 'https://meet.jit.si/coaching-sami-dupont',
        status: 'CONFIRMED',
        sharedReport: 'Point technique calé pour valider les relations n-à-n du module 3.',
        privateNotes: 'Rassurer Sami sur la syntaxe des jointures Prisma.',
      },
      {
        id: 'cs-3',
        teamId: team.id,
        projectId: project.id,
        coachId: u5.id,
        coacheeId: u4.id,
        topic: 'Audit accessibilité WCAG AA et fluidité tactile mobile',
        proposedSlots: JSON.stringify(['2026-11-15T09:30:00Z', '2026-11-16T14:00:00Z']),
        durationMin: 45,
        mode: 'ONLINE',
        status: 'REQUESTED',
      },
      {
        id: 'cs-4',
        teamId: team.id,
        projectId: project.id,
        coachId: u5.id,
        coacheeId: u1.id,
        topic: 'Cadrage de soutenance et répartition d’équipe',
        proposedSlots: JSON.stringify(['2026-11-08T16:00:00Z']),
        scheduledAt: new Date('2026-11-09T10:00:00Z'),
        durationMin: 60,
        mode: 'ONSITE',
        meetingUrl: null,
        status: 'RESCHEDULED',
        sharedReport: 'Créneau décalé pour s’adapter aux disponibilités des 7 membres.',
        privateNotes: 'Léa fait preuve d’un excellent leadership d’équipe.',
      },
    ],
  });

  // Objectifs de coaching
  await prisma.coachingGoal.createMany({
    data: [
      {
        id: 'cg-1',
        userId: u2.id,
        teamId: team.id,
        coachId: u5.id,
        title: 'Maîtriser les Service Workers et le cache PWA offline',
        skill: 'PWA & Mobile',
        targetDate: new Date('2026-11-20'),
        progress: 85,
        status: 'OPEN',
      },
      {
        id: 'cg-2',
        userId: u3.id,
        teamId: team.id,
        coachId: u5.id,
        title: 'Concevoir des schémas relationnels sans anomalie de mise à jour',
        skill: 'Prisma & BDD',
        targetDate: new Date('2026-11-25'),
        progress: 50,
        status: 'OPEN',
      },
    ],
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
