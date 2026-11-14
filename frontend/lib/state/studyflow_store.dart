import 'dart:convert';
import 'package:flutter/foundation.dart';
import '../core/domain/kanban_columns.dart';
import '../core/models/studyflow_models.dart';
import '../core/services/prisma_api_service.dart';

class StudyFlowStore extends ChangeNotifier {
  StudyFlowStore({PrismaApiService? api}) : _api = api ?? PrismaApiService();

  final PrismaApiService _api;

  AppUser? currentUser;
  bool isLoading = false;
  bool isPrismaConnected = false;
  String? statusMessage;
  String activeProjectId = 'proj-1';
  String? teamName;
  String? teamInviteToken;

  List<AppUser> users = List.of(StudyFlowSeedData.users);
  List<ProjectItem> projects = List.of(StudyFlowSeedData.projects);
  List<KanbanColumnItem> columns = List.of(StudyFlowSeedData.columns);
  List<TaskItem> tasks = StudyFlowSeedData.initialTasks();
  List<SubtaskItem> subtasks = StudyFlowSeedData.initialSubtasks();
  List<MilestoneItem> milestones = StudyFlowSeedData.initialMilestones();
  List<Map<String, dynamic>> channels = [];
  List<ChatMessageItem> messages = StudyFlowSeedData.initialMessages();
  List<FileAssetItem> files = StudyFlowSeedData.initialFiles();
  List<ActivityItem> activities = [];
  List<ProjectReportItem> reports = [];
  List<TrainingItem> trainings = StudyFlowSeedData.initialTrainings();
  List<TrainingEnrollmentItem> enrollments = StudyFlowSeedData.initialEnrollments();
  List<CoachingSessionItem> coachingSessions = StudyFlowSeedData.initialSessions();
  List<CoachingGoalItem> coachingGoals = StudyFlowSeedData.initialGoals();
  List<SkillLevelItem> skillLevels = StudyFlowSeedData.initialSkills();

  String get serverUrl => _api.baseUrl;

  void updateServerUrl(String url) {
    _api.baseUrl = url.trim().replaceAll(RegExp(r'/$'), '');
    notifyListeners();
  }

  ProjectItem get activeProject =>
      projects.firstWhere((p) => p.id == activeProjectId, orElse: () => projects.first);

  List<KanbanColumnItem> get currentColumns =>
      columns.where((c) => c.projectId == activeProject.id).toList()
        ..sort((a, b) => a.position.compareTo(b.position));

  List<TaskItem> get currentTasks =>
      tasks.where((t) => t.projectId == activeProject.id).toList()
        ..sort((a, b) => a.position.compareTo(b.position));

  List<MilestoneItem> get currentMilestones =>
      milestones.where((m) => m.projectId == activeProject.id).toList();

  List<FileAssetItem> get currentFiles =>
      files.where((f) => f.projectId == activeProject.id).toList();

  List<ChatMessageItem> get currentMessages {
    final projectChannelIds = channels
        .where((c) => c['projectId']?.toString() == activeProject.id)
        .map((c) => c['id']?.toString())
        .whereType<String>()
        .toSet();
    if (projectChannelIds.isEmpty) {
      return messages.where((m) => m.channelId == activeProject.id).toList();
    }
    return messages
        .where((m) => projectChannelIds.contains(m.channelId) || m.channelId == activeProject.id)
        .toList();
  }

  Future<bool> login(String email, String password) async {
    isLoading = true;
    statusMessage = null;
    notifyListeners();

    final user = await _api.login(email, password);
    if (user == null) {
      isLoading = false;
      statusMessage = 'Identifiants invalides ou utilisateur introuvable.';
      notifyListeners();
      return false;
    }

    currentUser = user;
    if (!users.any((u) => u.id == user.id)) {
      users = [...users, user];
    }
    await hydrateFromPrisma();
    isLoading = false;
    notifyListeners();
    return true;
  }

  Future<bool> register(String name, String email, String password) async {
    isLoading = true;
    statusMessage = null;
    notifyListeners();

    final user = await _api.register(name, email, password);
    if (user == null) {
      isLoading = false;
      statusMessage = 'Impossible de créer le compte (e-mail déjà utilisé ou invalide).';
      notifyListeners();
      return false;
    }

    currentUser = user;
    users = [user];
    projects = [];
    columns = [];
    tasks = [];
    subtasks = [];
    milestones = [];
    messages = [];
    files = [];
    activities = [];
    reports = [];
    trainings = [];
    enrollments = [];
    coachingSessions = [];
    coachingGoals = [];
    skillLevels = [];
    await hydrateFromPrisma();
    isLoading = false;
    notifyListeners();
    return true;
  }

  void logout() {
    currentUser = null;
    isPrismaConnected = false;
    notifyListeners();
  }

  Future<void> hydrateFromPrisma() async {
    if (currentUser == null) return;
    final data = await _api.fetchBootstrap(currentUser!.id);
    if (data == null) {
      isPrismaConnected = false;
      notifyListeners();
      return;
    }

    isPrismaConnected = true;
    try {
      final parsedTeams = (data['teams'] as List? ?? []);
      if (parsedTeams.isNotEmpty) {
        final firstTeam = parsedTeams.first as Map<String, dynamic>;
        teamName = firstTeam['name']?.toString();
        teamInviteToken = firstTeam['inviteToken']?.toString();
      } else {
        teamName = null;
        teamInviteToken = null;
      }

      final parsedUsers = (data['users'] as List? ?? [])
          .map((e) => AppUser.fromJson(e as Map<String, dynamic>))
          .toList();
      if (parsedUsers.isNotEmpty) {
        users = parsedUsers;
        final matched = users.where((u) => u.id == currentUser!.id).toList();
        if (matched.isNotEmpty) currentUser = matched.first;
      }

      final parsedProjects = (data['projects'] as List? ?? [])
          .map((e) => ProjectItem.fromJson(e as Map<String, dynamic>))
          .toList();
      if (parsedProjects.isNotEmpty) {
        projects = parsedProjects;
        if (!projects.any((p) => p.id == activeProjectId)) {
          activeProjectId = projects.first.id;
        }
      }

      final parsedCols = (data['columns'] as List? ?? [])
          .map((e) => KanbanColumnItem.fromJson(e as Map<String, dynamic>))
          .toList();
      if (parsedCols.isNotEmpty) columns = parsedCols;

      tasks = (data['tasks'] as List? ?? [])
          .map((e) => TaskItem.fromJson(e as Map<String, dynamic>))
          .toList();

      subtasks = (data['subtasks'] as List? ?? [])
          .map((e) => SubtaskItem.fromJson(e as Map<String, dynamic>))
          .toList();

      milestones = (data['milestones'] as List? ?? [])
          .map((e) => MilestoneItem.fromJson(e as Map<String, dynamic>))
          .toList();

      channels = (data['channels'] as List? ?? [])
          .map((e) => Map<String, dynamic>.from(e as Map))
          .toList();

      messages = (data['messages'] as List? ?? [])
          .map((e) => ChatMessageItem.fromJson(e as Map<String, dynamic>))
          .toList();

      files = (data['files'] as List? ?? [])
          .map((e) => FileAssetItem.fromJson(e as Map<String, dynamic>))
          .toList();

      activities = (data['activities'] as List? ?? [])
          .map((e) => ActivityItem.fromJson(e as Map<String, dynamic>))
          .toList();

      reports = (data['reports'] as List? ?? [])
          .map((e) => ProjectReportItem.fromJson(e as Map<String, dynamic>))
          .toList();

      trainings = (data['trainings'] as List? ?? [])
          .map((e) => TrainingItem.fromJson(e as Map<String, dynamic>))
          .toList();

      enrollments = (data['enrollments'] as List? ?? [])
          .map((e) => TrainingEnrollmentItem.fromJson(e as Map<String, dynamic>))
          .toList();

      coachingSessions = (data['coachingSessions'] as List? ?? [])
          .map((e) => CoachingSessionItem.fromJson(e as Map<String, dynamic>))
          .toList();

      coachingGoals = (data['coachingGoals'] as List? ?? [])
          .map((e) => CoachingGoalItem.fromJson(e as Map<String, dynamic>))
          .toList();

      skillLevels = (data['skillLevels'] as List? ?? [])
          .map((e) => SkillLevelItem.fromJson(e as Map<String, dynamic>))
          .toList();
    } catch (e) {
      debugPrint('Erreur parsing bootstrap Prisma: $e');
    }
    notifyListeners();
  }

  // M2 / M3 : Tâches & Kanban
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

    await _api.syncAction(
      action: 'CREATE_TASK',
      userId: currentUser!.id,
      payload: {
        'projectId': activeProject.id,
        'columnId': columnId,
        'title': title,
        'description': description,
        'priority': priorityToString(priority),
        'dueDate': dueDate?.toIso8601String(),
        'assigneeIds': newTask.assigneeIds,
        'subtasks': subtaskTitles.map((t) => {'title': t, 'done': false}).toList(),
      },
    );
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

    await _api.syncAction(
      action: 'MOVE_TASK',
      userId: currentUser!.id,
      payload: {'taskId': taskId, 'targetColumnId': targetColumnId},
    );
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

    await _api.syncAction(
      action: 'UPDATE_TASK',
      userId: currentUser!.id,
      payload: {
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
      },
    );
  }

  Future<void> deleteTask(String taskId) async {
    if (currentUser == null || currentUser!.isCoachOrViewer) return;
    tasks = tasks.where((t) => t.id != taskId).toList();
    subtasks = subtasks.where((s) => s.taskId != taskId).toList();
    notifyListeners();

    await _api.syncAction(
      action: 'DELETE_TASK',
      userId: currentUser!.id,
      payload: {'taskId': taskId},
    );
  }

  Future<void> toggleSubtask(String subtaskId) async {
    if (currentUser == null || currentUser!.isCoachOrViewer) return;
    subtasks = subtasks
        .map((s) => s.id == subtaskId ? s.copyWith(done: !s.done) : s)
        .toList();
    notifyListeners();

    await _api.syncAction(
      action: 'TOGGLE_SUBTASK',
      userId: currentUser!.id,
      payload: {'subtaskId': subtaskId},
    );
  }

  // M4 : Rapports
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

    await _api.syncAction(
      action: 'GENERATE_REPORT',
      userId: currentUser!.id,
      payload: {'projectId': activeProject.id},
    );
    await hydrateFromPrisma();
  }

  // M5 : Chat
  Future<void> sendMessage(String content) async {
    if (currentUser == null || content.trim().isEmpty) return;
    messages = [
      ...messages,
      ChatMessageItem(
        id: 'msg-${DateTime.now().millisecondsSinceEpoch}',
        channelId: activeProject.id,
        authorId: currentUser!.id,
        content: content.trim(),
        createdAt: DateTime.now(),
      ),
    ];
    notifyListeners();

    await _api.syncAction(
      action: 'SEND_MESSAGE',
      userId: currentUser!.id,
      payload: {'projectId': activeProject.id, 'content': content.trim()},
    );
    await hydrateFromPrisma();
  }

  // M6 : Fichiers (upload réel base64 vers uploads/)
  Future<bool> uploadRealFile({
    required String name,
    required List<int> bytes,
  }) async {
    if (currentUser == null || currentUser!.isCoachOrViewer || name.trim().isEmpty) {
      return false;
    }
    final trimmed = name.trim();
    final lower = trimmed.toLowerCase();
    final mime = lower.endsWith('.pdf')
        ? 'application/pdf'
        : (lower.endsWith('.png')
            ? 'image/png'
            : (lower.endsWith('.jpg') || lower.endsWith('.jpeg')
                ? 'image/jpeg'
                : 'application/octet-stream'));

    files = [
      FileAssetItem(
        id: 'file-${DateTime.now().millisecondsSinceEpoch}',
        projectId: activeProject.id,
        uploaderId: currentUser!.id,
        name: trimmed,
        mimeType: mime,
        size: bytes.length,
        createdAt: DateTime.now(),
      ),
      ...files,
    ];
    notifyListeners();

    final ok = await _api.syncAction(
      action: 'UPLOAD_FILE',
      userId: currentUser!.id,
      payload: {
        'projectId': activeProject.id,
        'name': trimmed,
        'mimeType': mime,
        'size': bytes.length,
        'contentBase64': base64Encode(bytes),
      },
    );
    await hydrateFromPrisma();
    return ok;
  }

  Future<void> deleteFile(String fileId) async {
    if (currentUser == null || currentUser!.isCoachOrViewer) return;
    files = files.where((f) => f.id != fileId).toList();
    notifyListeners();

    await _api.syncAction(
      action: 'DELETE_FILE',
      userId: currentUser!.id,
      payload: {'fileId': fileId},
    );
  }

  // M7 : Formations & Coaching
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

    await _api.syncAction(
      action: 'ENROLL_TRAINING',
      userId: currentUser!.id,
      payload: {'trainingId': trainingId},
    );
    return null;
  }

  Future<void> unenrollTraining(String trainingId) async {
    if (currentUser == null) return;
    enrollments = enrollments
        .where((e) => !(e.trainingId == trainingId && e.userId == currentUser!.id))
        .toList();
    notifyListeners();

    await _api.syncAction(
      action: 'UNENROLL_TRAINING',
      userId: currentUser!.id,
      payload: {'trainingId': trainingId},
    );
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

    await _api.syncAction(
      action: 'REQUEST_COACHING',
      userId: currentUser!.id,
      payload: {
        'coachId': coachId,
        'topic': topic,
        'proposedSlots': [slot],
        'durationMin': durationMin,
        'mode': mode,
        'projectId': activeProject.id,
      },
    );
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

    await _api.syncAction(
      action: 'CONFIRM_COACHING',
      userId: currentUser!.id,
      payload: {'sessionId': sessionId, 'scheduledAt': slotIso},
    );
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

    await _api.syncAction(
      action: 'COMPLETE_COACHING',
      userId: currentUser!.id,
      payload: {
        'sessionId': sessionId,
        'sharedReport': sharedReport,
        'privateNotes': privateNotes,
      },
    );
  }

  Future<void> updateGoalProgress(String goalId, int progress) async {
    if (currentUser == null) return;
    coachingGoals = coachingGoals
        .map((g) => g.id == goalId
            ? g.copyWith(progress: progress, status: progress >= 100 ? 'ACHIEVED' : 'OPEN')
            : g)
        .toList();
    notifyListeners();

    await _api.syncAction(
      action: 'UPDATE_GOAL_PROGRESS',
      userId: currentUser!.id,
      payload: {'goalId': goalId, 'progress': progress},
    );
  }

  // M2 : Colonnes Kanban
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

    await _api.syncAction(
      action: 'CREATE_COLUMN',
      userId: currentUser!.id,
      payload: {
        'id': colId,
        'projectId': activeProject.id,
        'name': trimmed,
        'position': newCol.position,
        'wipLimit': wipLimit,
        'isDone': isDone,
      },
    );
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

    await _api.syncAction(
      action: 'UPDATE_COLUMN',
      userId: currentUser!.id,
      payload: {
        'columnId': columnId,
        if (name != null) 'name': name.trim(),
        if (clearWipLimit) 'wipLimit': null else if (wipLimit != null) 'wipLimit': wipLimit,
        if (isDone != null) 'isDone': isDone,
      },
    );
  }

  Future<void> moveColumn(String columnId, ColumnMoveDirection direction) async {
    if (currentUser == null || currentUser!.isCoachOrViewer) return;
    columns = moveColumnByDirection(columns, activeProject.id, columnId, direction);
    notifyListeners();

    await _api.syncAction(
      action: 'REORDER_COLUMNS',
      userId: currentUser!.id,
      payload: {
        'columns': currentColumns.map((c) => {'id': c.id, 'position': c.position}).toList(),
      },
    );
  }

  Future<void> reorderColumns(String sourceColId, String targetColId) async {
    if (currentUser == null || currentUser!.isCoachOrViewer) return;
    columns = reorderProjectColumns(columns, activeProject.id, sourceColId, targetColId);
    notifyListeners();

    await _api.syncAction(
      action: 'REORDER_COLUMNS',
      userId: currentUser!.id,
      payload: {
        'columns': currentColumns.map((c) => {'id': c.id, 'position': c.position}).toList(),
      },
    );
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

    await _api.syncAction(
      action: 'DELETE_COLUMN',
      userId: currentUser!.id,
      payload: {
        'columnId': columnId,
        'fallbackColumnId': result.fallbackColumnId,
        'ensureDoneColumnId': result.ensureDoneColumnId,
      },
    );
    await _api.syncAction(
      action: 'REORDER_COLUMNS',
      userId: currentUser!.id,
      payload: {
        'columns': currentColumns.map((c) => {'id': c.id, 'position': c.position}).toList(),
      },
    );
    return result;
  }

  // Projets : Sélection, Création, Édition
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

    await _api.syncAction(
      action: 'CREATE_PROJECT',
      userId: currentUser!.id,
      payload: {'name': proj.name, 'description': proj.description, 'color': proj.color},
    );
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

    await _api.syncAction(
      action: 'UPDATE_PROJECT',
      userId: currentUser!.id,
      payload: {
        'projectId': projectId,
        if (name != null) 'name': name.trim(),
        if (description != null) 'description': description.trim(),
        if (color != null) 'color': color,
      },
    );
  }

  // M5 : Édition & Suppression de messages
  Future<void> editMessage(String messageId, String content) async {
    if (currentUser == null || content.trim().isEmpty) return;
    messages = messages
        .map((m) => m.id == messageId ? m.copyWith(content: content.trim()) : m)
        .toList();
    notifyListeners();

    await _api.syncAction(
      action: 'EDIT_MESSAGE',
      userId: currentUser!.id,
      payload: {'messageId': messageId, 'content': content.trim()},
    );
  }

  Future<void> deleteMessage(String messageId) async {
    if (currentUser == null) return;
    messages = messages.where((m) => m.id != messageId).toList();
    notifyListeners();

    await _api.syncAction(
      action: 'DELETE_MESSAGE',
      userId: currentUser!.id,
      payload: {'messageId': messageId},
    );
  }

  // M4 : Jalons & Rapports
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

    await _api.syncAction(
      action: 'CREATE_MILESTONE',
      userId: currentUser!.id,
      payload: {
        'projectId': activeProject.id,
        'title': m.title,
        'date': m.date.toIso8601String(),
        'description': m.description,
      },
    );
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

    await _api.syncAction(
      action: 'UPDATE_MILESTONE',
      userId: currentUser!.id,
      payload: {
        'milestoneId': milestoneId,
        if (title != null) 'title': title.trim(),
        if (date != null) 'date': date.toIso8601String(),
        if (description != null) 'description': description.trim(),
      },
    );
  }

  Future<void> deleteReport(String reportId) async {
    if (currentUser == null) return;
    reports = reports.where((r) => r.id != reportId).toList();
    notifyListeners();

    await _api.syncAction(
      action: 'DELETE_REPORT',
      userId: currentUser!.id,
      payload: {'reportId': reportId},
    );
  }

  // M7 : Formations, Coaching, Objectifs & Compétences
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

    await _api.syncAction(
      action: 'CREATE_TRAINING',
      userId: currentUser!.id,
      payload: {
        'title': tr.title,
        'description': tr.description,
        'skill': tr.skill,
        'level': tr.level,
        'capacity': tr.capacity,
        'mode': tr.mode,
        'location': tr.location,
        'startsAt': tr.startsAt.toIso8601String(),
        'endsAt': tr.endsAt.toIso8601String(),
      },
    );
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

    await _api.syncAction(
      action: 'UPDATE_TRAINING',
      userId: currentUser!.id,
      payload: {
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
      },
    );
  }

  Future<void> deleteTraining(String trainingId) async {
    if (currentUser == null) return;
    trainings = trainings.where((t) => t.id != trainingId).toList();
    enrollments = enrollments.where((e) => e.trainingId != trainingId).toList();
    notifyListeners();

    await _api.syncAction(
      action: 'DELETE_TRAINING',
      userId: currentUser!.id,
      payload: {'trainingId': trainingId},
    );
  }

  Future<void> deleteCoaching(String sessionId) async {
    if (currentUser == null) return;
    coachingSessions = coachingSessions.where((s) => s.id != sessionId).toList();
    notifyListeners();

    await _api.syncAction(
      action: 'DELETE_COACHING',
      userId: currentUser!.id,
      payload: {'sessionId': sessionId},
    );
  }

  Future<void> deleteGoal(String goalId) async {
    if (currentUser == null) return;
    coachingGoals = coachingGoals.where((g) => g.id != goalId).toList();
    notifyListeners();

    await _api.syncAction(
      action: 'DELETE_GOAL',
      userId: currentUser!.id,
      payload: {'goalId': goalId},
    );
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

    await _api.syncAction(
      action: 'ASSESS_SKILL',
      userId: currentUser!.id,
      payload: {
        'targetUserId': targetUserId,
        'skill': trimmedSkill,
        'level': level,
        'selfAssessed': selfAssessed,
      },
    );
  }

  Future<bool> joinTeam(String inviteToken) async {
    if (currentUser == null || inviteToken.trim().isEmpty) return false;
    final ok = await _api.syncAction(
      action: 'JOIN_TEAM',
      userId: currentUser!.id,
      payload: {'inviteToken': inviteToken.trim()},
    );
    if (ok) {
      await hydrateFromPrisma();
    }
    return ok;
  }

  Future<bool> inviteMember(String email, {String role = 'MEMBER'}) async {
    if (currentUser == null || email.trim().isEmpty) return false;
    final ok = await _api.syncAction(
      action: 'INVITE_MEMBER',
      userId: currentUser!.id,
      payload: {'email': email.trim(), 'role': role},
    );
    if (ok) {
      await hydrateFromPrisma();
    }
    return ok;
  }
}

