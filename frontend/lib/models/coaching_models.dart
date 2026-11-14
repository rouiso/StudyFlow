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

