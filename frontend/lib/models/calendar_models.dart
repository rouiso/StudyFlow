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

