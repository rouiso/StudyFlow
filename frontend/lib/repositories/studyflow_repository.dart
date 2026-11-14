import '../core/models/studyflow_models.dart';
import '../services/prisma_api_service.dart';

/// Instantané typé de l'espace de travail renvoyé par le backend.
class WorkspaceSnapshot {
  const WorkspaceSnapshot({
    this.teamName,
    this.teamInviteToken,
    required this.users,
    required this.projects,
    required this.columns,
    required this.tasks,
    required this.subtasks,
    required this.milestones,
    required this.channels,
    required this.messages,
    required this.files,
    required this.activities,
    required this.reports,
    required this.trainings,
    required this.enrollments,
    required this.coachingSessions,
    required this.coachingGoals,
    required this.skillLevels,
  });

  final String? teamName;
  final String? teamInviteToken;
  final List<AppUser> users;
  final List<ProjectItem> projects;
  final List<KanbanColumnItem> columns;
  final List<TaskItem> tasks;
  final List<SubtaskItem> subtasks;
  final List<MilestoneItem> milestones;
  final List<Map<String, dynamic>> channels;
  final List<ChatMessageItem> messages;
  final List<FileAssetItem> files;
  final List<ActivityItem> activities;
  final List<ProjectReportItem> reports;
  final List<TrainingItem> trainings;
  final List<TrainingEnrollmentItem> enrollments;
  final List<CoachingSessionItem> coachingSessions;
  final List<CoachingGoalItem> coachingGoals;
  final List<SkillLevelItem> skillLevels;
}

/// Repository de synchronisation des données métier StudyFlow.
class StudyFlowRepository {
  StudyFlowRepository({PrismaApiService? api}) : _api = api ?? PrismaApiService();

  final PrismaApiService _api;

  Future<WorkspaceSnapshot?> fetchWorkspace(String userId) async {
    final data = await _api.fetchBootstrap(userId);
    if (data == null) return null;

    final parsedTeams = (data['teams'] as List? ?? []);
    String? teamName;
    String? teamInviteToken;
    if (parsedTeams.isNotEmpty) {
      final firstTeam = parsedTeams.first as Map<String, dynamic>;
      teamName = firstTeam['name']?.toString();
      teamInviteToken = firstTeam['inviteToken']?.toString();
    }

    return WorkspaceSnapshot(
      teamName: teamName,
      teamInviteToken: teamInviteToken,
      users: (data['users'] as List? ?? [])
          .map((e) => AppUser.fromJson(e as Map<String, dynamic>))
          .toList(),
      projects: (data['projects'] as List? ?? [])
          .map((e) => ProjectItem.fromJson(e as Map<String, dynamic>))
          .toList(),
      columns: (data['columns'] as List? ?? [])
          .map((e) => KanbanColumnItem.fromJson(e as Map<String, dynamic>))
          .toList(),
      tasks: (data['tasks'] as List? ?? [])
          .map((e) => TaskItem.fromJson(e as Map<String, dynamic>))
          .toList(),
      subtasks: (data['subtasks'] as List? ?? [])
          .map((e) => SubtaskItem.fromJson(e as Map<String, dynamic>))
          .toList(),
      milestones: (data['milestones'] as List? ?? [])
          .map((e) => MilestoneItem.fromJson(e as Map<String, dynamic>))
          .toList(),
      channels: (data['channels'] as List? ?? [])
          .map((e) => Map<String, dynamic>.from(e as Map))
          .toList(),
      messages: (data['messages'] as List? ?? [])
          .map((e) => ChatMessageItem.fromJson(e as Map<String, dynamic>))
          .toList(),
      files: (data['files'] as List? ?? [])
          .map((e) => FileAssetItem.fromJson(e as Map<String, dynamic>))
          .toList(),
      activities: (data['activities'] as List? ?? [])
          .map((e) => ActivityItem.fromJson(e as Map<String, dynamic>))
          .toList(),
      reports: (data['reports'] as List? ?? [])
          .map((e) => ProjectReportItem.fromJson(e as Map<String, dynamic>))
          .toList(),
      trainings: (data['trainings'] as List? ?? [])
          .map((e) => TrainingItem.fromJson(e as Map<String, dynamic>))
          .toList(),
      enrollments: (data['enrollments'] as List? ?? [])
          .map((e) => TrainingEnrollmentItem.fromJson(e as Map<String, dynamic>))
          .toList(),
      coachingSessions: (data['coachingSessions'] as List? ?? [])
          .map((e) => CoachingSessionItem.fromJson(e as Map<String, dynamic>))
          .toList(),
      coachingGoals: (data['coachingGoals'] as List? ?? [])
          .map((e) => CoachingGoalItem.fromJson(e as Map<String, dynamic>))
          .toList(),
      skillLevels: (data['skillLevels'] as List? ?? [])
          .map((e) => SkillLevelItem.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }

  Future<bool> syncAction({
    required String action,
    required String userId,
    required Map<String, dynamic> payload,
  }) {
    return _api.syncAction(action: action, userId: userId, payload: payload);
  }
}

