import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../../core/domain/kanban_columns.dart';
import '../../core/models/studyflow_models.dart';
import '../../state/studyflow_store.dart';

class KanbanScreen extends StatefulWidget {
  const KanbanScreen({super.key, required this.store});
  final StudyFlowStore store;

  @override
  State<KanbanScreen> createState() => _KanbanScreenState();
}

class _KanbanScreenState extends State<KanbanScreen> {
  String _search = '';
  bool _onlyMyTasks = false;
  TaskPriority? _priorityFilter;

  @override
  Widget build(BuildContext context) {
    final user = widget.store.currentUser!;
    final isReadOnly = user.isCoachOrViewer;
    final columns = widget.store.currentColumns;
    final allTasks = widget.store.currentTasks;

    final filtered = allTasks.where((t) {
      if (_search.trim().isNotEmpty) {
        final q = _search.toLowerCase();
        if (!t.title.toLowerCase().contains(q) &&
            !t.description.toLowerCase().contains(q)) {
          return false;
        }
      }
      if (_priorityFilter != null && t.priority != _priorityFilter) {
        return false;
      }
      if (_onlyMyTasks && !t.assigneeIds.contains(user.id)) {
        return false;
      }
      return true;
    }).toList();

    return Column(
      children: [
        // Bannière Coach (§4.2)
        if (isReadOnly)
          Container(
            margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFF3B0764).withValues(alpha: 0.45),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFFA855F7).withValues(alpha: 0.45)),
            ),
            child: Row(
              children: [
                const Icon(Icons.school, color: Color(0xFFD8B4FE), size: 20),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Mode Coach (${user.name}) : lecture seule. L\'édition et le déplacement des tâches sont réservés aux membres.',
                    style: const TextStyle(color: Color(0xFFE9D5FF), fontSize: 12),
                  ),
                ),
              ],
            ),
          ),

        // Barre de filtres & actions
        Padding(
          padding: const EdgeInsets.all(16),
          child: Wrap(
            spacing: 8,
            runSpacing: 8,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              SizedBox(
                width: MediaQuery.sizeOf(context).width < 520 ? double.infinity : 240,
                child: TextField(
                  onChanged: (v) => setState(() => _search = v),
                  decoration: InputDecoration(
                    hintText: 'Rechercher une tâche...',
                    prefixIcon: const Icon(Icons.search, size: 18),
                    isDense: true,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ),
              FilterChip(
                selected: _onlyMyTasks,
                label: Text('Mes tâches (${user.name.split(' ').first})'),
                avatar: const Icon(Icons.person_pin_circle_outlined, size: 16),
                onSelected: (v) => setState(() => _onlyMyTasks = v),
              ),
              DropdownButton<TaskPriority?>(
                value: _priorityFilter,
                hint: const Text('Priorité', style: TextStyle(fontSize: 12)),
                underline: const SizedBox.shrink(),
                items: const [
                  DropdownMenuItem(value: null, child: Text('Toutes priorités')),
                  DropdownMenuItem(value: TaskPriority.urgente, child: Text('Urgente')),
                  DropdownMenuItem(value: TaskPriority.haute, child: Text('Haute')),
                  DropdownMenuItem(value: TaskPriority.normale, child: Text('Normale')),
                  DropdownMenuItem(value: TaskPriority.basse, child: Text('Basse')),
                ],
                onChanged: (v) => setState(() => _priorityFilter = v),
              ),
              if (!isReadOnly) ...[
                FilledButton.icon(
                  onPressed: columns.isEmpty ? null : () => _openCreateTaskModal(context, columns.first.id),
                  icon: const Icon(Icons.add, size: 18),
                  label: const Text('Nouvelle tâche'),
                ),
                OutlinedButton.icon(
                  onPressed: () => _openColumnDialog(context),
                  icon: const Icon(Icons.view_column_outlined, size: 18),
                  label: const Text('Colonne'),
                ),
              ],
            ],
          ),
        ),

        // Tableau Kanban Horizontal
        Expanded(
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            itemCount: columns.length,
            separatorBuilder: (_, __) => const SizedBox(width: 12),
            itemBuilder: (context, colIndex) {
              final col = columns[colIndex];
              final colTasks = filtered.where((t) => t.columnId == col.id).toList();
              final wipExceeded = col.wipLimit != null && colTasks.length > col.wipLimit!;

              final colWidth = math.min(300.0, math.max(240.0, MediaQuery.sizeOf(context).width - 48));
              return Container(
                width: colWidth,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surfaceContainerHighest.withValues(alpha: 0.45),
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(
                    color: Theme.of(context).colorScheme.outlineVariant.withValues(alpha: 0.4),
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // En-tête de colonne + WIP Limit + Menu colonne
                    Row(
                      children: [
                        Container(
                          width: 10,
                          height: 10,
                          decoration: BoxDecoration(
                            color: _parseHexColor(col.color) ??
                                (col.isDone ? const Color(0xFF10B981) : const Color(0xFF4F46E5)),
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            col.name,
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: Theme.of(context).colorScheme.surface,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text('${colTasks.length}', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                        ),
                        if (col.wipLimit != null) ...[
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: wipExceeded ? Colors.red.withValues(alpha: 0.2) : Colors.grey.withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              'Max ${col.wipLimit}',
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: wipExceeded ? Colors.redAccent : null,
                              ),
                            ),
                          ),
                        ],
                        if (!isReadOnly)
                          PopupMenuButton<String>(
                            icon: const Icon(Icons.more_vert, size: 18),
                            padding: EdgeInsets.zero,
                            onSelected: (action) async {
                              if (action == 'edit') {
                                _openColumnDialog(context, existing: col);
                              } else if (action == 'left') {
                                await widget.store.moveColumn(col.id, ColumnMoveDirection.left);
                              } else if (action == 'right') {
                                await widget.store.moveColumn(col.id, ColumnMoveDirection.right);
                              } else if (action == 'delete') {
                                _confirmDeleteColumn(context, col, colTasks.length);
                              }
                            },
                            itemBuilder: (_) => [
                              const PopupMenuItem(value: 'edit', child: Text('Modifier la colonne')),
                              if (colIndex > 0)
                                const PopupMenuItem(value: 'left', child: Text('Déplacer à gauche')),
                              if (colIndex < columns.length - 1)
                                const PopupMenuItem(value: 'right', child: Text('Déplacer à droite')),
                              const PopupMenuItem(
                                value: 'delete',
                                child: Text('Supprimer', style: TextStyle(color: Colors.redAccent)),
                              ),
                            ],
                          ),
                      ],
                    ),
                    const Divider(height: 18),

                    // Cartes
                    Expanded(
                      child: colTasks.isEmpty
                          ? const Center(
                              child: Text('Aucune tâche', style: TextStyle(color: Colors.grey, fontSize: 12)),
                            )
                          : ListView.separated(
                              itemCount: colTasks.length,
                              separatorBuilder: (_, __) => const SizedBox(height: 10),
                              itemBuilder: (context, idx) {
                                final task = colTasks[idx];
                                final subs = widget.store.subtasks.where((s) => s.taskId == task.id).toList();
                                final doneSubs = subs.where((s) => s.done).length;
                                final isOverdue = task.dueDate != null &&
                                    task.dueDate!.isBefore(DateTime.now()) &&
                                    !col.isDone;
                                final assignees = widget.store.users
                                    .where((u) => task.assigneeIds.contains(u.id))
                                    .toList();

                                return Card(
                                  child: InkWell(
                                    borderRadius: BorderRadius.circular(18),
                                    onTap: () => _openTaskDetails(context, task),
                                    child: Padding(
                                      padding: const EdgeInsets.all(12),
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Row(
                                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                            children: [
                                              _PriorityChip(priority: task.priority),
                                              if (!isReadOnly)
                                                Row(
                                                  mainAxisSize: MainAxisSize.min,
                                                  children: [
                                                    if (colIndex > 0)
                                                      IconButton(
                                                        icon: const Icon(Icons.chevron_left, size: 18),
                                                        visualDensity: VisualDensity.compact,
                                                        tooltip: 'Déplacer vers ${columns[colIndex - 1].name}',
                                                        onPressed: () => widget.store.moveTask(
                                                          task.id,
                                                          columns[colIndex - 1].id,
                                                        ),
                                                      ),
                                                    if (colIndex < columns.length - 1)
                                                      IconButton(
                                                        icon: const Icon(Icons.chevron_right, size: 18),
                                                        visualDensity: VisualDensity.compact,
                                                        tooltip: 'Déplacer vers ${columns[colIndex + 1].name}',
                                                        onPressed: () => widget.store.moveTask(
                                                          task.id,
                                                          columns[colIndex + 1].id,
                                                        ),
                                                      ),
                                                  ],
                                                ),
                                            ],
                                          ),
                                          const SizedBox(height: 6),
                                          Text(
                                            task.title,
                                            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                                          ),
                                          if (task.description.isNotEmpty) ...[
                                            const SizedBox(height: 4),
                                            Text(
                                              task.description,
                                              maxLines: 2,
                                              overflow: TextOverflow.ellipsis,
                                              style: const TextStyle(fontSize: 11, color: Colors.grey),
                                            ),
                                          ],
                                          const SizedBox(height: 10),
                                          Row(
                                            children: [
                                              if (task.dueDate != null)
                                                Row(
                                                  children: [
                                                    Icon(
                                                      Icons.schedule,
                                                      size: 13,
                                                      color: isOverdue ? Colors.redAccent : Colors.grey,
                                                    ),
                                                    const SizedBox(width: 4),
                                                    Text(
                                                      '${task.dueDate!.day}/${task.dueDate!.month}',
                                                      style: TextStyle(
                                                        fontSize: 11,
                                                        color: isOverdue ? Colors.redAccent : Colors.grey,
                                                        fontWeight: isOverdue ? FontWeight.bold : null,
                                                      ),
                                                    ),
                                                  ],
                                                ),
                                              const SizedBox(width: 10),
                                              if (subs.isNotEmpty)
                                                Row(
                                                  children: [
                                                    const Icon(Icons.check_box_outlined, size: 13, color: Colors.teal),
                                                    const SizedBox(width: 3),
                                                    Text('$doneSubs/${subs.length}', style: const TextStyle(fontSize: 11)),
                                                  ],
                                                ),
                                              const Spacer(),
                                              ...assignees.map(
                                                (a) => Padding(
                                                  padding: const EdgeInsets.only(left: 2),
                                                  child: CircleAvatar(
                                                    radius: 10,
                                                    child: Text(
                                                      a.name.substring(0, 1),
                                                      style: const TextStyle(fontSize: 9, fontWeight: FontWeight.bold),
                                                    ),
                                                  ),
                                                ),
                                              ),
                                            ],
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                );
                              },
                            ),
                    ),

                    if (!isReadOnly) ...[
                      const SizedBox(height: 8),
                      OutlinedButton.icon(
                        onPressed: () => _openCreateTaskModal(context, col.id),
                        icon: const Icon(Icons.add, size: 16),
                        label: const Text('Ajouter une carte', style: TextStyle(fontSize: 12)),
                      ),
                    ] else
                      const Padding(
                        padding: EdgeInsets.only(top: 8),
                        child: Text(
                          'Édition verrouillée (Mode Coach)',
                          textAlign: TextAlign.center,
                          style: TextStyle(fontSize: 11, color: Colors.grey, fontStyle: FontStyle.italic),
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

  void _openCreateTaskModal(BuildContext context, String defaultColId) {
    final titleCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    final subtaskCtrl = TextEditingController();
    final columns = widget.store.currentColumns;
    final users = widget.store.users;
    final currentUser = widget.store.currentUser!;

    String selectedColumnId = defaultColId;
    TaskPriority selectedPriority = TaskPriority.normale;
    DateTime? selectedDueDate;
    final selectedAssignees = <String>{currentUser.id};
    final List<String> subtasksList = [];

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => Padding(
          padding: EdgeInsets.fromLTRB(20, 20, 20, MediaQuery.of(ctx).viewInsets.bottom + 20),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text('Nouvelle tâche', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 12),
                TextField(
                  controller: titleCtrl,
                  decoration: const InputDecoration(labelText: 'Titre de la tâche', border: OutlineInputBorder()),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: descCtrl,
                  maxLines: 2,
                  decoration: const InputDecoration(labelText: 'Description', border: OutlineInputBorder()),
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: DropdownButtonFormField<TaskPriority>(
                        initialValue: selectedPriority,
                        decoration: const InputDecoration(labelText: 'Priorité', isDense: true),
                        items: const [
                          DropdownMenuItem(value: TaskPriority.basse, child: Text('Basse')),
                          DropdownMenuItem(value: TaskPriority.normale, child: Text('Normale')),
                          DropdownMenuItem(value: TaskPriority.haute, child: Text('Haute')),
                          DropdownMenuItem(value: TaskPriority.urgente, child: Text('Urgente')),
                        ],
                        onChanged: (v) => setModalState(() => selectedPriority = v ?? TaskPriority.normale),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        initialValue: selectedColumnId,
                        decoration: const InputDecoration(labelText: 'Colonne', isDense: true),
                        items: columns
                            .map((c) => DropdownMenuItem(value: c.id, child: Text(c.name)))
                            .toList(),
                        onChanged: (v) => setModalState(() => selectedColumnId = v ?? defaultColId),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    const Icon(Icons.calendar_today_outlined, size: 18, color: Colors.grey),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        selectedDueDate == null
                            ? 'Aucune échéance'
                            : 'Échéance : ${selectedDueDate!.day}/${selectedDueDate!.month}/${selectedDueDate!.year}',
                        style: const TextStyle(fontSize: 13),
                      ),
                    ),
                    if (selectedDueDate != null)
                      IconButton(
                        tooltip: 'Effacer la date',
                        icon: const Icon(Icons.clear, size: 18),
                        onPressed: () => setModalState(() => selectedDueDate = null),
                      ),
                    TextButton(
                      onPressed: () async {
                        final picked = await showDatePicker(
                          context: ctx,
                          initialDate: selectedDueDate ?? DateTime.now(),
                          firstDate: DateTime(2024),
                          lastDate: DateTime(2030),
                        );
                        if (picked != null) {
                          setModalState(() => selectedDueDate = picked);
                        }
                      },
                      child: Text(selectedDueDate == null ? 'Choisir une date' : 'Modifier'),
                    ),
                  ],
                ),
                if (users.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  const Text('Assignés :', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 4),
                  Wrap(
                    spacing: 6,
                    runSpacing: 4,
                    children: users.map((u) {
                      final isSel = selectedAssignees.contains(u.id);
                      return FilterChip(
                        selected: isSel,
                        visualDensity: VisualDensity.compact,
                        label: Text(u.name.split(' ').first, style: const TextStyle(fontSize: 11)),
                        onSelected: (v) => setModalState(() {
                          if (v) {
                            selectedAssignees.add(u.id);
                          } else {
                            selectedAssignees.remove(u.id);
                          }
                        }),
                      );
                    }).toList(),
                  ),
                ],
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: subtaskCtrl,
                        decoration: const InputDecoration(
                          hintText: 'Ajouter une sous-tâche...',
                          isDense: true,
                          border: OutlineInputBorder(),
                        ),
                        onSubmitted: (val) {
                          if (val.trim().isEmpty) return;
                          setModalState(() {
                            subtasksList.add(val.trim());
                            subtaskCtrl.clear();
                          });
                        },
                      ),
                    ),
                    const SizedBox(width: 6),
                    IconButton(
                      tooltip: 'Ajouter',
                      icon: const Icon(Icons.add_circle_outline),
                      onPressed: () {
                        if (subtaskCtrl.text.trim().isEmpty) return;
                        setModalState(() {
                          subtasksList.add(subtaskCtrl.text.trim());
                          subtaskCtrl.clear();
                        });
                      },
                    ),
                    TextButton.icon(
                      onPressed: () {
                        setModalState(() {
                          for (final s in aiBreakdownTask(titleCtrl.text)) {
                            if (!subtasksList.contains(s)) subtasksList.add(s);
                          }
                        });
                      },
                      icon: const Icon(Icons.auto_awesome, size: 16),
                      label: const Text('IA'),
                    ),
                  ],
                ),
                if (subtasksList.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  ...subtasksList.asMap().entries.map(
                        (e) => Row(
                          children: [
                            Expanded(child: Text('• ${e.value}', style: const TextStyle(fontSize: 12))),
                            IconButton(
                              constraints: const BoxConstraints(),
                              padding: EdgeInsets.zero,
                              iconSize: 16,
                              icon: const Icon(Icons.close, color: Colors.grey),
                              onPressed: () => setModalState(() => subtasksList.removeAt(e.key)),
                            ),
                          ],
                        ),
                      ),
                ],
                const SizedBox(height: 14),
                FilledButton(
                  onPressed: () {
                    if (titleCtrl.text.trim().isEmpty) return;
                    widget.store.createTask(
                      columnId: selectedColumnId,
                      title: titleCtrl.text.trim(),
                      description: descCtrl.text.trim(),
                      priority: selectedPriority,
                      dueDate: selectedDueDate,
                      assigneeIds: selectedAssignees.toList(),
                      subtaskTitles: subtasksList,
                    );
                    Navigator.pop(ctx);
                  },
                  child: const Text('Créer la tâche'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _openTaskDetails(BuildContext context, TaskItem task) {
    final user = widget.store.currentUser!;
    showModalBottomSheet(
      context: context,
      builder: (ctx) => ListenableBuilder(
        listenable: widget.store,
        builder: (ctx, _) {
          final subs = widget.store.subtasks.where((s) => s.taskId == task.id).toList();
          return Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    _PriorityChip(priority: task.priority),
                    const Spacer(),
                    if (!user.isCoachOrViewer) ...[
                      IconButton(
                        tooltip: 'Modifier la tâche',
                        icon: const Icon(Icons.edit_outlined, color: Color(0xFF818CF8)),
                        onPressed: () {
                          Navigator.pop(ctx);
                          _openEditTaskModal(context, task);
                        },
                      ),
                      IconButton(
                        tooltip: 'Supprimer la tâche',
                        icon: const Icon(Icons.delete_outline, color: Colors.redAccent),
                        onPressed: () {
                          widget.store.deleteTask(task.id);
                          Navigator.pop(ctx);
                        },
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 8),
                Text(task.title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                if (task.description.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Text(task.description, style: const TextStyle(color: Colors.grey)),
                ],
                const SizedBox(height: 14),
                Text('Sous-tâches (${subs.where((s) => s.done).length}/${subs.length})',
                    style: const TextStyle(fontWeight: FontWeight.bold)),
                if (subs.isEmpty)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 8),
                    child: Text('Aucune sous-tâche.', style: TextStyle(fontSize: 12, color: Colors.grey)),
                  )
                else
                  ...subs.map(
                    (s) => CheckboxListTile(
                      value: s.done,
                      dense: true,
                      title: Text(s.title),
                      onChanged: user.isCoachOrViewer ? null : (_) => widget.store.toggleSubtask(s.id),
                    ),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }

  void _openEditTaskModal(BuildContext context, TaskItem task) {
    final titleCtrl = TextEditingController(text: task.title);
    final descCtrl = TextEditingController(text: task.description);
    TaskPriority selectedPriority = task.priority;
    String selectedColumnId = task.columnId;
    DateTime? selectedDueDate = task.dueDate;
    final selectedAssignees = Set<String>.from(task.assigneeIds);
    final columns = widget.store.currentColumns;
    final users = widget.store.users;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => Padding(
          padding: EdgeInsets.fromLTRB(20, 20, 20, MediaQuery.of(ctx).viewInsets.bottom + 20),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text('Modifier la tâche', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 12),
                TextField(
                  controller: titleCtrl,
                  decoration: const InputDecoration(labelText: 'Titre', border: OutlineInputBorder()),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: descCtrl,
                  maxLines: 2,
                  decoration: const InputDecoration(labelText: 'Description', border: OutlineInputBorder()),
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: DropdownButtonFormField<TaskPriority>(
                        initialValue: selectedPriority,
                        decoration: const InputDecoration(labelText: 'Priorité', isDense: true),
                        items: const [
                          DropdownMenuItem(value: TaskPriority.basse, child: Text('Basse')),
                          DropdownMenuItem(value: TaskPriority.normale, child: Text('Normale')),
                          DropdownMenuItem(value: TaskPriority.haute, child: Text('Haute')),
                          DropdownMenuItem(value: TaskPriority.urgente, child: Text('Urgente')),
                        ],
                        onChanged: (v) => setModalState(() => selectedPriority = v ?? task.priority),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        initialValue: selectedColumnId,
                        decoration: const InputDecoration(labelText: 'Colonne', isDense: true),
                        items: columns
                            .map((c) => DropdownMenuItem(value: c.id, child: Text(c.name)))
                            .toList(),
                        onChanged: (v) => setModalState(() => selectedColumnId = v ?? task.columnId),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    const Icon(Icons.calendar_today_outlined, size: 18, color: Colors.grey),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        selectedDueDate == null
                            ? 'Aucune échéance'
                            : 'Échéance : ${selectedDueDate!.day}/${selectedDueDate!.month}/${selectedDueDate!.year}',
                        style: const TextStyle(fontSize: 13),
                      ),
                    ),
                    if (selectedDueDate != null)
                      IconButton(
                        tooltip: 'Effacer la date',
                        icon: const Icon(Icons.clear, size: 18),
                        onPressed: () => setModalState(() => selectedDueDate = null),
                      ),
                    TextButton(
                      onPressed: () async {
                        final picked = await showDatePicker(
                          context: ctx,
                          initialDate: selectedDueDate ?? DateTime.now(),
                          firstDate: DateTime(2024),
                          lastDate: DateTime(2030),
                        );
                        if (picked != null) {
                          setModalState(() => selectedDueDate = picked);
                        }
                      },
                      child: Text(selectedDueDate == null ? 'Choisir une date' : 'Modifier'),
                    ),
                  ],
                ),
                if (users.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  const Text('Assignés :', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 4),
                  Wrap(
                    spacing: 6,
                    runSpacing: 4,
                    children: users.map((u) {
                      final isSel = selectedAssignees.contains(u.id);
                      return FilterChip(
                        selected: isSel,
                        visualDensity: VisualDensity.compact,
                        label: Text(u.name.split(' ').first, style: const TextStyle(fontSize: 11)),
                        onSelected: (v) => setModalState(() {
                          if (v) {
                            selectedAssignees.add(u.id);
                          } else {
                            selectedAssignees.remove(u.id);
                          }
                        }),
                      );
                    }).toList(),
                  ),
                ],
                const SizedBox(height: 14),
                FilledButton(
                  onPressed: () {
                    if (titleCtrl.text.trim().isEmpty) return;
                    widget.store.updateTask(
                      taskId: task.id,
                      title: titleCtrl.text.trim(),
                      description: descCtrl.text.trim(),
                      priority: selectedPriority,
                      columnId: selectedColumnId,
                      dueDate: selectedDueDate,
                      clearDueDate: selectedDueDate == null,
                      assigneeIds: selectedAssignees.toList(),
                    );
                    Navigator.pop(ctx);
                  },
                  child: const Text('Enregistrer'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Color? _parseHexColor(String? hex) {
    if (hex == null || hex.isEmpty) return null;
    final cleaned = hex.replaceFirst('#', '');
    if (cleaned.length != 6) return null;
    final val = int.tryParse('FF$cleaned', radix: 16);
    return val != null ? Color(val) : null;
  }

  void _openColumnDialog(BuildContext context, {KanbanColumnItem? existing}) {
    final nameCtrl = TextEditingController(text: existing?.name ?? '');
    final wipCtrl = TextEditingController(text: existing?.wipLimit?.toString() ?? '');
    var isDone = existing?.isDone ?? false;
    var selectedColor = existing?.color ?? '#818cf8';
    const colors = ['#818cf8', '#38bdf8', '#f59e0b', '#10b981', '#ec4899', '#a855f7'];

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setStateDialog) => AlertDialog(
          title: Text(existing == null ? 'Nouvelle colonne' : 'Modifier la colonne'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                TextField(
                  controller: nameCtrl,
                  decoration: const InputDecoration(labelText: 'Nom de la colonne'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: wipCtrl,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Limite WIP (optionnel)'),
                ),
                const SizedBox(height: 12),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Colonne « Terminé »', style: TextStyle(fontSize: 13)),
                  value: isDone,
                  onChanged: (v) => setStateDialog(() => isDone = v),
                ),
                const SizedBox(height: 8),
                const Text('Couleur', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                const SizedBox(height: 6),
                Wrap(
                  spacing: 8,
                  children: colors.map((c) {
                    final active = selectedColor == c;
                    return InkWell(
                      onTap: () => setStateDialog(() => selectedColor = c),
                      child: Container(
                        width: 26,
                        height: 26,
                        decoration: BoxDecoration(
                          color: _parseHexColor(c),
                          shape: BoxShape.circle,
                          border: active ? Border.all(color: Colors.white, width: 2.5) : null,
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Annuler')),
            FilledButton(
              onPressed: () {
                if (nameCtrl.text.trim().isEmpty) return;
                final parsedWip = int.tryParse(wipCtrl.text.trim());
                if (existing == null) {
                  widget.store.createColumn(
                    name: nameCtrl.text.trim(),
                    wipLimit: parsedWip,
                    color: selectedColor,
                    isDone: isDone,
                  );
                } else {
                  widget.store.updateColumn(
                    existing.id,
                    name: nameCtrl.text.trim(),
                    wipLimit: parsedWip,
                    clearWipLimit: wipCtrl.text.trim().isEmpty,
                    color: selectedColor,
                    isDone: isDone,
                  );
                }
                Navigator.pop(ctx);
              },
              child: Text(existing == null ? 'Créer' : 'Enregistrer'),
            ),
          ],
        ),
      ),
    );
  }

  void _confirmDeleteColumn(BuildContext context, KanbanColumnItem col, int taskCount) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Supprimer « ${col.name} » ?'),
        content: Text(
          taskCount > 0
              ? 'Cette colonne contient $taskCount tâche(s). Elles seront automatiquement transférées vers la première colonne disponible.'
              : 'Voulez-vous supprimer cette colonne du tableau Kanban ?',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Annuler')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.redAccent),
            onPressed: () async {
              Navigator.pop(ctx);
              final res = await widget.store.deleteColumn(col.id);
              if (!context.mounted) return;
              if (!res.ok && res.error != null) {
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(res.error!)));
              } else if (res.migratedTaskCount > 0) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(
                      '${res.migratedTaskCount} tâche(s) transférée(s) vers « ${res.fallbackColumnName} ».',
                    ),
                  ),
                );
              }
            },
            child: const Text('Supprimer'),
          ),
        ],
      ),
    );
  }
}

class _PriorityChip extends StatelessWidget {
  const _PriorityChip({required this.priority});
  final TaskPriority priority;

  @override
  Widget build(BuildContext context) {
    Color bg;
    String label;
    switch (priority) {
      case TaskPriority.urgente:
        bg = Colors.redAccent;
        label = 'Urgente';
      case TaskPriority.haute:
        bg = Colors.orangeAccent;
        label = 'Haute';
      case TaskPriority.normale:
        bg = Colors.blueAccent;
        label = 'Normale';
      case TaskPriority.basse:
        bg = Colors.teal;
        label = 'Basse';
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: bg.withValues(alpha: 0.18),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: bg.withValues(alpha: 0.5)),
      ),
      child: Text(label, style: TextStyle(color: bg, fontSize: 10, fontWeight: FontWeight.bold)),
    );
  }
}

