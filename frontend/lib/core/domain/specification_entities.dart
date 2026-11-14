/// Exact v2.1 domain entities from the StudyFlow specification.
///
/// The PDF describes Serverpod models, but this project persists the same
/// contracts in Firebase. Infrastructure-specific DTOs belong in data layers.
library;

enum TeamRole { owner, admin, member, coach, viewer }

enum TrainingLevel { beginner, intermediate, advanced }

enum TrainingMode { online, onsite }

enum TrainingStatus { draft, published, cancelled, done }

enum CoachingStatus { requested, confirmed, rescheduled, done, cancelled }

enum GoalStatus { open, achieved, abandoned }

enum EnrollmentStatus { enrolled, waitlist, cancelled }

class User {
  const User({
    required this.id,
    required this.name,
    required this.email,
    required this.createdAt,
    this.image,
  });
  final String id;
  final String name;
  final String email;
  final String? image;
  final DateTime createdAt;
}

class Team {
  const Team({
    required this.id,
    required this.name,
    required this.slug,
    required this.ownerId,
    required this.createdAt,
    this.description,
    this.inviteToken,
    this.inviteExpiresAt,
  });
  final String id;
  final String name;
  final String? description;
  final String slug;
  final String ownerId;
  final String? inviteToken;
  final DateTime? inviteExpiresAt;
  final DateTime createdAt;
}

class TeamMember {
  const TeamMember({
    required this.id,
    required this.teamId,
    required this.userId,
    required this.role,
    required this.joinedAt,
  });
  final String id;
  final String teamId;
  final String userId;
  final TeamRole role;
  final DateTime joinedAt;
}

class Project {
  const Project({
    required this.id,
    required this.teamId,
    required this.name,
    required this.startDate,
    this.description,
    this.color,
    this.endDate,
    this.archivedAt,
  });
  final String id;
  final String teamId;
  final String name;
  final String? description;
  final int? color;
  final DateTime? startDate;
  final DateTime? endDate;
  final DateTime? archivedAt;
}

class ProjectColumn {
  const ProjectColumn({
    required this.id,
    required this.projectId,
    required this.name,
    required this.position,
    required this.isDone,
    this.wipLimit,
  });
  final String id;
  final String projectId;
  final String name;
  final int position;
  final int? wipLimit;
  final bool isDone;
}

class ProjectTemplate {
  const ProjectTemplate({
    required this.id,
    required this.name,
    required this.description,
    required this.columns,
  });
  final String id;
  final String name;
  final String description;
  final List<JsonColumn> columns;
}

class JsonColumn {
  const JsonColumn({
    required this.name,
    required this.position,
    this.wipLimit,
    this.isDone = false,
  });
  final String name;
  final int position;
  final int? wipLimit;
  final bool isDone;
}

class Task {
  const Task({
    required this.id,
    required this.projectId,
    required this.columnId,
    required this.title,
    required this.position,
    required this.priority,
    required this.createdById,
    required this.createdAt,
    this.description,
    this.dueDate,
    this.completedAt,
    this.archivedAt,
  });
  final String id;
  final String projectId;
  final String columnId;
  final String title;
  final String? description;
  final int position;
  final String priority;
  final DateTime? dueDate;
  final String createdById;
  final DateTime createdAt;
  final DateTime? completedAt;
  final DateTime? archivedAt;
}

class Subtask {
  const Subtask({
    required this.id,
    required this.taskId,
    required this.title,
    required this.done,
    required this.position,
  });
  final String id;
  final String taskId;
  final String title;
  final bool done;
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

class Milestone {
  const Milestone({
    required this.id,
    required this.projectId,
    required this.title,
    required this.date,
    this.description,
  });
  final String id;
  final String projectId;
  final String title;
  final DateTime date;
  final String? description;
}

class Reminder {
  const Reminder({
    required this.id,
    required this.taskId,
    required this.userId,
    required this.remindAt,
    required this.kind,
    this.sentAt,
  });
  final String id;
  final String taskId;
  final String userId;
  final DateTime remindAt;
  final String kind;
  final DateTime? sentAt;
}

class CalendarToken {
  const CalendarToken({
    required this.id,
    required this.userId,
    required this.token,
    required this.createdAt,
    this.revokedAt,
  });
  final String id;
  final String userId;
  final String token;
  final DateTime createdAt;
  final DateTime? revokedAt;
}

class Activity {
  const Activity({
    required this.id,
    required this.projectId,
    required this.userId,
    required this.type,
    required this.payload,
    required this.createdAt,
    this.taskId,
  });
  final String id;
  final String projectId;
  final String? taskId;
  final String userId;
  final String type;
  final Map<String, Object?> payload;
  final DateTime createdAt;
}

class ProjectSnapshot {
  const ProjectSnapshot({
    required this.id,
    required this.projectId,
    required this.date,
    required this.total,
    required this.done,
    required this.overdue,
  });
  final String id;
  final String projectId;
  final DateTime date;
  final int total;
  final int done;
  final int overdue;
}

class Report {
  const Report({
    required this.id,
    required this.projectId,
    required this.createdById,
    required this.periodStart,
    required this.periodEnd,
    required this.data,
    required this.createdAt,
  });
  final String id;
  final String projectId;
  final String createdById;
  final DateTime periodStart;
  final DateTime periodEnd;
  final Map<String, Object?> data;
  final DateTime createdAt;
}

class Channel {
  const Channel({
    required this.id,
    required this.teamId,
    required this.name,
    required this.type,
    this.projectId,
    this.taskId,
  });
  final String id;
  final String teamId;
  final String? projectId;
  final String? taskId;
  final String name;
  final String type;
}

class Message {
  const Message({
    required this.id,
    required this.channelId,
    required this.authorId,
    required this.content,
    required this.createdAt,
    this.replyToId,
    this.editedAt,
    this.deletedAt,
  });
  final String id;
  final String channelId;
  final String authorId;
  final String content;
  final String? replyToId;
  final DateTime createdAt;
  final DateTime? editedAt;
  final DateTime? deletedAt;
}

class Notification {
  const Notification({
    required this.id,
    required this.userId,
    required this.type,
    required this.payload,
    required this.createdAt,
    this.readAt,
  });
  final String id;
  final String userId;
  final String type;
  final Map<String, Object?> payload;
  final DateTime? readAt;
  final DateTime createdAt;
}

class FileAsset {
  const FileAsset({
    required this.id,
    required this.projectId,
    required this.uploaderId,
    required this.name,
    required this.mimeType,
    required this.size,
    required this.currentVersion,
    required this.createdAt,
    this.taskId,
    this.folderId,
  });
  final String id;
  final String projectId;
  final String? taskId;
  final String? folderId;
  final String uploaderId;
  final String name;
  final String mimeType;
  final int size;
  final int currentVersion;
  final DateTime createdAt;
}

class Folder {
  const Folder({
    required this.id,
    required this.projectId,
    required this.name,
    this.parentId,
  });
  final String id;
  final String projectId;
  final String? parentId;
  final String name;
}

class FileVersion {
  const FileVersion({
    required this.id,
    required this.fileId,
    required this.version,
    required this.storageKey,
    required this.size,
    required this.uploaderId,
    required this.createdAt,
  });
  final String id;
  final String fileId;
  final int version;
  final String storageKey;
  final int size;
  final String uploaderId;
  final DateTime createdAt;
}

class Training {
  const Training({
    required this.id,
    required this.teamId,
    required this.title,
    required this.description,
    required this.skill,
    required this.level,
    required this.trainerId,
    required this.startsAt,
    required this.endsAt,
    required this.capacity,
    required this.mode,
    required this.status,
    this.location,
    this.meetingUrl,
  });
  final String id;
  final String teamId;
  final String title;
  final String description;
  final String skill;
  final TrainingLevel level;
  final String trainerId;
  final DateTime startsAt;
  final DateTime endsAt;
  final int capacity;
  final TrainingMode mode;
  final String? location;
  final String? meetingUrl;
  final TrainingStatus status;
}

class CoachingSession {
  const CoachingSession({
    required this.id,
    required this.teamId,
    required this.coachId,
    required this.coacheeId,
    required this.topic,
    required this.proposedSlots,
    required this.durationMin,
    required this.mode,
    required this.status,
    required this.createdAt,
    this.projectId,
    this.scheduledAt,
    this.meetingUrl,
    this.sharedReport,
    this.privateNotes,
  });
  final String id;
  final String teamId;
  final String? projectId;
  final String coachId;
  final String coacheeId;
  final String topic;
  final List<DateTime> proposedSlots;
  final DateTime? scheduledAt;
  final int durationMin;
  final String mode;
  final String? meetingUrl;
  final CoachingStatus status;
  final String? sharedReport;
  final String? privateNotes;
  final DateTime createdAt;
}

class CoachingGoal {
  const CoachingGoal({
    required this.id,
    required this.userId,
    required this.teamId,
    required this.title,
    required this.skill,
    required this.targetDate,
    required this.progress,
    required this.status,
    required this.createdAt,
    this.coachId,
  });
  final String id;
  final String userId;
  final String teamId;
  final String? coachId;
  final String title;
  final String skill;
  final DateTime targetDate;
  final int progress;
  final GoalStatus status;
  final DateTime createdAt;
}

class TaskAssignee {
  const TaskAssignee({required this.taskId, required this.userId});
  final String taskId;
  final String userId;
}

class TaskLabel {
  const TaskLabel({required this.taskId, required this.labelId});
  final String taskId;
  final String labelId;
}

class MessageRead {
  const MessageRead({
    required this.channelId,
    required this.userId,
    required this.lastReadAt,
  });
  final String channelId;
  final String userId;
  final DateTime lastReadAt;
}

class TrainingEnrollment {
  const TrainingEnrollment({
    required this.trainingId,
    required this.userId,
    required this.status,
    required this.attended,
    required this.enrolledAt,
  });
  final String trainingId;
  final String userId;
  final EnrollmentStatus status;
  final bool attended;
  final DateTime enrolledAt;
}

class TrainingResource {
  const TrainingResource({
    required this.trainingId,
    required this.title,
    this.url,
    this.fileId,
  });
  final String trainingId;
  final String title;
  final String? url;
  final String? fileId;
}
