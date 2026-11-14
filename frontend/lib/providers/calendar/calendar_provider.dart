import '../../core/models/studyflow_models.dart';
import '../studyflow_provider_base.dart';

/// Provider du domaine Agenda, Jalons & Rapports.
mixin CalendarProviderMixin on StudyFlowStoreBase {
  Future<void> generateReport() async {
    if (currentUser == null) return;
    final doneCols = currentColumns.where((c) => c.isDone).map((c) => c.id).toSet();
    final total = currentTasks.length;
    final done = currentTasks.where((t) => doneCols.contains(t.columnId)).length;
    final rate = total > 0 ? ((done / total) * 100).round() : 0;

    reports = [
      ProjectReportItem(
        id: 'rep-${DateTime.now().millisecondsSinceEpoch}',
        title: 'Rapport d\'étape · ${activeProject.name}',
        completionRate: rate,
        totalTasks: total,
        completedTasks: done,
        createdAt: DateTime.now(),
      ),
      ...reports,
    ];
    notifyListeners();

    await calendarRepo.sync('GENERATE_REPORT', currentUser!.id, {
      'projectId': activeProject.id,
    });
    await hydrateFromPrisma();
  }

  Future<void> deleteReport(String reportId) async {
    if (currentUser == null) return;
    reports = reports.where((r) => r.id != reportId).toList();
    notifyListeners();

    await calendarRepo.sync('DELETE_REPORT', currentUser!.id, {'reportId': reportId});
  }

  Future<void> createMilestone({
    required String title,
    required DateTime date,
    String? description,
  }) async {
    if (currentUser == null || currentUser!.isCoachOrViewer) return;
    final m = MilestoneItem(
      id: 'ms-${DateTime.now().millisecondsSinceEpoch}',
      projectId: activeProject.id,
      title: title.trim(),
      date: date,
      description: description?.trim(),
    );
    milestones = [...milestones, m];
    notifyListeners();

    await calendarRepo.sync('CREATE_MILESTONE', currentUser!.id, {
      'projectId': activeProject.id,
      'title': m.title,
      'date': m.date.toIso8601String(),
      'description': m.description,
    });
    await hydrateFromPrisma();
  }

  Future<void> updateMilestone(
    String milestoneId, {
    String? title,
    DateTime? date,
    String? description,
  }) async {
    if (currentUser == null || currentUser!.isCoachOrViewer) return;
    milestones = milestones
        .map((m) => m.id == milestoneId
            ? m.copyWith(title: title?.trim(), date: date, description: description?.trim())
            : m)
        .toList();
    notifyListeners();

    await calendarRepo.sync('UPDATE_MILESTONE', currentUser!.id, {
      'milestoneId': milestoneId,
      if (title != null) 'title': title.trim(),
      if (date != null) 'date': date.toIso8601String(),
      if (description != null) 'description': description.trim(),
    });
  }
}

