import 'package:flutter/material.dart';
import '../../core/models/studyflow_models.dart';
import '../../state/studyflow_store.dart';

class CalendarReportsScreen extends StatefulWidget {
  const CalendarReportsScreen({super.key, required this.store});
  final StudyFlowStore store;

  @override
  State<CalendarReportsScreen> createState() => _CalendarReportsScreenState();
}

class _CalendarReportsScreenState extends State<CalendarReportsScreen> {
  late DateTime _focusedMonth;
  DateTime? _selectedDay;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _focusedMonth = DateTime(now.year, now.month, 1);
  }

  bool _isSameDay(DateTime a, DateTime b) =>
      a.year == b.year && a.month == b.month && a.day == b.day;

  @override
  Widget build(BuildContext context) {
    final store = widget.store;
    final user = store.currentUser!;
    final isReadOnly = user.isCoachOrViewer;
    final tasks = store.currentTasks;
    final columns = store.currentColumns;
    final doneCols = columns.where((c) => c.isDone).toList();
    final doneColIds = doneCols.map((c) => c.id).toSet();
    final doneColName = doneCols.isNotEmpty ? doneCols.first.name : 'Terminé';
    final completed = tasks.where((t) => doneColIds.contains(t.columnId)).length;
    final overdue = tasks
        .where((t) => t.dueDate != null && t.dueDate!.isBefore(DateTime.now()) && !doneColIds.contains(t.columnId))
        .length;
    final rate = tasks.isNotEmpty ? ((completed / tasks.length) * 100).round() : 0;

    return DefaultTabController(
      length: 2,
      child: Column(
        children: [
          const TabBar(
            tabs: [
              Tab(icon: Icon(Icons.calendar_month), text: 'Agenda'),
              Tab(icon: Icon(Icons.analytics_outlined), text: 'Stats & Rapports'),
            ],
          ),
          Expanded(
            child: TabBarView(
              children: [
                // Onglet 1 : Calendrier multi-sources
                ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Expanded(
                          child: Wrap(
                            spacing: 8,
                            runSpacing: 6,
                            children: [
                              _LegendChip(color: Color(0xFF6366F1), label: 'Tâches'),
                              _LegendChip(color: Color(0xFFF59E0B), label: 'Jalons'),
                              _LegendChip(color: Color(0xFF10B981), label: 'Formations'),
                              _LegendChip(color: Color(0xFFA855F7), label: 'Coaching'),
                            ],
                          ),
                        ),
                        if (!isReadOnly)
                          FilledButton.tonalIcon(
                            onPressed: () => _openMilestoneDialog(context),
                            icon: const Icon(Icons.flag_outlined, size: 16),
                            label: const Text('Jalon'),
                          ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    _buildMonthCalendar(context, store, tasks),
                    const SizedBox(height: 12),
                    if (_selectedDay != null)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: Row(
                          children: [
                            Text(
                              'Événements du ${_selectedDay!.day}/${_selectedDay!.month}/${_selectedDay!.year}',
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                            ),
                            const Spacer(),
                            TextButton(
                              onPressed: () => setState(() => _selectedDay = null),
                              child: const Text('Tout afficher'),
                            ),
                          ],
                        ),
                      ),
                    ...store.currentMilestones
                        .where((m) => _selectedDay == null || _isSameDay(m.date, _selectedDay!))
                        .map(
                          (m) => _EventCard(
                            color: const Color(0xFFF59E0B),
                            tag: 'JALON',
                            title: m.title,
                            date: m.date,
                            subtitle: m.description ?? '',
                            onTap: isReadOnly ? null : () => _openMilestoneDialog(context, existing: m),
                          ),
                        ),
                    ...tasks
                        .where((t) =>
                            t.dueDate != null &&
                            (_selectedDay == null || _isSameDay(t.dueDate!, _selectedDay!)))
                        .map(
                          (t) => _EventCard(
                            color: const Color(0xFF6366F1),
                            tag: 'ÉCHÉANCE TÂCHE',
                            title: t.title,
                            date: t.dueDate!,
                            subtitle: 'Priorité : ${t.priority.name.toUpperCase()}',
                          ),
                        ),
                    ...store.trainings
                        .where((tr) => _selectedDay == null || _isSameDay(tr.startsAt, _selectedDay!))
                        .map(
                          (tr) => _EventCard(
                            color: const Color(0xFF10B981),
                            tag: 'FORMATION',
                            title: tr.title,
                            date: tr.startsAt,
                            subtitle: '${tr.mode} · ${tr.skill}',
                          ),
                        ),
                    ...store.coachingSessions
                        .where((s) =>
                            s.scheduledAt != null &&
                            (_selectedDay == null || _isSameDay(s.scheduledAt!, _selectedDay!)))
                        .map(
                          (cs) => _EventCard(
                            color: const Color(0xFFA855F7),
                            tag: 'COACHING',
                            title: cs.topic,
                            date: cs.scheduledAt!,
                            subtitle: '${cs.durationMin} min · ${cs.status}',
                          ),
                        ),
                  ],
                ),

                // Onglet 2 : Statistiques & Rapports (ex-M7 fusionné dans M4)
                ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: _KpiCard(
                            label: 'Avancement global',
                            value: '$rate%',
                            color: const Color(0xFF4F46E5),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: _KpiCard(
                            label: 'Colonne « $doneColName »',
                            value: '$completed / ${tasks.length}',
                            color: const Color(0xFF10B981),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: _KpiCard(
                            label: 'En retard',
                            value: '$overdue',
                            color: Colors.redAccent,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 18),
                    const Text('Répartition par colonne', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                    const SizedBox(height: 10),
                    ...columns.map((col) {
                      final count = tasks.where((t) => t.columnId == col.id).length;
                      final ratio = tasks.isNotEmpty ? count / tasks.length : 0.0;
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(col.name, style: const TextStyle(fontSize: 13)),
                                Text('$count tâches', style: const TextStyle(fontSize: 12, color: Colors.grey)),
                              ],
                            ),
                            const SizedBox(height: 4),
                            LinearProgressIndicator(value: ratio, minHeight: 8, borderRadius: BorderRadius.circular(6)),
                          ],
                        ),
                      );
                    }),
                    const SizedBox(height: 16),
                    FilledButton.icon(
                      onPressed: () => store.generateReport(),
                      icon: const Icon(Icons.summarize_outlined),
                      label: const Text('Générer un rapport d\'étape'),
                    ),
                    const SizedBox(height: 14),
                    ...store.reports.map(
                      (r) => Card(
                        margin: const EdgeInsets.only(bottom: 10),
                        child: ListTile(
                          leading: const Icon(Icons.picture_as_pdf_outlined, color: Color(0xFF4F46E5)),
                          title: Text(r.title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                          subtitle: Text(
                            'Achèvement : ${r.completionRate}% (${r.completedTasks}/${r.totalTasks} tâches)',
                            style: const TextStyle(fontSize: 12),
                          ),
                          trailing: IconButton(
                            tooltip: 'Supprimer le rapport',
                            icon: const Icon(Icons.delete_outline, color: Colors.redAccent, size: 20),
                            onPressed: () => store.deleteReport(r.id),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _openMilestoneDialog(BuildContext context, {MilestoneItem? existing}) {
    final store = widget.store;
    final titleCtrl = TextEditingController(text: existing?.title ?? '');
    final descCtrl = TextEditingController(text: existing?.description ?? '');
    var selectedDate = existing?.date ?? DateTime.now().add(const Duration(days: 7));

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setStateDialog) => AlertDialog(
          title: Text(existing == null ? 'Nouveau jalon' : 'Modifier le jalon'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: titleCtrl,
                decoration: const InputDecoration(labelText: 'Titre du jalon'),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: descCtrl,
                decoration: const InputDecoration(labelText: 'Description (optionnel)'),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Text('Date : ${selectedDate.day}/${selectedDate.month}/${selectedDate.year}'),
                  const Spacer(),
                  TextButton(
                    onPressed: () async {
                      final picked = await showDatePicker(
                        context: ctx,
                        initialDate: selectedDate,
                        firstDate: DateTime(2024),
                        lastDate: DateTime(2030),
                      );
                      if (picked != null) {
                        setStateDialog(() => selectedDate = picked);
                      }
                    },
                    child: const Text('Changer'),
                  ),
                ],
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Annuler')),
            FilledButton(
              onPressed: () {
                if (titleCtrl.text.trim().isEmpty) return;
                if (existing == null) {
                  store.createMilestone(
                    title: titleCtrl.text.trim(),
                    date: selectedDate,
                    description: descCtrl.text.trim(),
                  );
                } else {
                  store.updateMilestone(
                    existing.id,
                    title: titleCtrl.text.trim(),
                    date: selectedDate,
                    description: descCtrl.text.trim(),
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

  Widget _buildMonthCalendar(
    BuildContext context,
    StudyFlowStore store,
    List<TaskItem> tasks,
  ) {
    const months = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
    ];
    const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

    final year = _focusedMonth.year;
    final month = _focusedMonth.month;
    final daysInMonth = DateUtils.getDaysInMonth(year, month);
    final firstWeekdayOffset = DateTime(year, month, 1).weekday - 1; // 0 = Lun
    final totalCells = ((firstWeekdayOffset + daysInMonth + 6) ~/ 7) * 7;
    final today = DateTime.now();

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          children: [
            Row(
              children: [
                IconButton(
                  tooltip: 'Mois précédent',
                  icon: const Icon(Icons.chevron_left),
                  onPressed: () => setState(() {
                    _focusedMonth = DateTime(year, month - 1, 1);
                  }),
                ),
                Expanded(
                  child: Text(
                    '${months[month - 1]} $year',
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                  ),
                ),
                TextButton(
                  onPressed: () => setState(() {
                    _focusedMonth = DateTime(today.year, today.month, 1);
                    _selectedDay = DateTime(today.year, today.month, today.day);
                  }),
                  child: const Text('Aujourd\'hui', style: TextStyle(fontSize: 12)),
                ),
                IconButton(
                  tooltip: 'Mois suivant',
                  icon: const Icon(Icons.chevron_right),
                  onPressed: () => setState(() {
                    _focusedMonth = DateTime(year, month + 1, 1);
                  }),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Row(
              children: weekDays
                  .map((d) => Expanded(
                        child: Center(
                          child: Text(
                            d,
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: Colors.grey,
                            ),
                          ),
                        ),
                      ))
                  .toList(),
            ),
            const SizedBox(height: 6),
            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 7,
                mainAxisSpacing: 4,
                crossAxisSpacing: 4,
                childAspectRatio: 1.05,
              ),
              itemCount: totalCells,
              itemBuilder: (_, idx) {
                final dayNum = idx - firstWeekdayOffset + 1;
                if (dayNum < 1 || dayNum > daysInMonth) {
                  return const SizedBox.shrink();
                }
                final date = DateTime(year, month, dayNum);
                final isToday = _isSameDay(date, today);
                final isSelected = _selectedDay != null && _isSameDay(date, _selectedDay!);

                final hasMilestone = store.currentMilestones.any((m) => _isSameDay(m.date, date));
                final hasTask = tasks.any((t) => t.dueDate != null && _isSameDay(t.dueDate!, date));
                final hasTraining = store.trainings.any((tr) => _isSameDay(tr.startsAt, date));
                final hasCoaching = store.coachingSessions
                    .any((cs) => cs.scheduledAt != null && _isSameDay(cs.scheduledAt!, date));

                return InkWell(
                  borderRadius: BorderRadius.circular(10),
                  onTap: () => setState(() {
                    _selectedDay = isSelected ? null : date;
                  }),
                  child: Container(
                    decoration: BoxDecoration(
                      color: isSelected
                          ? const Color(0xFF4F46E5).withValues(alpha: 0.28)
                          : (isToday
                              ? Theme.of(context).colorScheme.primary.withValues(alpha: 0.12)
                              : null),
                      borderRadius: BorderRadius.circular(10),
                      border: isSelected
                          ? Border.all(color: const Color(0xFF818CF8), width: 1.5)
                          : (isToday
                              ? Border.all(color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.5))
                              : null),
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          '$dayNum',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: (isToday || isSelected) ? FontWeight.bold : FontWeight.normal,
                          ),
                        ),
                        const SizedBox(height: 3),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            if (hasTask) const _CalendarDot(color: Color(0xFF6366F1)),
                            if (hasMilestone) const _CalendarDot(color: Color(0xFFF59E0B)),
                            if (hasTraining) const _CalendarDot(color: Color(0xFF10B981)),
                            if (hasCoaching) const _CalendarDot(color: Color(0xFFA855F7)),
                          ],
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _CalendarDot extends StatelessWidget {
  const _CalendarDot({required this.color});
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 5,
      height: 5,
      margin: const EdgeInsets.symmetric(horizontal: 1),
      decoration: BoxDecoration(color: color, shape: BoxShape.circle),
    );
  }
}

class _LegendChip extends StatelessWidget {
  const _LegendChip({required this.color, required this.label});
  final Color color;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.4)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(width: 8, height: 8, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
          const SizedBox(width: 6),
          Text(label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: color)),
        ],
      ),
    );
  }
}

class _EventCard extends StatelessWidget {
  const _EventCard({
    required this.color,
    required this.tag,
    required this.title,
    required this.date,
    required this.subtitle,
    this.onTap,
  });

  final Color color;
  final String tag;
  final String title;
  final DateTime date;
  final String subtitle;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: ListTile(
        onTap: onTap,
        leading: Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.18),
            borderRadius: BorderRadius.circular(12),
          ),
          alignment: Alignment.center,
          child: Text(
            '${date.day}/${date.month}',
            style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 12),
          ),
        ),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
        subtitle: Text('$tag · $subtitle', style: const TextStyle(fontSize: 11)),
      ),
    );
  }
}

class _KpiCard extends StatelessWidget {
  const _KpiCard({required this.label, required this.value, required this.color});
  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: const TextStyle(fontSize: 11, color: Colors.grey)),
            const SizedBox(height: 6),
            Text(value, style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: color)),
          ],
        ),
      ),
    );
  }
}

