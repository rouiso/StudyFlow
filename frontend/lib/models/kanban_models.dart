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

/// Calcul de position par indexation fractionnaire
double calculateBetween(double? prevPos, double? nextPos) {
  if (prevPos == null && nextPos == null) return 1000.0;
  if (prevPos == null) return nextPos! / 2;
  if (nextPos == null) return prevPos + 1000.0;
  return (prevPos + nextPos) / 2;
}

/// Décomposition automatique d'une tâche en sous-tâches
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

