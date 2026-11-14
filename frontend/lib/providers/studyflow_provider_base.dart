import 'package:flutter/foundation.dart';
import '../core/models/studyflow_models.dart';
import '../repositories/auth/auth_repository.dart';
import '../repositories/calendar/calendar_repository.dart';
import '../repositories/coaching/coaching_repository.dart';
import '../repositories/communication/communication_repository.dart';
import '../repositories/kanban/kanban_repository.dart';
import '../repositories/studyflow_repository.dart';
import '../services/prisma_api_service.dart';
import '../services/seed_data.dart';

abstract class StudyFlowStoreBase extends ChangeNotifier {
  StudyFlowStoreBase({
    PrismaApiService? api,
    AuthRepository? authRepository,
    StudyFlowRepository? repository,
  }) : _api = api ?? PrismaApiService() {
    this.authRepository = authRepository ?? AuthRepository(api: _api);
    this.repository = repository ?? StudyFlowRepository(api: _api);
    kanbanRepo = KanbanRepository(_api);
    calendarRepo = CalendarRepository(_api);
    communicationRepo = CommunicationRepository(_api);
    coachingRepo = CoachingRepository(_api);
  }

  final PrismaApiService _api;
  late final AuthRepository authRepository;
  late final StudyFlowRepository repository;
  late final KanbanRepository kanbanRepo;
  late final CalendarRepository calendarRepo;
  late final CommunicationRepository communicationRepo;
  late final CoachingRepository coachingRepo;

  AppUser? currentUser;
  bool isLoading = false;
  bool isPrismaConnected = false;
  String? statusMessage;
  String activeProjectId = 'proj-1';
  String? teamName;
  String? teamInviteToken;

  List<AppUser> users = List.of(StudyFlowSeedData.users);
  List<ProjectItem> projects = List.of(StudyFlowSeedData.projects);
  List<KanbanColumnItem> columns = List.of(StudyFlowSeedData.columns);
  List<TaskItem> tasks = StudyFlowSeedData.initialTasks();
  List<SubtaskItem> subtasks = StudyFlowSeedData.initialSubtasks();
  List<MilestoneItem> milestones = StudyFlowSeedData.initialMilestones();
  List<Map<String, dynamic>> channels = [];
  List<ChatMessageItem> messages = StudyFlowSeedData.initialMessages();
  List<FileAssetItem> files = StudyFlowSeedData.initialFiles();
  List<ActivityItem> activities = [];
  List<ProjectReportItem> reports = [];
  List<TrainingItem> trainings = StudyFlowSeedData.initialTrainings();
  List<TrainingEnrollmentItem> enrollments = StudyFlowSeedData.initialEnrollments();
  List<CoachingSessionItem> coachingSessions = StudyFlowSeedData.initialSessions();
  List<CoachingGoalItem> coachingGoals = StudyFlowSeedData.initialGoals();
  List<SkillLevelItem> skillLevels = StudyFlowSeedData.initialSkills();

  ProjectItem get activeProject =>
      projects.firstWhere((p) => p.id == activeProjectId, orElse: () => projects.first);

  List<KanbanColumnItem> get currentColumns =>
      columns.where((c) => c.projectId == activeProject.id).toList()
        ..sort((a, b) => a.position.compareTo(b.position));

  List<TaskItem> get currentTasks =>
      tasks.where((t) => t.projectId == activeProject.id).toList()
        ..sort((a, b) => a.position.compareTo(b.position));

  List<MilestoneItem> get currentMilestones =>
      milestones.where((m) => m.projectId == activeProject.id).toList();

  List<FileAssetItem> get currentFiles =>
      files.where((f) => f.projectId == activeProject.id).toList();

  List<ChatMessageItem> get currentMessages {
    final projectChannelIds = channels
        .where((c) => c['projectId']?.toString() == activeProject.id)
        .map((c) => c['id']?.toString())
        .whereType<String>()
        .toSet();
    if (projectChannelIds.isEmpty) {
      return messages.where((m) => m.channelId == activeProject.id).toList();
    }
    return messages
        .where((m) => projectChannelIds.contains(m.channelId) || m.channelId == activeProject.id)
        .toList();
  }

  Future<void> hydrateFromPrisma() async {
    if (currentUser == null) return;
    final snapshot = await repository.fetchWorkspace(currentUser!.id);
    if (snapshot == null) {
      isPrismaConnected = false;
      notifyListeners();
      return;
    }

    isPrismaConnected = true;
    try {
      teamName = snapshot.teamName;
      teamInviteToken = snapshot.teamInviteToken;

      if (snapshot.users.isNotEmpty) {
        users = snapshot.users;
        final matched = users.where((u) => u.id == currentUser!.id).toList();
        if (matched.isNotEmpty) currentUser = matched.first;
      }

      if (snapshot.projects.isNotEmpty) {
        projects = snapshot.projects;
        if (!projects.any((p) => p.id == activeProjectId)) {
          activeProjectId = projects.first.id;
        }
      }

      if (snapshot.columns.isNotEmpty) columns = snapshot.columns;

      tasks = snapshot.tasks;
      subtasks = snapshot.subtasks;
      milestones = snapshot.milestones;
      channels = snapshot.channels;
      messages = snapshot.messages;
      files = snapshot.files;
      activities = snapshot.activities;
      reports = snapshot.reports;
      trainings = snapshot.trainings;
      enrollments = snapshot.enrollments;
      coachingSessions = snapshot.coachingSessions;
      coachingGoals = snapshot.coachingGoals;
      skillLevels = snapshot.skillLevels;
    } catch (e) {
      debugPrint('Erreur synchronisation espace de travail: $e');
    }
    notifyListeners();
  }
}

