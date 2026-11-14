import '../../core/models/studyflow_models.dart';
import '../studyflow_provider_base.dart';

/// Provider du domaine Formations, Coaching, Objectifs & Compétences.
mixin CoachingProviderMixin on StudyFlowStoreBase {
  Future<String?> enrollTraining(String trainingId) async {
    if (currentUser == null) return 'Non connecté';
    final tr = trainings.firstWhere((t) => t.id == trainingId);
    final currentCount =
        enrollments.where((e) => e.trainingId == trainingId && e.status == 'ENROLLED').length;
    if (currentCount >= tr.capacity) {
      return 'Formation complète : capacité maximale atteinte.';
    }
    enrollments = [
      ...enrollments,
      TrainingEnrollmentItem(
        id: 'enr-${DateTime.now().millisecondsSinceEpoch}',
        trainingId: trainingId,
        userId: currentUser!.id,
        status: 'ENROLLED',
        attended: false,
      ),
    ];
    notifyListeners();

    await coachingRepo.sync('ENROLL_TRAINING', currentUser!.id, {'trainingId': trainingId});
    return null;
  }

  Future<void> unenrollTraining(String trainingId) async {
    if (currentUser == null) return;
    enrollments = enrollments
        .where((e) => !(e.trainingId == trainingId && e.userId == currentUser!.id))
        .toList();
    notifyListeners();

    await coachingRepo.sync('UNENROLL_TRAINING', currentUser!.id, {'trainingId': trainingId});
  }

  Future<void> createTraining({
    required String title,
    required String description,
    required String skill,
    String level = 'INTERMEDIATE',
    int capacity = 10,
    String mode = 'ONLINE',
    String? location,
    DateTime? startsAt,
    DateTime? endsAt,
  }) async {
    if (currentUser == null) return;
    final start = startsAt ?? DateTime.now().add(const Duration(days: 3));
    final end = endsAt ?? start.add(const Duration(hours: 2));
    final tr = TrainingItem(
      id: 'tr-${DateTime.now().millisecondsSinceEpoch}',
      teamId: projects.isNotEmpty ? activeProject.teamId : 'team-1',
      title: title.trim(),
      description: description.trim(),
      skill: skill.trim(),
      level: level,
      trainerId: currentUser!.id,
      startsAt: start,
      endsAt: end,
      capacity: capacity,
      mode: mode,
      location: location?.trim(),
    );
    trainings = [...trainings, tr];
    notifyListeners();

    await coachingRepo.sync('CREATE_TRAINING', currentUser!.id, {
      'title': tr.title,
      'description': tr.description,
      'skill': tr.skill,
      'level': tr.level,
      'capacity': tr.capacity,
      'mode': tr.mode,
      'location': tr.location,
      'startsAt': tr.startsAt.toIso8601String(),
      'endsAt': tr.endsAt.toIso8601String(),
    });
    await hydrateFromPrisma();
  }

  Future<void> updateTraining(
    String trainingId, {
    String? title,
    String? description,
    String? skill,
    String? level,
    int? capacity,
    String? mode,
    String? location,
    DateTime? startsAt,
    DateTime? endsAt,
  }) async {
    if (currentUser == null) return;
    trainings = trainings
        .map((t) => t.id == trainingId
            ? t.copyWith(
                title: title?.trim(),
                description: description?.trim(),
                skill: skill?.trim(),
                level: level,
                capacity: capacity,
                mode: mode,
                location: location?.trim(),
                startsAt: startsAt,
                endsAt: endsAt,
              )
            : t)
        .toList();
    notifyListeners();

    await coachingRepo.sync('UPDATE_TRAINING', currentUser!.id, {
      'trainingId': trainingId,
      if (title != null) 'title': title.trim(),
      if (description != null) 'description': description.trim(),
      if (skill != null) 'skill': skill.trim(),
      if (level != null) 'level': level,
      if (capacity != null) 'capacity': capacity,
      if (mode != null) 'mode': mode,
      if (location != null) 'location': location.trim(),
      if (startsAt != null) 'startsAt': startsAt.toIso8601String(),
      if (endsAt != null) 'endsAt': endsAt.toIso8601String(),
    });
  }

  Future<void> deleteTraining(String trainingId) async {
    if (currentUser == null) return;
    trainings = trainings.where((t) => t.id != trainingId).toList();
    enrollments = enrollments.where((e) => e.trainingId != trainingId).toList();
    notifyListeners();

    await coachingRepo.sync('DELETE_TRAINING', currentUser!.id, {'trainingId': trainingId});
  }

  Future<void> requestCoaching({
    required String coachId,
    required String topic,
    required int durationMin,
    required String mode,
    DateTime? proposedSlot,
  }) async {
    if (currentUser == null) return;
    final slot = (proposedSlot ?? DateTime.now().add(const Duration(days: 2))).toIso8601String();
    coachingSessions = [
      CoachingSessionItem(
        id: 'cs-${DateTime.now().millisecondsSinceEpoch}',
        coachId: coachId,
        coacheeId: currentUser!.id,
        topic: topic,
        proposedSlots: [slot],
        durationMin: durationMin,
        mode: mode,
        status: 'REQUESTED',
      ),
      ...coachingSessions,
    ];
    notifyListeners();

    await coachingRepo.sync('REQUEST_COACHING', currentUser!.id, {
      'coachId': coachId,
      'topic': topic,
      'proposedSlots': [slot],
      'durationMin': durationMin,
      'mode': mode,
      'projectId': activeProject.id,
    });
    await hydrateFromPrisma();
  }

  Future<void> confirmCoaching(String sessionId, String slotIso) async {
    if (currentUser == null) return;
    coachingSessions = coachingSessions
        .map((s) => s.id == sessionId
            ? s.copyWith(status: 'CONFIRMED', scheduledAt: DateTime.tryParse(slotIso) ?? DateTime.now())
            : s)
        .toList();
    notifyListeners();

    await coachingRepo.sync('CONFIRM_COACHING', currentUser!.id, {
      'sessionId': sessionId,
      'scheduledAt': slotIso,
    });
  }

  Future<void> completeCoaching(String sessionId, String sharedReport, String? privateNotes) async {
    if (currentUser == null) return;
    coachingSessions = coachingSessions
        .map((s) => s.id == sessionId
            ? s.copyWith(
                status: 'DONE',
                sharedReport: sharedReport,
                privateNotes: s.coachId == currentUser!.id ? privateNotes : s.privateNotes,
              )
            : s)
        .toList();
    notifyListeners();

    await coachingRepo.sync('COMPLETE_COACHING', currentUser!.id, {
      'sessionId': sessionId,
      'sharedReport': sharedReport,
      'privateNotes': privateNotes,
    });
  }

  Future<void> deleteCoaching(String sessionId) async {
    if (currentUser == null) return;
    coachingSessions = coachingSessions.where((s) => s.id != sessionId).toList();
    notifyListeners();

    await coachingRepo.sync('DELETE_COACHING', currentUser!.id, {'sessionId': sessionId});
  }

  Future<void> updateGoalProgress(String goalId, int progress) async {
    if (currentUser == null) return;
    coachingGoals = coachingGoals
        .map((g) => g.id == goalId
            ? g.copyWith(progress: progress, status: progress >= 100 ? 'ACHIEVED' : 'OPEN')
            : g)
        .toList();
    notifyListeners();

    await coachingRepo.sync('UPDATE_GOAL_PROGRESS', currentUser!.id, {
      'goalId': goalId,
      'progress': progress,
    });
  }

  Future<void> deleteGoal(String goalId) async {
    if (currentUser == null) return;
    coachingGoals = coachingGoals.where((g) => g.id != goalId).toList();
    notifyListeners();

    await coachingRepo.sync('DELETE_GOAL', currentUser!.id, {'goalId': goalId});
  }

  Future<void> assessSkill({
    required String targetUserId,
    required String skill,
    required int level,
    bool selfAssessed = true,
  }) async {
    if (currentUser == null || skill.trim().isEmpty) return;
    final trimmedSkill = skill.trim();
    final existingIdx = skillLevels.indexWhere(
      (s) => s.userId == targetUserId && s.skill.toLowerCase() == trimmedSkill.toLowerCase(),
    );
    if (existingIdx != -1) {
      skillLevels = [
        for (var i = 0; i < skillLevels.length; i++)
          if (i == existingIdx)
            skillLevels[i].copyWith(level: level, selfAssessed: selfAssessed)
          else
            skillLevels[i],
      ];
    } else {
      skillLevels = [
        ...skillLevels,
        SkillLevelItem(
          id: 'sk-${DateTime.now().millisecondsSinceEpoch}',
          userId: targetUserId,
          skill: trimmedSkill,
          level: level,
          selfAssessed: selfAssessed,
        ),
      ];
    }
    notifyListeners();

    await coachingRepo.sync('ASSESS_SKILL', currentUser!.id, {
      'targetUserId': targetUserId,
      'skill': trimmedSkill,
      'level': level,
      'selfAssessed': selfAssessed,
    });
  }
}

