import '../../core/domain/kanban_columns.dart';
import '../../core/models/studyflow_models.dart';
import '../studyflow_provider_base.dart';

/// Provider du domaine Projets, Colonnes Kanban, Tâches et Sous-tâches.
mixin KanbanProviderMixin on StudyFlowStoreBase {
  Future<void> createTask({
    required String columnId,
    required String title,
    required String description,
    required TaskPriority priority,
    DateTime? dueDate,
    List<String> assigneeIds = const [],
    List<String> subtaskTitles = const [],
  }) async {
    if (currentUser == null || currentUser!.isCoachOrViewer) return;
    final id = 'task-${DateTime.now().millisecondsSinceEpoch}';
    final newTask = TaskItem(
      id: id,
      projectId: activeProject.id,
      columnId: columnId,
      title: title,
      description: description,
      position: calculateBetween(
        currentTasks.isEmpty ? null : currentTasks.last.position,
        null,
      ),
      priority: priority,
      dueDate: dueDate,
      createdById: currentUser!.id,
      assigneeIds: assigneeIds.isEmpty ? [currentUser!.id] : assigneeIds,
    );
    tasks = [...tasks, newTask];
    for (var i = 0; i < subtaskTitles.length; i++) {
      subtasks = [
        ...subtasks,
        SubtaskItem(
          id: 'sub-${DateTime.now().millisecondsSinceEpoch}-$i',
          taskId: id,
          title: subtaskTitles[i],
          done: false,
          position: i + 1,
        ),
      ];
    }
    notifyListeners();

    await kanbanRepo.sync('CREATE_TASK', currentUser!.id, {
      'projectId': activeProject.id,
      'columnId': columnId,
      'title': title,
      'description': description,
      'priority': priorityToString(priority),
      'dueDate': dueDate?.toIso8601String(),
      'assigneeIds': newTask.assigneeIds,
      'subtasks': subtaskTitles.map((t) => {'title': t, 'done': false}).toList(),
    });
    await hydrateFromPrisma();
  }

  Future<void> moveTask(String taskId, String targetColumnId) async {
    if (currentUser == null || currentUser!.isCoachOrViewer) return;
    final targetCol = columns.firstWhere((c) => c.id == targetColumnId);
    tasks = tasks
        .map((t) => t.id == taskId
            ? t.copyWith(
                columnId: targetColumnId,
                completedAt: targetCol.isDone ? DateTime.now() : null,
                clearCompletedAt: !targetCol.isDone,
              )
            : t)
        .toList();
    notifyListeners();

    await kanbanRepo.sync('MOVE_TASK', currentUser!.id, {
      'taskId': taskId,
      'targetColumnId': targetColumnId,
    });
  }

  Future<void> updateTask({
    required String taskId,
    required String title,
    required String description,
    required TaskPriority priority,
    required String columnId,
    DateTime? dueDate,
    bool clearDueDate = false,
    List<String>? assigneeIds,
  }) async {
    if (currentUser == null || currentUser!.isCoachOrViewer) return;
    final targetCol = columns.firstWhere((c) => c.id == columnId);
    tasks = tasks
        .map((t) => t.id == taskId
            ? t.copyWith(
                title: title,
                description: description,
                priority: priority,
                columnId: columnId,
                dueDate: dueDate,
                clearDueDate: clearDueDate,
                assigneeIds: assigneeIds,
                completedAt: targetCol.isDone ? DateTime.now() : null,
                clearCompletedAt: !targetCol.isDone,
              )
            : t)
        .toList();
    notifyListeners();

    await kanbanRepo.sync('UPDATE_TASK', currentUser!.id, {
      'taskId': taskId,
      'title': title,
      'description': description,
      'priority': priorityToString(priority),
      'columnId': columnId,
      if (clearDueDate)
        'dueDate': null
      else if (dueDate != null)
        'dueDate': dueDate.toIso8601String(),
      if (assigneeIds != null) 'assigneeIds': assigneeIds,
    });
  }

  Future<void> deleteTask(String taskId) async {
    if (currentUser == null || currentUser!.isCoachOrViewer) return;
    tasks = tasks.where((t) => t.id != taskId).toList();
    subtasks = subtasks.where((s) => s.taskId != taskId).toList();
    notifyListeners();

    await kanbanRepo.sync('DELETE_TASK', currentUser!.id, {'taskId': taskId});
  }

  Future<void> toggleSubtask(String subtaskId) async {
    if (currentUser == null || currentUser!.isCoachOrViewer) return;
    subtasks = subtasks
        .map((s) => s.id == subtaskId ? s.copyWith(done: !s.done) : s)
        .toList();
    notifyListeners();

    await kanbanRepo.sync('TOGGLE_SUBTASK', currentUser!.id, {'subtaskId': subtaskId});
  }

  Future<void> createColumn({
    required String name,
    int? wipLimit,
    String? color,
    bool isDone = false,
  }) async {
    if (currentUser == null || currentUser!.isCoachOrViewer) return;
    final trimmed = name.trim();
    if (trimmed.isEmpty) return;

    final maxPos = currentColumns.isEmpty
        ? 0.0
        : currentColumns.map((c) => c.position).reduce((a, b) => a > b ? a : b);
    final colId = 'col-${DateTime.now().millisecondsSinceEpoch}';
    final newCol = KanbanColumnItem(
      id: colId,
      projectId: activeProject.id,
      name: trimmed,
      position: maxPos + 1000.0,
      wipLimit: wipLimit,
      isDone: isDone,
      color: color,
    );
    columns = [...columns, newCol];
    notifyListeners();

    await kanbanRepo.sync('CREATE_COLUMN', currentUser!.id, {
      'id': colId,
      'projectId': activeProject.id,
      'name': trimmed,
      'position': newCol.position,
      'wipLimit': wipLimit,
      'isDone': isDone,
    });
  }

  Future<void> updateColumn(
    String columnId, {
    String? name,
    int? wipLimit,
    bool clearWipLimit = false,
    String? color,
    bool? isDone,
  }) async {
    if (currentUser == null || currentUser!.isCoachOrViewer) return;
    columns = columns
        .map((c) => c.id == columnId
            ? c.copyWith(
                name: name?.trim(),
                wipLimit: wipLimit,
                clearWipLimit: clearWipLimit,
                color: color,
                isDone: isDone,
              )
            : c)
        .toList();
    notifyListeners();

    await kanbanRepo.sync('UPDATE_COLUMN', currentUser!.id, {
      'columnId': columnId,
      if (name != null) 'name': name.trim(),
      if (clearWipLimit) 'wipLimit': null else if (wipLimit != null) 'wipLimit': wipLimit,
      if (isDone != null) 'isDone': isDone,
    });
  }

  Future<void> moveColumn(String columnId, ColumnMoveDirection direction) async {
    if (currentUser == null || currentUser!.isCoachOrViewer) return;
    columns = moveColumnByDirection(columns, activeProject.id, columnId, direction);
    notifyListeners();

    await kanbanRepo.sync('REORDER_COLUMNS', currentUser!.id, {
      'columns': currentColumns.map((c) => {'id': c.id, 'position': c.position}).toList(),
    });
  }

  Future<void> reorderColumns(String sourceColId, String targetColId) async {
    if (currentUser == null || currentUser!.isCoachOrViewer) return;
    columns = reorderProjectColumns(columns, activeProject.id, sourceColId, targetColId);
    notifyListeners();

    await kanbanRepo.sync('REORDER_COLUMNS', currentUser!.id, {
      'columns': currentColumns.map((c) => {'id': c.id, 'position': c.position}).toList(),
    });
  }

  Future<DeleteColumnResult> deleteColumn(String columnId) async {
    if (currentUser == null || currentUser!.isCoachOrViewer) {
      return DeleteColumnResult(
        ok: false,
        error: 'Permission refusée.',
        columns: columns,
        tasks: tasks,
      );
    }
    final result = deleteProjectColumn(columns, tasks, activeProject.id, columnId);
    if (!result.ok) return result;

    columns = result.columns;
    tasks = result.tasks;
    notifyListeners();

    await kanbanRepo.sync('DELETE_COLUMN', currentUser!.id, {
      'columnId': columnId,
      'fallbackColumnId': result.fallbackColumnId,
      'ensureDoneColumnId': result.ensureDoneColumnId,
    });
    await kanbanRepo.sync('REORDER_COLUMNS', currentUser!.id, {
      'columns': currentColumns.map((c) => {'id': c.id, 'position': c.position}).toList(),
    });
    return result;
  }

  void selectProject(String projectId) {
    if (!projects.any((p) => p.id == projectId)) return;
    activeProjectId = projectId;
    notifyListeners();
  }

  Future<void> createProject({
    required String name,
    String description = '',
    String color = '#4f46e5',
  }) async {
    if (currentUser == null || currentUser!.isCoachOrViewer) return;
    final projId = 'proj-${DateTime.now().millisecondsSinceEpoch}';
    final proj = ProjectItem(
      id: projId,
      teamId: projects.isNotEmpty ? activeProject.teamId : 'team-1',
      name: name.trim(),
      description: description.trim(),
      color: color,
    );
    projects = [...projects, proj];
    columns = [
      ...columns,
      KanbanColumnItem(id: 'col-$projId-1', projectId: projId, name: 'À faire', position: 1000),
      KanbanColumnItem(id: 'col-$projId-2', projectId: projId, name: 'En cours', position: 2000, wipLimit: 3),
      KanbanColumnItem(id: 'col-$projId-3', projectId: projId, name: 'Terminé', position: 3000, isDone: true),
    ];
    activeProjectId = projId;
    notifyListeners();

    await kanbanRepo.sync('CREATE_PROJECT', currentUser!.id, {
      'name': proj.name,
      'description': proj.description,
      'color': proj.color,
    });
    await hydrateFromPrisma();
  }

  Future<void> updateProject(
    String projectId, {
    String? name,
    String? description,
    String? color,
  }) async {
    if (currentUser == null || currentUser!.isCoachOrViewer) return;
    projects = projects
        .map((p) => p.id == projectId
            ? p.copyWith(name: name?.trim(), description: description?.trim(), color: color)
            : p)
        .toList();
    notifyListeners();

    await kanbanRepo.sync('UPDATE_PROJECT', currentUser!.id, {
      'projectId': projectId,
      if (name != null) 'name': name.trim(),
      if (description != null) 'description': description.trim(),
      if (color != null) 'color': color,
    });
  }
}

