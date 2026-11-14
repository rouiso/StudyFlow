import '../core/models/studyflow_models.dart';

/// Jeu de données local utilisé lorsque le service distant est hors ligne.
class StudyFlowSeedData {
  static const users = <AppUser>[
    AppUser(
      id: 'user-1',
      name: 'Léa Martin',
      email: 'lea.martin@univ-etudiant.fr',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      role: UserRole.owner,
    ),
    AppUser(
      id: 'user-2',
      name: 'Karim Belkacem',
      email: 'karim.belkacem@univ-etudiant.fr',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      role: UserRole.admin,
    ),
    AppUser(
      id: 'user-3',
      name: 'Sami Youssef',
      email: 'sami.youssef@univ-etudiant.fr',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      role: UserRole.member,
    ),
    AppUser(
      id: 'user-5',
      name: 'Mme Dupont',
      email: 'helene.dupont@univ-prof.fr',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
      role: UserRole.coach,
    ),
  ];

  static const projects = <ProjectItem>[
    ProjectItem(
      id: 'proj-1',
      teamId: 'team-1',
      name: 'Application de réservation',
      description: 'Projet S5 — Plateforme de réservation universitaire & Mobile Flutter',
      color: '#4F46E5',
    ),
  ];

  static const columns = <KanbanColumnItem>[
    KanbanColumnItem(id: 'col-1', projectId: 'proj-1', name: 'À faire', position: 1000),
    KanbanColumnItem(id: 'col-2', projectId: 'proj-1', name: 'En cours', position: 2000, wipLimit: 3),
    KanbanColumnItem(id: 'col-3', projectId: 'proj-1', name: 'En relecture', position: 3000),
    KanbanColumnItem(id: 'col-4', projectId: 'proj-1', name: 'Terminé', position: 4000, isDone: true),
  ];

  static List<TaskItem> initialTasks() => [
        TaskItem(
          id: 'task-1',
          projectId: 'proj-1',
          columnId: 'col-4',
          title: 'Initialiser la base de données & les services',
          description: 'Modèles métier, rôles d\'équipe et jeu de données initial.',
          position: 1000,
          priority: TaskPriority.haute,
          dueDate: DateTime.now().subtract(const Duration(days: 1)),
          createdById: 'user-1',
          completedAt: DateTime.now(),
          assigneeIds: const ['user-1', 'user-2'],
        ),
        TaskItem(
          id: 'task-2',
          projectId: 'proj-1',
          columnId: 'col-2',
          title: 'Développer le tableau Kanban collaboratif',
          description: 'Support du glisser/déplacement, filtre Mes tâches et droits Coach.',
          position: 2000,
          priority: TaskPriority.urgente,
          dueDate: DateTime.now().add(const Duration(days: 2)),
          createdById: 'user-2',
          assigneeIds: const ['user-2'],
        ),
        TaskItem(
          id: 'task-3',
          projectId: 'proj-1',
          columnId: 'col-1',
          title: 'Intégrer l\'espace Formations & Coaching',
          description: 'Capacité maximale des formations et notes privées du coach.',
          position: 3000,
          priority: TaskPriority.normale,
          dueDate: DateTime.now().add(const Duration(days: 5)),
          createdById: 'user-3',
          assigneeIds: const ['user-3'],
        ),
      ];

  static List<SubtaskItem> initialSubtasks() => const [
        SubtaskItem(id: 'sub-1', taskId: 'task-2', title: 'Créer les colonnes Kanban responsives', done: true, position: 1),
        SubtaskItem(id: 'sub-2', taskId: 'task-2', title: 'Configurer la synchronisation cloud', done: false, position: 2),
        SubtaskItem(id: 'sub-3', taskId: 'task-3', title: 'Vérifier confidentialité des notes Coach', done: false, position: 1),
      ];

  static List<MilestoneItem> initialMilestones() => [
        MilestoneItem(
          id: 'mile-1',
          projectId: 'proj-1',
          title: 'Soutenance Finale StudyFlow',
          date: DateTime.now().add(const Duration(days: 7)),
          description: 'Présentation complète de la plateforme web et mobile StudyFlow.',
        ),
      ];

  static List<ChatMessageItem> initialMessages() => [
        ChatMessageItem(
          id: 'msg-1',
          channelId: 'proj-1',
          authorId: 'user-1',
          content: 'Bienvenue sur l\'espace de travail StudyFlow !',
          createdAt: DateTime.now().subtract(const Duration(hours: 2)),
        ),
        ChatMessageItem(
          id: 'msg-2',
          channelId: 'proj-1',
          authorId: 'user-5',
          content: 'Bonjour l\'équipe, n\'oubliez pas de réserver votre créneau de coaching avant vendredi.',
          createdAt: DateTime.now().subtract(const Duration(minutes: 45)),
        ),
      ];

  static List<FileAssetItem> initialFiles() => [
        FileAssetItem(
          id: 'file-1',
          projectId: 'proj-1',
          uploaderId: 'user-1',
          name: 'StudyFlow-Cahier-des-charges-v2.pdf',
          mimeType: 'application/pdf',
          size: 1434700,
          createdAt: DateTime.now().subtract(const Duration(days: 2)),
        ),
      ];

  static List<TrainingItem> initialTrainings() => [
        TrainingItem(
          id: 'tr-1',
          teamId: 'team-1',
          title: 'Architecture Mobile & Services Cloud',
          description: 'Concevoir une application mobile réactive et connectée en temps réel.',
          skill: 'Mobile / Architecture',
          level: 'INTERMEDIATE',
          trainerId: 'user-5',
          startsAt: DateTime.now().add(const Duration(days: 1, hours: 2)),
          endsAt: DateTime.now().add(const Duration(days: 1, hours: 4)),
          capacity: 2,
          mode: 'ONLINE',
        ),
        TrainingItem(
          id: 'tr-2',
          teamId: 'team-1',
          title: 'Méthodologie Agile & Soutenance',
          description: 'Préparer la revue finale et la présentation du projet StudyFlow.',
          skill: 'Gestion de projet',
          level: 'BEGINNER',
          trainerId: 'user-5',
          startsAt: DateTime.now().add(const Duration(days: 3)),
          endsAt: DateTime.now().add(const Duration(days: 3, hours: 2)),
          capacity: 10,
          mode: 'ONSITE',
          location: 'Salle B204',
        ),
      ];

  static List<TrainingEnrollmentItem> initialEnrollments() => const [
        TrainingEnrollmentItem(id: 'enr-1', trainingId: 'tr-1', userId: 'user-1', status: 'ENROLLED', attended: false),
        TrainingEnrollmentItem(id: 'enr-2', trainingId: 'tr-1', userId: 'user-2', status: 'ENROLLED', attended: false),
      ];

  static List<CoachingSessionItem> initialSessions() => [
        CoachingSessionItem(
          id: 'cs-1',
          coachId: 'user-5',
          coacheeId: 'user-3',
          topic: 'Revue d\'architecture & Sécurité',
          proposedSlots: [DateTime.now().add(const Duration(days: 2)).toIso8601String()],
          scheduledAt: DateTime.now().add(const Duration(days: 2)),
          durationMin: 45,
          mode: 'ONLINE',
          meetingUrl: 'https://meet.jit.si/studyflow-coaching',
          status: 'DONE',
          sharedReport: 'Architecture validée. Penser à verrouiller les notes privées côté serveur et mobile.',
          privateNotes: '[CONFIDENTIEL COACH] Sami maîtrise bien les bases, à encourager sur les tests unitaires.',
        ),
        CoachingSessionItem(
          id: 'cs-2',
          coachId: 'user-5',
          coacheeId: 'user-2',
          topic: 'Optimisation des performances Kanban',
          proposedSlots: [
            DateTime.now().add(const Duration(days: 4)).toIso8601String(),
          ],
          durationMin: 30,
          mode: 'ONLINE',
          status: 'REQUESTED',
        ),
      ];

  static List<CoachingGoalItem> initialGoals() => const [
        CoachingGoalItem(
          id: 'cg-1',
          userId: 'user-3',
          title: 'Maîtriser la gestion d\'état applicative',
          skill: 'Développement Mobile',
          progress: 70,
          status: 'OPEN',
        ),
        CoachingGoalItem(
          id: 'cg-2',
          userId: 'user-2',
          title: 'Finaliser la couverture de tests',
          skill: 'Tests & Qualité',
          progress: 100,
          status: 'ACHIEVED',
        ),
      ];

  static List<SkillLevelItem> initialSkills() => const [
        SkillLevelItem(id: 'sk-1', userId: 'user-1', skill: 'Gestion de projet', level: 5, selfAssessed: false),
        SkillLevelItem(id: 'sk-2', userId: 'user-2', skill: 'Architecture Backend', level: 4, selfAssessed: false),
        SkillLevelItem(id: 'sk-3', userId: 'user-3', skill: 'Développement Mobile', level: 4, selfAssessed: true),
      ];
}

