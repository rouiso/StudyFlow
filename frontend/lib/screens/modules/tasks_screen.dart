import 'package:flutter/material.dart';
import '../../state/studyflow_store.dart';

class TasksScreen extends StatefulWidget {
  const TasksScreen({super.key, required this.store});
  final StudyFlowStore store;

  @override
  State<TasksScreen> createState() => _TasksScreenState();
}

class _TasksScreenState extends State<TasksScreen> {
  bool _onlyMyTasks = false;
  String _columnFilter = 'ALL';

  @override
  Widget build(BuildContext context) {
    final user = widget.store.currentUser!;
    final columns = widget.store.currentColumns;
    final tasks = widget.store.currentTasks.where((t) {
      if (_columnFilter != 'ALL' && t.columnId != _columnFilter) return false;
      if (_onlyMyTasks && !t.assigneeIds.contains(user.id)) return false;
      return true;
    }).toList();

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: Wrap(
            spacing: 8,
            runSpacing: 8,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              FilterChip(
                selected: _onlyMyTasks,
                label: Text('Mes tâches (${user.name.split(' ').first})'),
                onSelected: (v) => setState(() => _onlyMyTasks = v),
              ),
              DropdownButton<String>(
                value: _columnFilter,
                underline: const SizedBox.shrink(),
                items: [
                  const DropdownMenuItem(value: 'ALL', child: Text('Toutes les colonnes')),
                  ...columns.map((c) => DropdownMenuItem(value: c.id, child: Text(c.name))),
                ],
                onChanged: (v) => setState(() => _columnFilter = v ?? 'ALL'),
              ),
            ],
          ),
        ),
        Expanded(
          child: tasks.isEmpty
              ? const Center(child: Text('Aucune tâche trouvée', style: TextStyle(color: Colors.grey)))
              : ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 20),
                  itemCount: tasks.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                  itemBuilder: (context, idx) {
                    final task = tasks[idx];
                    final col = columns.isEmpty
                        ? null
                        : columns.firstWhere((c) => c.id == task.columnId, orElse: () => columns.first);
                    final subs = widget.store.subtasks.where((s) => s.taskId == task.id).toList();
                    final doneSubs = subs.where((s) => s.done).length;
                    final isOverdue = task.dueDate != null &&
                        task.dueDate!.isBefore(DateTime.now()) &&
                        !(col?.isDone ?? false);

                    return Card(
                      child: ExpansionTile(
                        title: Text(task.title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                        subtitle: Wrap(
                          spacing: 10,
                          runSpacing: 4,
                          children: [
                            Text(col?.name ?? 'Sans colonne', style: const TextStyle(fontSize: 11, color: Color(0xFF818CF8))),
                            if (task.dueDate != null)
                              Text(
                                '${task.dueDate!.day}/${task.dueDate!.month}',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: isOverdue ? Colors.redAccent : Colors.grey,
                                  fontWeight: isOverdue ? FontWeight.bold : null,
                                ),
                              ),
                            if (subs.isNotEmpty)
                              Text('$doneSubs/${subs.length} sous-tâches', style: const TextStyle(fontSize: 11)),
                          ],
                        ),
                        children: [
                          if (task.description.isNotEmpty)
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                              child: Align(
                                alignment: Alignment.centerLeft,
                                child: Text(task.description, style: const TextStyle(fontSize: 12, color: Colors.grey)),
                              ),
                            ),
                          ...subs.map(
                            (s) => CheckboxListTile(
                              value: s.done,
                              dense: true,
                              title: Text(s.title, style: const TextStyle(fontSize: 13)),
                              onChanged: user.isCoachOrViewer ? null : (_) => widget.store.toggleSubtask(s.id),
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }
}

