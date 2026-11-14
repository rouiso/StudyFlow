import 'package:flutter_test/flutter_test.dart';
import 'package:studyflow/core/domain/kanban_columns.dart';
import 'package:studyflow/core/models/studyflow_models.dart';

void main() {
  group('Kanban Columns Management', () {
    final cols = [
      const KanbanColumnItem(id: 'c1', projectId: 'p1', name: 'À faire', position: 1000),
      const KanbanColumnItem(id: 'c2', projectId: 'p1', name: 'En cours', position: 2000),
      const KanbanColumnItem(id: 'c3', projectId: 'p1', name: 'Terminé', position: 3000, isDone: true),
      const KanbanColumnItem(id: 'other', projectId: 'p2', name: 'Autre', position: 1000),
    ];

    final tasks = [
      const TaskItem(
        id: 't1',
        projectId: 'p1',
        columnId: 'c3',
        title: 'Task in done',
        description: '',
        position: 1000,
        priority: TaskPriority.normale,
        createdById: 'u1',
      ),
    ];

    test('reorderProjectColumns moves source to target and recalculates positions', () {
      final reordered = reorderProjectColumns(cols, 'p1', 'c3', 'c1');
      final p1Cols = reordered.where((c) => c.projectId == 'p1').toList()
        ..sort((a, b) => a.position.compareTo(b.position));
      expect(p1Cols.map((c) => c.id).toList(), ['c3', 'c1', 'c2']);
      expect(p1Cols.map((c) => c.position).toList(), [1000.0, 2000.0, 3000.0]);
    });

    test('moveColumnByDirection shifts column left or right', () {
      final moved = moveColumnByDirection(cols, 'p1', 'c2', ColumnMoveDirection.left);
      final p1Cols = moved.where((c) => c.projectId == 'p1').toList()
        ..sort((a, b) => a.position.compareTo(b.position));
      expect(p1Cols.map((c) => c.id).toList(), ['c2', 'c1', 'c3']);
    });

    test('deleteProjectColumn refuses deleting the last column', () {
      final res = deleteProjectColumn(cols, tasks, 'p2', 'other');
      expect(res.ok, isFalse);
      expect(res.error, isNotNull);
    });

    test('deleteProjectColumn migrates tasks and preserves isDone', () {
      final res = deleteProjectColumn(cols, tasks, 'p1', 'c3');
      expect(res.ok, isTrue);
      expect(res.migratedTaskCount, 1);
      expect(res.fallbackColumnId, 'c1');
      expect(res.ensureDoneColumnId, 'c2');

      final migratedTask = res.tasks.firstWhere((t) => t.id == 't1');
      expect(migratedTask.columnId, 'c1');
      expect(migratedTask.completedAt, isNull);

      final c2 = res.columns.firstWhere((c) => c.id == 'c2');
      expect(c2.isDone, isTrue);
    });
  });
}

