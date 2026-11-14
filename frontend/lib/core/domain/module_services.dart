import 'specification_entities.dart';

/// Firebase-facing use cases corresponding to the endpoint list in PDF §16.1.
abstract interface class AuthenticationService {
  Future<User> register(String email, String password, String name);
  Future<User> updateProfile(User user);
  Future<Team> createTeam(String name, {String? description});
  Future<Team> manageTeam(Team team);
  Future<String> regenerateInviteLink(String teamId);
  Future<TeamMember> acceptInvitation(String token);
  Future<TeamMember> updateMemberRole(String memberId, TeamRole role);
  Future<void> removeMember(String memberId);
}

abstract interface class KanbanService {
  Future<Project> createProject(Project project);
  Future<Project> updateProject(Project project);
  Stream<List<Project>> listProjects(String teamId);
  Future<ProjectColumn> createColumn(ProjectColumn column);
  Future<ProjectColumn> updateColumn(ProjectColumn column);
  Future<void> deleteColumn(String columnId);
  Future<void> reorderColumns(String projectId, List<String> columnIds);
  Future<void> moveTask(String taskId, String columnId, int position);
}

abstract interface class TaskService {
  Future<Task> createTask(Task task);
  Future<Task> updateTask(Task task);
  Future<void> deleteTask(String taskId);
  Future<Task> duplicateTask(String taskId);
  Future<void> setAssignees(String taskId, List<String> userIds);
  Future<Label> saveLabel(Label label);
  Future<Subtask> saveSubtask(Subtask subtask);
  Stream<List<Task>> listTasks(String projectId);
}

abstract interface class CalendarReportService {
  Stream<List<CalendarEvent>> listCalendarEvents(
    String projectId,
    DateTime from,
    DateTime to,
  );
  Stream<List<Task>> listMyTasks(String userId);
  Future<Milestone> saveMilestone(Milestone milestone);
  Future<Map<String, Object?>> getProjectStats(String projectId);
  Future<List<ProjectSnapshot>> getBurndown(String projectId);
  Stream<List<Activity>> listActivity(String projectId);
  Future<Report> generateReport(String projectId, DateTime from, DateTime to);
  Future<String> exportReportPdf(String reportId);
  Future<void> deleteMilestone(String milestoneId);
  Future<Task> updateDueDate(String taskId, DateTime? dueDate);
  Future<Map<String, Object?>> getMemberWorkload(String projectId);
  Future<Map<String, Object?>> getVelocity(String projectId);
  Future<String> exportCsv(String reportId);
  Future<CalendarToken> regenerateCalendarToken(String userId);
}

abstract interface class ChatService {
  Future<Message> sendMessage(
    String channelId,
    String content, {
    String? replyToId,
  });
  Future<Message> editMessage(Message message);
  Future<void> deleteMessage(String messageId);
  Stream<List<Message>> listMessages(String channelId);
  Future<void> markChannelRead(String channelId);
  Future<Channel> getTaskChannel(String taskId);
  Stream<List<Notification>> listNotifications(String userId);
  Future<void> markNotificationRead(String notificationId);
}

abstract interface class FileService {
  Future<FileAsset> upload(
    String projectId,
    String localPath, {
    String? taskId,
    String? folderId,
  });
  Stream<List<FileAsset>> listFiles(String projectId);
  Future<String> getDownloadUrl(String fileId);
  Future<FileAsset> renameFile(String fileId, String name);
  Future<FileAsset> moveFile(String fileId, String? folderId);
  Future<void> deleteFile(String fileId);
  Future<Folder> saveFolder(Folder folder);
  Future<FileVersion> replaceFile(String fileId, String localPath);
}

abstract interface class TrainingCoachingService {
  Stream<List<Training>> listTrainings(String teamId);
  Future<Training> saveTraining(Training training);
  Future<TrainingEnrollment> enrollInTraining(String trainingId);
  Future<TrainingEnrollment> markAttendance(
    String trainingId,
    String userId,
    bool attended,
  );
  Future<CoachingSession> requestCoaching(CoachingSession session);
  Future<CoachingSession> respondToCoaching(
    String sessionId,
    CoachingStatus status,
  );
  Future<CoachingSession> saveSessionReport(String sessionId, String report);
  Future<CoachingGoal> saveGoal(CoachingGoal goal);
  Stream<List<CoachingSession>> listMySessions(String userId);
  Future<SkillLevel> saveSkillLevel(SkillLevel skill);
  Stream<List<SkillLevel>> listSkillLevels(String userId);
  Future<void> submitFeedback(String sessionId, String feedback);
  Future<TrainingResource> saveTrainingResource(TrainingResource resource);
}

class SkillLevel {
  const SkillLevel({
    required this.userId,
    required this.skill,
    required this.level,
  });
  final String userId;
  final String skill;
  final int level;
}

class CalendarEvent {
  const CalendarEvent({
    required this.id,
    required this.projectId,
    required this.title,
    required this.startsAt,
    required this.endsAt,
  });
  final String id;
  final String projectId;
  final String title;
  final DateTime startsAt;
  final DateTime endsAt;
}
