import '../models/studyflow_models.dart';

enum ColumnMoveDirection { left, right }

class DeleteColumnResult {
  const DeleteColumnResult({
    required this.ok,
    this.error,
    required this.columns,
    required this.tasks,
    this.fallbackColumnId,
    this.fallbackColumnName,
    this.ensureDoneColumnId,
    this.migratedTaskCount = 0,
  });

  final bool ok;
  final String? error;
  final List<KanbanColumnItem> columns;
  final List<TaskItem> tasks;
  final String? fallbackColumnId;
  final String? fallbackColumnName;
  final String? ensureDoneColumnId;
  final int migratedTaskCount;
}

/// Réorganise les colonnes d'un projet en déplaçant `sourceColId` à la position de `targetColId`
/// et recalcule les positions (1000, 2000, 3000...).
List<KanbanColumnItem> reorderProjectColumns(
  List<KanbanColumnItem> allColumns,
  String projectId,
  String sourceColId,
  String targetColId,
) {
  if (sourceColId == targetColId) return allColumns;

  final projectCols = allColumns.where((c) => c.projectId == projectId).toList()
    ..sort((a, b) => a.position.compareTo(b.position));

  final sourceIdx = projectCols.indexWhere((c) => c.id == sourceColId);
  final targetIdx = projectCols.indexWhere((c) => c.id == targetColId);

  if (sourceIdx == -1 || targetIdx == -1) return allColumns;

  final reordered = List<KanbanColumnItem>.of(projectCols);
  final moved = reordered.removeAt(sourceIdx);
  reordered.insert(targetIdx, moved);

  final positionMap = <String, double>{};
  for (var i = 0; i < reordered.length; i++) {
    positionMap[reordered[i].id] = (i + 1) * 1000.0;
  }

  return allColumns.map((col) {
    final nextPos = positionMap[col.id];
    return nextPos != null ? col.copyWith(position: nextPos) : col;
  }).toList();
}

/// Déplace une colonne d'un cran vers la gauche ou vers la droite.
List<KanbanColumnItem> moveColumnByDirection(
  List<KanbanColumnItem> allColumns,
  String projectId,
  String columnId,
  ColumnMoveDirection direction,
) {
  final projectCols = allColumns.where((c) => c.projectId == projectId).toList()
    ..sort((a, b) => a.position.compareTo(b.position));

  final idx = projectCols.indexWhere((c) => c.id == columnId);
  if (idx == -1) return allColumns;

  final targetIdx = direction == ColumnMoveDirection.left ? idx - 1 : idx + 1;
  if (targetIdx < 0 || targetIdx >= projectCols.length) return allColumns;

  return reorderProjectColumns(
    allColumns,
    projectId,
    columnId,
    projectCols[targetIdx].id,
  );
}

/// Supprime une colonne d'un projet.
/// - Refuse la suppression s'il ne reste qu'une seule colonne dans le projet.
/// - Transfère automatiquement les tâches vers la première colonne restante.
/// - Si la colonne supprimée était `isDone`, transfère `isDone` à la dernière colonne restante.
DeleteColumnResult deleteProjectColumn(
  List<KanbanColumnItem> allColumns,
  List<TaskItem> allTasks,
  String projectId,
  String columnId,
) {
  final projectCols = allColumns.where((c) => c.projectId == projectId).toList()
    ..sort((a, b) => a.position.compareTo(b.position));

  if (projectCols.length <= 1) {
    return DeleteColumnResult(
      ok: false,
      error: 'Impossible de supprimer la dernière colonne du tableau Kanban.',
      columns: allColumns,
      tasks: allTasks,
    );
  }

  final targetIndex = projectCols.indexWhere((c) => c.id == columnId);
  if (targetIndex == -1) {
    return DeleteColumnResult(
      ok: false,
      error: 'Colonne introuvable.',
      columns: allColumns,
      tasks: allTasks,
    );
  }
  final targetCol = projectCols[targetIndex];

  final remaining = <KanbanColumnItem>[];
  var posIdx = 0;
  for (final c in projectCols) {
    if (c.id == columnId) continue;
    posIdx++;
    remaining.add(c.copyWith(position: posIdx * 1000.0));
  }

  String? ensureDoneColumnId;
  if (targetCol.isDone && !remaining.any((c) => c.isDone)) {
    final last = remaining.last.copyWith(isDone: true);
    remaining[remaining.length - 1] = last;
    ensureDoneColumnId = last.id;
  }

  final fallbackCol = remaining.first;
  var migratedTaskCount = 0;

  final updatedTasks = allTasks.map((t) {
    if (t.columnId == columnId) {
      migratedTaskCount++;
      return t.copyWith(
        columnId: fallbackCol.id,
        completedAt: fallbackCol.isDone ? (t.completedAt ?? DateTime.now()) : null,
        clearCompletedAt: !fallbackCol.isDone,
      );
    }
    return t;
  }).toList();

  final remainingById = {for (final c in remaining) c.id: c};
  final updatedColumns = allColumns
      .where((c) => c.id != columnId)
      .map((c) => remainingById[c.id] ?? c)
      .toList();

  return DeleteColumnResult(
    ok: true,
    columns: updatedColumns,
    tasks: updatedTasks,
    fallbackColumnId: fallbackCol.id,
    fallbackColumnName: fallbackCol.name,
    ensureDoneColumnId: ensureDoneColumnId,
    migratedTaskCount: migratedTaskCount,
  );
}

