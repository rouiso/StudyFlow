/// Modèles métier StudyFlow v2.1 (alignés sur Prisma Schema & Next.js)
library;

enum UserRole { owner, admin, member, coach, viewer }

UserRole parseUserRole(String? raw) {
  switch (raw?.toUpperCase()) {
    case 'OWNER':
      return UserRole.owner;
    case 'ADMIN':
      return UserRole.admin;
    case 'COACH':
      return UserRole.coach;
    case 'VIEWER':
      return UserRole.viewer;
    default:
      return UserRole.member;
  }
}

String roleToString(UserRole role) {
  switch (role) {
    case UserRole.owner:
      return 'OWNER';
    case UserRole.admin:
      return 'ADMIN';
    case UserRole.coach:
      return 'COACH';
    case UserRole.viewer:
      return 'VIEWER';
    case UserRole.member:
      return 'MEMBER';
  }
}

enum TaskPriority { basse, normale, haute, urgente }

TaskPriority parsePriority(String? raw) {
  switch (raw?.toUpperCase()) {
    case 'URGENTE':
      return TaskPriority.urgente;
    case 'HAUTE':
      return TaskPriority.haute;
    case 'BASSE':
      return TaskPriority.basse;
    default:
      return TaskPriority.normale;
  }
}

String priorityToString(TaskPriority p) {
  switch (p) {
    case TaskPriority.urgente:
      return 'URGENTE';
    case TaskPriority.haute:
      return 'HAUTE';
    case TaskPriority.basse:
      return 'BASSE';
    case TaskPriority.normale:
      return 'NORMALE';
  }
}

class AppUser {
  const AppUser({
    required this.id,
    required this.name,
    required this.email,
    required this.avatar,
    required this.role,
  });

  final String id;
  final String name;
  final String email;
  final String avatar;
  final UserRole role;

  bool get isCoachOrViewer => role == UserRole.coach || role == UserRole.viewer;
  bool get isCoach => role == UserRole.coach;
  bool get canEditTasks => !isCoachOrViewer;

  factory AppUser.fromJson(Map<String, dynamic> json) => AppUser(
        id: json['id']?.toString() ?? '',
        name: json['name']?.toString() ?? 'Utilisateur',
        email: json['email']?.toString() ?? '',
        avatar: json['avatar']?.toString() ?? json['image']?.toString() ?? '',
        role: parseUserRole(json['role']?.toString()),
      );
}

class ProjectItem {
  const ProjectItem({
    required this.id,
    required this.teamId,
    required this.name,
    required this.description,
    required this.color,
  });

  final String id;
  final String teamId;
  final String name;
  final String description;
  final String color;

  ProjectItem copyWith({
    String? name,
    String? description,
    String? color,
  }) =>
      ProjectItem(
        id: id,
        teamId: teamId,
        name: name ?? this.name,
        description: description ?? this.description,
        color: color ?? this.color,
      );

  factory ProjectItem.fromJson(Map<String, dynamic> json) => ProjectItem(
        id: json['id']?.toString() ?? '',
        teamId: json['teamId']?.toString() ?? 'team-1',
        name: json['name']?.toString() ?? 'Projet',
        description: json['description']?.toString() ?? '',
        color: json['color']?.toString() ?? '#4f46e5',
      );
}

class KanbanColumnItem {
  const KanbanColumnItem({
    required this.id,
    required this.projectId,
    required this.name,
    required this.position,
    this.wipLimit,
    this.isDone = false,
    this.color,
  });

  final String id;
  final String projectId;
  final String name;
  final double position;
  final int? wipLimit;
  final bool isDone;
  final String? color;

  KanbanColumnItem copyWith({
    String? name,
    double? position,
    int? wipLimit,
    bool clearWipLimit = false,
    bool? isDone,
    String? color,
  }) =>
      KanbanColumnItem(
        id: id,
        projectId: projectId,
        name: name ?? this.name,
        position: position ?? this.position,
        wipLimit: clearWipLimit ? null : (wipLimit ?? this.wipLimit),
        isDone: isDone ?? this.isDone,
        color: color ?? this.color,
      );

  factory KanbanColumnItem.fromJson(Map<String, dynamic> json) => KanbanColumnItem(
        id: json['id']?.toString() ?? '',
        projectId: json['projectId']?.toString() ?? 'proj-1',
        name: json['name']?.toString() ?? '',
        position: (json['position'] as num?)?.toDouble() ?? 0,
        wipLimit: json['wipLimit'] as int?,
        isDone: json['isDone'] == true,
        color: json['color']?.toString(),
      );
}

class TaskItem {
  const TaskItem({
    required this.id,
    required this.projectId,
    required this.columnId,
    required this.title,
    required this.description,
    required this.position,
    required this.priority,
    this.dueDate,
    required this.createdById,
    this.completedAt,
    this.assigneeIds = const [],
    this.labelIds = const [],
  });

  final String id;
  final String projectId;
  final String columnId;
  final String title;
  final String description;
  final double position;
  final TaskPriority priority;
  final DateTime? dueDate;
  final String createdById;
  final DateTime? completedAt;
  final List<String> assigneeIds;
  final List<String> labelIds;

  TaskItem copyWith({
    String? columnId,
    String? title,
    String? description,
    TaskPriority? priority,
    DateTime? dueDate,
    bool clearDueDate = false,
    DateTime? completedAt,
    bool clearCompletedAt = false,
    List<String>? assigneeIds,
  }) {
    return TaskItem(
      id: id,
      projectId: projectId,
      columnId: columnId ?? this.columnId,
      title: title ?? this.title,
      description: description ?? this.description,
      position: position,
      priority: priority ?? this.priority,
      dueDate: clearDueDate ? null : (dueDate ?? this.dueDate),
      createdById: createdById,
      completedAt: clearCompletedAt ? null : (completedAt ?? this.completedAt),
      assigneeIds: assigneeIds ?? this.assigneeIds,
      labelIds: labelIds,
    );
  }

  factory TaskItem.fromJson(Map<String, dynamic> json) => TaskItem(
        id: json['id']?.toString() ?? '',
        projectId: json['projectId']?.toString() ?? 'proj-1',
        columnId: json['columnId']?.toString() ?? '',
        title: json['title']?.toString() ?? '',
        description: json['description']?.toString() ?? '',
        position: (json['position'] as num?)?.toDouble() ?? 0,
        priority: parsePriority(json['priority']?.toString()),
        dueDate: json['dueDate'] != null ? DateTime.tryParse(json['dueDate'].toString()) : null,
        createdById: json['createdById']?.toString() ?? 'user-1',
        completedAt: json['completedAt'] != null ? DateTime.tryParse(json['completedAt'].toString()) : null,
        assigneeIds: (json['assigneeIds'] as List?)?.map((e) => e.toString()).toList() ?? const [],
        labelIds: (json['labelIds'] as List?)?.map((e) => e.toString()).toList() ?? const [],
      );
}

class SubtaskItem {
  const SubtaskItem({
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

  SubtaskItem copyWith({bool? done}) => SubtaskItem(
        id: id,
        taskId: taskId,
        title: title,
        done: done ?? this.done,
        position: position,
      );

  factory SubtaskItem.fromJson(Map<String, dynamic> json) => SubtaskItem(
        id: json['id']?.toString() ?? '',
        taskId: json['taskId']?.toString() ?? '',
        title: json['title']?.toString() ?? '',
        done: json['done'] == true,
        position: (json['position'] as num?)?.toInt() ?? 0,
      );
}

class MilestoneItem {
  const MilestoneItem({
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

  MilestoneItem copyWith({
    String? title,
    DateTime? date,
    String? description,
  }) =>
      MilestoneItem(
        id: id,
        projectId: projectId,
        title: title ?? this.title,
        date: date ?? this.date,
        description: description ?? this.description,
      );

  factory MilestoneItem.fromJson(Map<String, dynamic> json) => MilestoneItem(
        id: json['id']?.toString() ?? '',
        projectId: json['projectId']?.toString() ?? 'proj-1',
        title: json['title']?.toString() ?? '',
        date: DateTime.tryParse(json['date']?.toString() ?? '') ?? DateTime.now(),
        description: json['description']?.toString(),
      );
}

class ChatMessageItem {
  const ChatMessageItem({
    required this.id,
    required this.channelId,
    required this.authorId,
    required this.content,
    required this.createdAt,
  });

  final String id;
  final String channelId;
  final String authorId;
  final String content;
  final DateTime createdAt;

  ChatMessageItem copyWith({String? content}) => ChatMessageItem(
        id: id,
        channelId: channelId,
        authorId: authorId,
        content: content ?? this.content,
        createdAt: createdAt,
      );

  factory ChatMessageItem.fromJson(Map<String, dynamic> json) => ChatMessageItem(
        id: json['id']?.toString() ?? '',
        channelId: json['channelId']?.toString() ?? 'proj-1',
        authorId: json['authorId']?.toString() ?? '',
        content: json['content']?.toString() ?? '',
        createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? '') ?? DateTime.now(),
      );
}

class FileAssetItem {
  const FileAssetItem({
    required this.id,
    required this.projectId,
    required this.uploaderId,
    required this.name,
    required this.mimeType,
    required this.size,
    required this.createdAt,
  });

  final String id;
  final String projectId;
  final String uploaderId;
  final String name;
  final String mimeType;
  final int size;
  final DateTime createdAt;

  factory FileAssetItem.fromJson(Map<String, dynamic> json) => FileAssetItem(
        id: json['id']?.toString() ?? '',
        projectId: json['projectId']?.toString() ?? 'proj-1',
        uploaderId: json['uploaderId']?.toString() ?? 'user-1',
        name: json['name']?.toString() ?? 'fichier',
        mimeType: json['mimeType']?.toString() ?? 'application/octet-stream',
        size: (json['size'] as num?)?.toInt() ?? 0,
        createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? '') ?? DateTime.now(),
      );
}

class ActivityItem {
  const ActivityItem({
    required this.id,
    required this.projectId,
    required this.userId,
    required this.type,
    required this.summary,
    required this.createdAt,
  });

  final String id;
  final String projectId;
  final String userId;
  final String type;
  final String summary;
  final DateTime createdAt;

  factory ActivityItem.fromJson(Map<String, dynamic> json) => ActivityItem(
        id: json['id']?.toString() ?? '',
        projectId: json['projectId']?.toString() ?? 'proj-1',
        userId: json['userId']?.toString() ?? '',
        type: json['type']?.toString() ?? '',
        summary: json['payload']?.toString() ?? '',
        createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? '') ?? DateTime.now(),
      );
}

class TrainingItem {
  const TrainingItem({
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
    this.location,
  });

  final String id;
  final String teamId;
  final String title;
  final String description;
  final String skill;
  final String level;
  final String trainerId;
  final DateTime startsAt;
  final DateTime endsAt;
  final int capacity;
  final String mode;
  final String? location;

  TrainingItem copyWith({
    String? title,
    String? description,
    String? skill,
    String? level,
    int? capacity,
    String? mode,
    String? location,
    DateTime? startsAt,
    DateTime? endsAt,
  }) =>
      TrainingItem(
        id: id,
        teamId: teamId,
        title: title ?? this.title,
        description: description ?? this.description,
        skill: skill ?? this.skill,
        level: level ?? this.level,
        trainerId: trainerId,
        startsAt: startsAt ?? this.startsAt,
        endsAt: endsAt ?? this.endsAt,
        capacity: capacity ?? this.capacity,
        mode: mode ?? this.mode,
        location: location ?? this.location,
      );

  factory TrainingItem.fromJson(Map<String, dynamic> json) => TrainingItem(
        id: json['id']?.toString() ?? '',
        teamId: json['teamId']?.toString() ?? 'team-1',
        title: json['title']?.toString() ?? '',
        description: json['description']?.toString() ?? '',
        skill: json['skill']?.toString() ?? '',
        level: json['level']?.toString() ?? 'INTERMEDIATE',
        trainerId: json['trainerId']?.toString() ?? 'user-5',
        startsAt: DateTime.tryParse(json['startsAt']?.toString() ?? '') ?? DateTime.now(),
        endsAt: DateTime.tryParse(json['endsAt']?.toString() ?? '') ?? DateTime.now(),
        capacity: (json['capacity'] as num?)?.toInt() ?? 10,
        mode: json['mode']?.toString() ?? 'ONLINE',
        location: json['location']?.toString(),
      );
}

class TrainingEnrollmentItem {
  const TrainingEnrollmentItem({
    required this.id,
    required this.trainingId,
    required this.userId,
    required this.status,
    required this.attended,
  });

  final String id;
  final String trainingId;
  final String userId;
  final String status;
  final bool attended;

  factory TrainingEnrollmentItem.fromJson(Map<String, dynamic> json) => TrainingEnrollmentItem(
        id: json['id']?.toString() ?? '',
        trainingId: json['trainingId']?.toString() ?? '',
        userId: json['userId']?.toString() ?? '',
        status: json['status']?.toString() ?? 'ENROLLED',
        attended: json['attended'] == true,
      );
}

class CoachingSessionItem {
  const CoachingSessionItem({
    required this.id,
    required this.coachId,
    required this.coacheeId,
    required this.topic,
    required this.proposedSlots,
    this.scheduledAt,
    required this.durationMin,
    required this.mode,
    this.meetingUrl,
    required this.status,
    this.sharedReport,
    this.privateNotes,
  });

  final String id;
  final String coachId;
  final String coacheeId;
  final String topic;
  final List<String> proposedSlots;
  final DateTime? scheduledAt;
  final int durationMin;
  final String mode;
  final String? meetingUrl;
  final String status; // REQUESTED, CONFIRMED, DONE
  final String? sharedReport;
  final String? privateNotes;

  CoachingSessionItem copyWith({
    String? status,
    DateTime? scheduledAt,
    String? sharedReport,
    String? privateNotes,
  }) =>
      CoachingSessionItem(
        id: id,
        coachId: coachId,
        coacheeId: coacheeId,
        topic: topic,
        proposedSlots: proposedSlots,
        scheduledAt: scheduledAt ?? this.scheduledAt,
        durationMin: durationMin,
        mode: mode,
        meetingUrl: meetingUrl,
        status: status ?? this.status,
        sharedReport: sharedReport ?? this.sharedReport,
        privateNotes: privateNotes ?? this.privateNotes,
      );

  factory CoachingSessionItem.fromJson(Map<String, dynamic> json) => CoachingSessionItem(
        id: json['id']?.toString() ?? '',
        coachId: json['coachId']?.toString() ?? 'user-5',
        coacheeId: json['coacheeId']?.toString() ?? '',
        topic: json['topic']?.toString() ?? '',
        proposedSlots: (json['proposedSlots'] as List?)?.map((e) => e.toString()).toList() ?? const [],
        scheduledAt: json['scheduledAt'] != null ? DateTime.tryParse(json['scheduledAt'].toString()) : null,
        durationMin: (json['durationMin'] as num?)?.toInt() ?? 45,
        mode: json['mode']?.toString() ?? 'ONLINE',
        meetingUrl: json['meetingUrl']?.toString(),
        status: json['status']?.toString() ?? 'REQUESTED',
        sharedReport: json['sharedReport']?.toString(),
        privateNotes: json['privateNotes']?.toString(),
      );
}

class CoachingGoalItem {
  const CoachingGoalItem({
    required this.id,
    required this.userId,
    required this.title,
    required this.skill,
    required this.progress,
    required this.status,
  });

  final String id;
  final String userId;
  final String title;
  final String skill;
  final int progress;
  final String status;

  CoachingGoalItem copyWith({int? progress, String? status}) => CoachingGoalItem(
        id: id,
        userId: userId,
        title: title,
        skill: skill,
        progress: progress ?? this.progress,
        status: status ?? this.status,
      );

  factory CoachingGoalItem.fromJson(Map<String, dynamic> json) => CoachingGoalItem(
        id: json['id']?.toString() ?? '',
        userId: json['userId']?.toString() ?? '',
        title: json['title']?.toString() ?? '',
        skill: json['skill']?.toString() ?? '',
        progress: (json['progress'] as num?)?.toInt() ?? 0,
        status: json['status']?.toString() ?? 'OPEN',
      );
}

class SkillLevelItem {
  const SkillLevelItem({
    required this.id,
    required this.userId,
    required this.skill,
    required this.level,
    required this.selfAssessed,
  });

  final String id;
  final String userId;
  final String skill;
  final int level;
  final bool selfAssessed;

  SkillLevelItem copyWith({int? level, bool? selfAssessed}) => SkillLevelItem(
        id: id,
        userId: userId,
        skill: skill,
        level: level ?? this.level,
        selfAssessed: selfAssessed ?? this.selfAssessed,
      );

  factory SkillLevelItem.fromJson(Map<String, dynamic> json) => SkillLevelItem(
        id: json['id']?.toString() ?? '',
        userId: json['userId']?.toString() ?? '',
        skill: json['skill']?.toString() ?? '',
        level: (json['level'] as num?)?.toInt() ?? 1,
        selfAssessed: json['selfAssessed'] == true,
      );
}

class ProjectReportItem {
  const ProjectReportItem({
    required this.id,
    required this.title,
    required this.completionRate,
    required this.totalTasks,
    required this.completedTasks,
    required this.createdAt,
  });

  final String id;
  final String title;
  final int completionRate;
  final int totalTasks;
  final int completedTasks;
  final DateTime createdAt;

  factory ProjectReportItem.fromJson(Map<String, dynamic> json) {
    final rawData = json['data'];
    Map<String, dynamic> parsedData = const {};
    if (rawData is Map<String, dynamic>) {
      parsedData = rawData;
    } else if (rawData is String && rawData.isNotEmpty) {
      try {
        final decoded = jsonDecodeSafe(rawData);
        if (decoded != null) parsedData = decoded;
      } catch (_) {}
    }
    return ProjectReportItem(
      id: json['id']?.toString() ?? '',
      title: parsedData['title']?.toString() ?? json['title']?.toString() ?? 'Rapport',
      completionRate: (parsedData['completionRate'] as num?)?.toInt() ??
          (json['completionRate'] as num?)?.toInt() ??
          0,
      totalTasks: (parsedData['totalTasks'] as num?)?.toInt() ??
          (json['totalTasks'] as num?)?.toInt() ??
          0,
      completedTasks: (parsedData['completedTasks'] as num?)?.toInt() ??
          (json['completedTasks'] as num?)?.toInt() ??
          0,
      createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? '') ?? DateTime.now(),
    );
  }
}

Map<String, dynamic>? jsonDecodeSafe(String raw) {
  final idxTitle = RegExp(r'"title"\s*:\s*"([^"]*)"').firstMatch(raw)?.group(1);
  final rate = RegExp(r'"completionRate"\s*:\s*(\d+)').firstMatch(raw)?.group(1);
  final total = RegExp(r'"totalTasks"\s*:\s*(\d+)').firstMatch(raw)?.group(1);
  final done = RegExp(r'"completedTasks"\s*:\s*(\d+)').firstMatch(raw)?.group(1);
  if (idxTitle == null && rate == null) return null;
  return {
    if (idxTitle != null) 'title': idxTitle,
    if (rate != null) 'completionRate': int.tryParse(rate) ?? 0,
    if (total != null) 'totalTasks': int.tryParse(total) ?? 0,
    if (done != null) 'completedTasks': int.tryParse(done) ?? 0,
  };
}

/// Règle métier M2 (Cahier des charges) : Calcul de position par fractional indexing
double calculateBetween(double? prevPos, double? nextPos) {
  if (prevPos == null && nextPos == null) return 1000.0;
  if (prevPos == null) return nextPos! / 2;
  if (nextPos == null) return prevPos + 1000.0;
  return (prevPos + nextPos) / 2;
}

/// Règle métier IA : Décomposition automatique d'une tâche en sous-tâches
List<String> aiBreakdownTask(String title) {
  final lower = title.toLowerCase();
  if (lower.contains('api') || lower.contains('backend') || lower.contains('serveur')) {
    return [
      'Concevoir le modèle de données et les validations',
      'Implémenter les services métier et les contrôles',
      'Écrire les tests unitaires et d\'intégration',
    ];
  }
  if (lower.contains('ui') || lower.contains('kanban') || lower.contains('flutter')) {
    return [
      'Structurer les composants d\'interface responsives',
      'Connecter l\'état réactif à la synchronisation temps réel',
      'Vérifier l\'accessibilité et le mode sombre',
    ];
  }
  return [
    'Analyser les spécifications du module',
    'Développer la logique métier principale',
    'Tester et valider avant revue d\'équipe',
  ];
}

