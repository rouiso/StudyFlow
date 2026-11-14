/// Domain entities and service contracts for the seven StudyFlow modules.
///
/// These contracts are backend agnostic. Firebase repositories and Cloud
/// Functions can implement them without leaking infrastructure into widgets.
library;

typedef Json = Map<String, Object?>;

class Page<T> {
  const Page(this.items, {this.nextCursor});
  final List<T> items;
  final String? nextCursor;
}

class AiRecommendation {
  const AiRecommendation({
    required this.id,
    required this.kind,
    required this.explanation,
    required this.confidence,
    required this.isPrediction,
  });
  final String id;
  final String kind;
  final String explanation;
  final double confidence;
  final bool isPrediction;
}

// M1 - Authentication and teams

class UserProfile {
  const UserProfile({
    required this.id,
    required this.displayName,
    required this.email,
    this.skills = const [],
    this.availability = const {},
  });
  final String id;
  final String displayName;
  final String email;
  final List<String> skills;
  final Map<String, String> availability;
}

class Team {
  const Team({required this.id, required this.name, required this.ownerId});
  final String id;
  final String name;
  final String ownerId;
}

class TeamMember {
  const TeamMember({
    required this.teamId,
    required this.userId,
    required this.role,
    required this.joinedAt,
  });
  final String teamId;
  final String userId;
  final String role;
  final DateTime joinedAt;
}

class TeamInvitation {
  const TeamInvitation({
    required this.id,
    required this.teamId,
    required this.email,
    required this.role,
    required this.status,
  });
  final String id;
  final String teamId;
  final String email;
  final String role;
  final String status;
}

abstract interface class AuthenticationTeamsService {
  Future<UserProfile> register(
    String email,
    String password,
    String displayName,
  );
  Future<UserProfile> signIn(String email, String password);
  Future<void> sendPasswordReset(String email);
  Future<void> signOut();
  Future<UserProfile> updateProfile(UserProfile profile);
  Future<Team> createTeam(String name);
  Future<TeamInvitation> inviteMember(String teamId, String email, String role);
  Future<void> acceptInvitation(String invitationId);
  Future<void> changeMemberRole(String teamId, String userId, String role);
  Future<void> removeMember(String teamId, String userId);
  Future<List<AiRecommendation>> recommendTeamMembers(String teamId);
}

// M2 - Projects and Kanban

class Project {
  const Project({
    required this.id,
    required this.teamId,
    required this.ownerId,
    required this.name,
    required this.status,
    this.memberIds = const [],
  });
  final String id;
  final String teamId;
  final String ownerId;
  final String name;
  final String status;
  final List<String> memberIds;
}

class KanbanColumn {
  const KanbanColumn({
    required this.id,
    required this.projectId,
    required this.name,
    required this.position,
  });
  final String id;
  final String projectId;
  final String name;
  final int position;
}

class Label {
  const Label({
    required this.id,
    required this.projectId,
    required this.name,
    required this.color,
  });
  final String id;
  final String projectId;
  final String name;
  final int color;
}

abstract interface class ProjectsKanbanService {
  Stream<List<Project>> watchProjects(String teamId);
  Future<Project> createProject(String teamId, String name);
  Future<Project> updateProject(Project project);
  Future<void> archiveProject(String projectId);
  Future<KanbanColumn> addColumn(String projectId, String name);
  Future<void> reorderColumns(String projectId, List<String> columnIds);
  Future<Label> createLabel(String projectId, String name, int color);
  Future<List<AiRecommendation>> recommendProjectTemplates(String teamId);
  Future<List<AiRecommendation>> detectProjectBottlenecks(String projectId);
}

// M3 - Tasks and assignments

class Task {
  const Task({
    required this.id,
    required this.projectId,
    required this.title,
    required this.status,
    required this.priority,
    required this.createdBy,
    this.assigneeId,
    this.dueDate,
    this.memberIds = const [],
  });
  final String id;
  final String projectId;
  final String title;
  final String status;
  final String priority;
  final String createdBy;
  final String? assigneeId;
  final DateTime? dueDate;
  final List<String> memberIds;
}

class Subtask {
  const Subtask({
    required this.id,
    required this.taskId,
    required this.title,
    required this.completed,
  });
  final String id;
  final String taskId;
  final String title;
  final bool completed;
}

class TaskComment {
  const TaskComment({
    required this.id,
    required this.taskId,
    required this.authorId,
    required this.body,
  });
  final String id;
  final String taskId;
  final String authorId;
  final String body;
}

class TaskAttachment {
  const TaskAttachment({
    required this.id,
    required this.taskId,
    required this.name,
    required this.storagePath,
  });
  final String id;
  final String taskId;
  final String name;
  final String storagePath;
}

abstract interface class TasksService {
  Stream<Page<Task>> watchTasks(String projectId, {String? cursor});
  Future<Task> createTask(Task task);
  Future<Task> updateTask(Task task);
  Future<void> moveTask(String taskId, String columnId, int position);
  Future<void> assignTask(String taskId, String? userId);
  Future<Subtask> addSubtask(String taskId, String title);
  Future<TaskComment> addComment(String taskId, String body);
  Future<TaskAttachment> attachFile(
    String taskId,
    String storagePath,
    String name,
  );
  Future<List<AiRecommendation>> recommendAssignees(String taskId);
  Future<List<AiRecommendation>> predictOverdueRisk(String projectId);
}

// M4 - Calendar, deadlines, reports, and statistics

class CalendarEvent {
  const CalendarEvent({
    required this.id,
    required this.teamId,
    required this.title,
    required this.startsAt,
    required this.endsAt,
    required this.type,
  });
  final String id;
  final String teamId;
  final String title;
  final DateTime startsAt;
  final DateTime endsAt;
  final String type;
}

class Deadline {
  const Deadline({
    required this.id,
    required this.taskId,
    required this.dueAt,
    required this.status,
  });
  final String id;
  final String taskId;
  final DateTime dueAt;
  final String status;
}

class ProjectReport {
  const ProjectReport({
    required this.projectId,
    required this.completionRate,
    required this.overdueCount,
    required this.measuredAt,
    this.summary,
  });
  final String projectId;
  final double completionRate;
  final int overdueCount;
  final DateTime measuredAt;
  final String? summary;
}

abstract interface class CalendarReportsService {
  Stream<List<CalendarEvent>> watchEvents(
    String teamId,
    DateTime from,
    DateTime to,
  );
  Future<CalendarEvent> createEvent(CalendarEvent event);
  Future<CalendarEvent> updateEvent(CalendarEvent event);
  Future<void> cancelEvent(String eventId);
  Future<List<Deadline>> listDeadlines(
    String teamId,
    DateTime from,
    DateTime to,
  );
  Future<void> scheduleReminder(String deadlineId, DateTime remindAt);
  Future<ProjectReport> generateProjectReport(String projectId);
  Future<String> exportReport(String projectId, String format);
  Future<List<AiRecommendation>> predictDeadlines(String projectId);
  Future<List<AiRecommendation>> detectScheduleConflicts(String teamId);
}

// M5 - Chat and notifications

class Channel {
  const Channel({
    required this.id,
    required this.teamId,
    required this.name,
    this.projectId,
  });
  final String id;
  final String teamId;
  final String name;
  final String? projectId;
}

class Message {
  const Message({
    required this.id,
    required this.channelId,
    required this.authorId,
    required this.body,
    required this.createdAt,
    this.attachmentPath,
  });
  final String id;
  final String channelId;
  final String authorId;
  final String body;
  final DateTime createdAt;
  final String? attachmentPath;
}

class Notification {
  const Notification({
    required this.id,
    required this.userId,
    required this.title,
    required this.body,
    required this.read,
  });
  final String id;
  final String userId;
  final String title;
  final String body;
  final bool read;
}

abstract interface class ChatNotificationsService {
  Stream<List<Channel>> watchChannels(String teamId);
  Stream<List<Message>> watchMessages(String channelId);
  Future<Channel> createChannel(
    String teamId,
    String name, {
    String? projectId,
  });
  Future<Message> sendMessage(
    String channelId,
    String body, {
    String? attachmentPath,
  });
  Future<void> markMessageRead(String messageId);
  Stream<List<Notification>> watchNotifications();
  Future<void> markNotificationRead(String notificationId);
  Future<void> updateNotificationPreferences(Map<String, bool> preferences);
  Future<String> summarizeConversation(String channelId);
  Future<List<String>> extractActionItems(String channelId);
}

// M6 - Files and sharing

class Folder {
  const Folder({
    required this.id,
    required this.teamId,
    required this.name,
    this.parentId,
  });
  final String id;
  final String teamId;
  final String name;
  final String? parentId;
}

class FileAsset {
  const FileAsset({
    required this.id,
    required this.teamId,
    required this.name,
    required this.storagePath,
    required this.ownerId,
    this.projectId,
    this.folderId,
  });
  final String id;
  final String teamId;
  final String name;
  final String storagePath;
  final String ownerId;
  final String? projectId;
  final String? folderId;
}

class FileVersion {
  const FileVersion({
    required this.id,
    required this.fileId,
    required this.storagePath,
    required this.createdAt,
  });
  final String id;
  final String fileId;
  final String storagePath;
  final DateTime createdAt;
}

abstract interface class FilesService {
  Stream<List<Folder>> watchFolders(String teamId, {String? parentId});
  Stream<List<FileAsset>> watchFiles(String teamId, {String? folderId});
  Future<Folder> createFolder(String teamId, String name, {String? parentId});
  Future<FileAsset> upload(
    String teamId,
    String localPath, {
    String? projectId,
    String? folderId,
  });
  Future<void> delete(String fileId);
  Future<FileVersion> createVersion(String fileId, String localPath);
  Future<void> share(String fileId, List<String> userIds);
  Future<String> downloadUrl(String fileId);
  Future<List<FileAsset>> search(String teamId, String query);
  Future<String> summarizeDocument(String fileId);
}

// M7 - Training, coaching, and skills

class Training {
  const Training({
    required this.id,
    required this.title,
    required this.description,
    required this.objectives,
    required this.status,
  });
  final String id;
  final String title;
  final String description;
  final List<String> objectives;
  final String status;
}

class TrainingEnrollment {
  const TrainingEnrollment({
    required this.id,
    required this.trainingId,
    required this.userId,
    required this.progress,
    required this.status,
  });
  final String id;
  final String trainingId;
  final String userId;
  final double progress;
  final String status;
}

class CoachingSession {
  const CoachingSession({
    required this.id,
    required this.coachId,
    required this.learnerId,
    required this.startsAt,
    required this.status,
  });
  final String id;
  final String coachId;
  final String learnerId;
  final DateTime startsAt;
  final String status;
}

class Skill {
  const Skill({required this.id, required this.name, required this.level});
  final String id;
  final String name;
  final int level;
}

class DevelopmentGoal {
  const DevelopmentGoal({
    required this.id,
    required this.userId,
    required this.title,
    required this.targetDate,
  });
  final String id;
  final String userId;
  final String title;
  final DateTime targetDate;
}

abstract interface class TrainingCoachingService {
  Stream<List<Training>> watchTrainings({String? category});
  Future<Training> createTraining(Training training);
  Future<TrainingEnrollment> enroll(String trainingId);
  Future<TrainingEnrollment> updateProgress(
    String enrollmentId,
    double progress,
  );
  Future<CoachingSession> requestCoaching(String coachId, DateTime startsAt);
  Future<void> cancelCoaching(String sessionId);
  Future<List<Skill>> assessSkills(String userId);
  Future<DevelopmentGoal> createGoal(DevelopmentGoal goal);
  Future<List<AiRecommendation>> recommendLearningPath(String userId);
  Future<List<AiRecommendation>> identifyCompetencyGaps(String userId);
}
