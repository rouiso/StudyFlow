import 'package:flutter/material.dart';
import '../../core/models/studyflow_models.dart';
import '../../providers/studyflow_provider.dart';

class TrainingCoachingScreen extends StatelessWidget {
  const TrainingCoachingScreen({super.key, required this.store});
  final StudyFlowStore store;

  @override
  Widget build(BuildContext context) {
    final user = store.currentUser!;
    final isCoachOrAdmin =
        user.role == UserRole.coach || user.role == UserRole.admin || user.role == UserRole.owner;

    return DefaultTabController(
      length: 3,
      child: Column(
        children: [
          TabBar(
            isScrollable: MediaQuery.sizeOf(context).width < 480,
            tabs: [
              Tab(icon: const Icon(Icons.school_outlined), text: 'Formations (${store.trainings.length})'),
              Tab(icon: const Icon(Icons.psychology_outlined), text: 'Coaching (${store.coachingSessions.length})'),
              const Tab(icon: Icon(Icons.track_changes_outlined), text: 'Compétences'),
            ],
          ),
          Expanded(
            child: TabBarView(
              children: [
                // 1. Catalogue de Formations
                Column(
                  children: [
                    if (isCoachOrAdmin)
                      Padding(
                        padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                        child: Align(
                          alignment: Alignment.centerRight,
                          child: FilledButton.icon(
                            onPressed: () => _openTrainingDialog(context),
                            icon: const Icon(Icons.add),
                            label: const Text('Nouvelle formation'),
                          ),
                        ),
                      ),
                    Expanded(
                      child: ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: store.trainings.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 12),
                        itemBuilder: (context, idx) {
                          final tr = store.trainings[idx];
                          final enrolled = store.enrollments
                              .where((e) => e.trainingId == tr.id && e.status == 'ENROLLED')
                              .toList();
                          final isEnrolled = enrolled.any((e) => e.userId == user.id);
                          final isFull = enrolled.length >= tr.capacity;

                          return Card(
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Chip(
                                        label: Text(tr.skill, style: const TextStyle(fontSize: 11)),
                                        visualDensity: VisualDensity.compact,
                                      ),
                                      const SizedBox(width: 8),
                                      Expanded(
                                        child: Text(
                                          '${tr.mode} · ${tr.level}',
                                          style: const TextStyle(fontSize: 11, color: Colors.grey),
                                        ),
                                      ),
                                      Text(
                                        '${enrolled.length}/${tr.capacity} places',
                                        style: TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.bold,
                                          color: isFull ? Colors.redAccent : Colors.teal,
                                        ),
                                      ),
                                      if (isCoachOrAdmin) ...[
                                        IconButton(
                                          tooltip: 'Modifier',
                                          icon: const Icon(Icons.edit_outlined, size: 18),
                                          onPressed: () => _openTrainingDialog(context, existing: tr),
                                        ),
                                        IconButton(
                                          tooltip: 'Supprimer',
                                          icon: const Icon(Icons.delete_outline, size: 18, color: Colors.redAccent),
                                          onPressed: () => store.deleteTraining(tr.id),
                                        ),
                                      ],
                                    ],
                                  ),
                                  const SizedBox(height: 8),
                                  Text(tr.title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                                  const SizedBox(height: 4),
                                  Text(tr.description, style: const TextStyle(fontSize: 12, color: Colors.grey)),
                                  const SizedBox(height: 12),
                                  if (isEnrolled)
                                    OutlinedButton.icon(
                                      onPressed: () => store.unenrollTraining(tr.id),
                                      icon: const Icon(Icons.check_circle_outline, color: Colors.teal),
                                      label: const Text('Inscrit (Se désinscrire)'),
                                    )
                                  else
                                    FilledButton(
                                      onPressed: isFull
                                          ? null
                                          : () async {
                                              final err = await store.enrollTraining(tr.id);
                                              if (err != null && context.mounted) {
                                                ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(err)));
                                              }
                                            },
                                      child: Text(isFull ? 'Formation complète' : 'S\'inscrire à la formation'),
                                    ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                  ],
                ),

                // 2. Espace Coaching (avec Notes Privées strictement réservées au Coach)
                Column(
                  children: [
                    if (!user.isCoach)
                      Padding(
                        padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                        child: Align(
                          alignment: Alignment.centerRight,
                          child: FilledButton.icon(
                            onPressed: () => _openRequestCoaching(context),
                            icon: const Icon(Icons.add),
                            label: const Text('Demander un coaching'),
                          ),
                        ),
                      ),
                    Expanded(
                      child: ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: store.coachingSessions.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 12),
                        itemBuilder: (context, idx) {
                          final cs = store.coachingSessions[idx];
                          final isCoachAuthor = user.id == cs.coachId;
                          final coachee = store.users.firstWhere(
                            (u) => u.id == cs.coacheeId,
                            orElse: () => user,
                          );

                          return Card(
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      _StatusBadge(status: cs.status),
                                      const SizedBox(width: 8),
                                      Text('${cs.durationMin} min · ${cs.mode}',
                                          style: const TextStyle(fontSize: 11, color: Colors.grey)),
                                      const Spacer(),
                                      Text('Étudiant : ${coachee.name}', style: const TextStyle(fontSize: 11)),
                                      if (isCoachAuthor ||
                                          user.id == cs.coacheeId ||
                                          user.role == UserRole.owner ||
                                          user.role == UserRole.admin)
                                        IconButton(
                                          tooltip: 'Supprimer la séance',
                                          icon: const Icon(Icons.delete_outline, size: 18, color: Colors.redAccent),
                                          onPressed: () => store.deleteCoaching(cs.id),
                                        ),
                                    ],
                                  ),
                                  const SizedBox(height: 8),
                                  Text(cs.topic, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                                  if (cs.sharedReport != null && cs.sharedReport!.isNotEmpty) ...[
                                    const SizedBox(height: 10),
                                    Container(
                                      padding: const EdgeInsets.all(10),
                                      decoration: BoxDecoration(
                                        color: Theme.of(context).colorScheme.surfaceContainerHighest,
                                        borderRadius: BorderRadius.circular(10),
                                      ),
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          const Text('Synthèse partagée :',
                                              style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                                          const SizedBox(height: 4),
                                          Text(cs.sharedReport!, style: const TextStyle(fontSize: 12)),
                                        ],
                                      ),
                                    ),
                                  ],
                                  const SizedBox(height: 10),

                                  // Confidentialité stricte des notes privées (§7.3)
                                  if (isCoachAuthor)
                                    Container(
                                      padding: const EdgeInsets.all(10),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFF3B0764).withValues(alpha: 0.35),
                                        borderRadius: BorderRadius.circular(10),
                                        border: Border.all(color: const Color(0xFFA855F7).withValues(alpha: 0.5)),
                                      ),
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          const Row(
                                            children: [
                                              Icon(Icons.lock_open, size: 14, color: Color(0xFFD8B4FE)),
                                              SizedBox(width: 6),
                                              Text(
                                                'Notes privées du Coach (Déverrouillées)',
                                                style: TextStyle(
                                                  fontSize: 11,
                                                  fontWeight: FontWeight.bold,
                                                  color: Color(0xFFD8B4FE),
                                                ),
                                              ),
                                            ],
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            cs.privateNotes?.isNotEmpty == true
                                                ? cs.privateNotes!
                                                : 'Aucune note privée enregistrée.',
                                            style: const TextStyle(fontSize: 12, color: Color(0xFFF3E8FF)),
                                          ),
                                        ],
                                      ),
                                    )
                                  else
                                    Container(
                                      padding: const EdgeInsets.all(10),
                                      decoration: BoxDecoration(
                                        color: Colors.grey.withValues(alpha: 0.12),
                                        borderRadius: BorderRadius.circular(10),
                                      ),
                                      child: const Row(
                                        children: [
                                          Icon(Icons.lock_outline, size: 14, color: Colors.grey),
                                          SizedBox(width: 6),
                                          Text(
                                            'Notes privées réservées exclusivement au Coach',
                                            style: TextStyle(fontSize: 11, color: Colors.grey, fontStyle: FontStyle.italic),
                                          ),
                                        ],
                                      ),
                                    ),

                                  if (isCoachAuthor && cs.status == 'REQUESTED') ...[
                                    const SizedBox(height: 10),
                                    FilledButton(
                                      onPressed: () => store.confirmCoaching(
                                        cs.id,
                                        cs.proposedSlots.isNotEmpty
                                            ? cs.proposedSlots.first
                                            : DateTime.now().add(const Duration(days: 2)).toIso8601String(),
                                      ),
                                      child: const Text('Confirmer le créneau'),
                                    ),
                                  ],
                                  if (isCoachAuthor && cs.status == 'CONFIRMED') ...[
                                    const SizedBox(height: 10),
                                    FilledButton(
                                      onPressed: () => _openCompleteCoaching(context, cs),
                                      child: const Text('Clôturer & Rédiger la synthèse'),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                  ],
                ),

                // 3. Objectifs & Compétences
                ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    const Text('Objectifs de progression', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 10),
                    ...store.coachingGoals.map((g) {
                      return Card(
                        margin: const EdgeInsets.only(bottom: 10),
                        child: Padding(
                          padding: const EdgeInsets.all(14),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Expanded(
                                    child: Text(g.title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                                  ),
                                  Chip(
                                    label: Text(g.status, style: const TextStyle(fontSize: 10)),
                                    visualDensity: VisualDensity.compact,
                                  ),
                                  IconButton(
                                    tooltip: 'Supprimer l\'objectif',
                                    icon: const Icon(Icons.delete_outline, size: 18, color: Colors.redAccent),
                                    onPressed: () => store.deleteGoal(g.id),
                                  ),
                                ],
                              ),
                              Text('${g.skill} · ${g.progress}%', style: const TextStyle(fontSize: 11, color: Colors.grey)),
                              Slider(
                                value: g.progress.toDouble(),
                                min: 0,
                                max: 100,
                                divisions: 10,
                                label: '${g.progress}%',
                                onChanged: (val) => store.updateGoalProgress(g.id, val.round()),
                              ),
                            ],
                          ),
                        ),
                      );
                    }),
                    const SizedBox(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Matrice de compétences', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                        FilledButton.tonalIcon(
                          onPressed: () => _openAssessSkillDialog(context),
                          icon: const Icon(Icons.add, size: 16),
                          label: const Text('Évaluer'),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    ...store.skillLevels.map((sk) {
                      final owner = store.users.firstWhere((u) => u.id == sk.userId, orElse: () => user);
                      return Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        child: ListTile(
                          title: Text('${sk.skill} · ${owner.name}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                          trailing: Text('Niveau ${sk.level}/5',
                              style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF4F46E5))),
                        ),
                      );
                    }),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _openRequestCoaching(BuildContext context) {
    final topicCtrl = TextEditingController();
    final users = store.users;
    final defaultCoach = users.firstWhere(
      (u) => u.isCoach,
      orElse: () => users.first,
    );
    var selectedCoachId = defaultCoach.id;
    var selectedDuration = 45;
    var selectedMode = 'ONLINE';
    var selectedSlot = DateTime.now().add(const Duration(days: 1));
    selectedSlot = DateTime(selectedSlot.year, selectedSlot.month, selectedSlot.day, 14, 0);

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setStateDialog) => AlertDialog(
          title: const Text('Demander une séance de coaching'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                DropdownButtonFormField<String>(
                  initialValue: selectedCoachId,
                  decoration: const InputDecoration(labelText: 'Coach / Mentor'),
                  items: users
                      .map((u) => DropdownMenuItem(
                            value: u.id,
                            child: Text('${u.name} (${roleToString(u.role)})'),
                          ))
                      .toList(),
                  onChanged: (v) => setStateDialog(() => selectedCoachId = v ?? defaultCoach.id),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: topicCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Sujet',
                    hintText: 'Ex: Architecture & Tests',
                  ),
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: DropdownButtonFormField<int>(
                        initialValue: selectedDuration,
                        decoration: const InputDecoration(labelText: 'Durée'),
                        items: const [
                          DropdownMenuItem(value: 30, child: Text('30 min')),
                          DropdownMenuItem(value: 45, child: Text('45 min')),
                          DropdownMenuItem(value: 60, child: Text('60 min')),
                          DropdownMenuItem(value: 90, child: Text('90 min')),
                        ],
                        onChanged: (v) => setStateDialog(() => selectedDuration = v ?? 45),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        initialValue: selectedMode,
                        decoration: const InputDecoration(labelText: 'Mode'),
                        items: const [
                          DropdownMenuItem(value: 'ONLINE', child: Text('En ligne')),
                          DropdownMenuItem(value: 'ONSITE', child: Text('Présentiel')),
                        ],
                        onChanged: (v) => setStateDialog(() => selectedMode = v ?? 'ONLINE'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.event_outlined),
                  title: Text(
                    'Créneau : ${selectedSlot.day.toString().padLeft(2, '0')}/${selectedSlot.month.toString().padLeft(2, '0')}/${selectedSlot.year} à ${selectedSlot.hour.toString().padLeft(2, '0')}:${selectedSlot.minute.toString().padLeft(2, '0')}',
                    style: const TextStyle(fontSize: 13),
                  ),
                  onTap: () async {
                    final date = await showDatePicker(
                      context: ctx,
                      initialDate: selectedSlot,
                      firstDate: DateTime.now(),
                      lastDate: DateTime.now().add(const Duration(days: 365)),
                    );
                    if (date == null || !ctx.mounted) return;
                    final time = await showTimePicker(
                      context: ctx,
                      initialTime: TimeOfDay.fromDateTime(selectedSlot),
                    );
                    setStateDialog(() {
                      selectedSlot = DateTime(
                        date.year,
                        date.month,
                        date.day,
                        time?.hour ?? selectedSlot.hour,
                        time?.minute ?? selectedSlot.minute,
                      );
                    });
                  },
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Annuler')),
            FilledButton(
              onPressed: () {
                if (topicCtrl.text.trim().isEmpty) return;
                store.requestCoaching(
                  coachId: selectedCoachId,
                  topic: topicCtrl.text.trim(),
                  durationMin: selectedDuration,
                  mode: selectedMode,
                  proposedSlot: selectedSlot,
                );
                Navigator.pop(ctx);
              },
              child: const Text('Envoyer la demande'),
            ),
          ],
        ),
      ),
    );
  }

  void _openCompleteCoaching(BuildContext context, CoachingSessionItem cs) {
    final sharedCtrl = TextEditingController();
    final privateCtrl = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Synthèse de coaching'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: sharedCtrl,
              maxLines: 2,
              decoration: const InputDecoration(labelText: 'Synthèse partagée (visible par l\'étudiant)'),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: privateCtrl,
              maxLines: 2,
              decoration: const InputDecoration(labelText: 'Notes privées (strictement confidentielles)'),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Annuler')),
          FilledButton(
            onPressed: () {
              store.completeCoaching(cs.id, sharedCtrl.text.trim(), privateCtrl.text.trim());
              Navigator.pop(ctx);
            },
            child: const Text('Enregistrer'),
          ),
        ],
      ),
    );
  }

  void _openTrainingDialog(BuildContext context, {TrainingItem? existing}) {
    final titleCtrl = TextEditingController(text: existing?.title ?? '');
    final descCtrl = TextEditingController(text: existing?.description ?? '');
    final skillCtrl = TextEditingController(text: existing?.skill ?? '');
    final capCtrl = TextEditingController(text: (existing?.capacity ?? 12).toString());
    final locationCtrl = TextEditingController(text: existing?.location ?? '');
    var mode = existing?.mode ?? 'ONLINE';
    final defaultStart = existing?.startsAt ?? DateTime.now().add(const Duration(days: 1));
    var startsAt = DateTime(defaultStart.year, defaultStart.month, defaultStart.day, defaultStart.hour, 0);
    var endsAt = existing?.endsAt ?? startsAt.add(const Duration(hours: 2));

    String fmtDateTime(DateTime dt) =>
        '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}/${dt.year} ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setStateDialog) => AlertDialog(
          title: Text(existing == null ? 'Nouvelle formation' : 'Modifier la formation'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: titleCtrl,
                  decoration: const InputDecoration(labelText: 'Titre'),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: descCtrl,
                  maxLines: 2,
                  decoration: const InputDecoration(labelText: 'Description'),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: skillCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Compétence',
                    hintText: 'Ex: Flutter, Architecture, Git...',
                  ),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: capCtrl,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(labelText: 'Capacité'),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        initialValue: mode,
                        decoration: const InputDecoration(labelText: 'Mode'),
                        items: const [
                          DropdownMenuItem(value: 'ONLINE', child: Text('En ligne')),
                          DropdownMenuItem(value: 'ONSITE', child: Text('Présentiel')),
                        ],
                        onChanged: (v) => setStateDialog(() => mode = v ?? 'ONLINE'),
                      ),
                    ),
                  ],
                ),
                if (mode == 'ONSITE') ...[
                  const SizedBox(height: 8),
                  TextField(
                    controller: locationCtrl,
                    decoration: const InputDecoration(labelText: 'Lieu / Salle'),
                  ),
                ],
                const SizedBox(height: 8),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.play_circle_outline, size: 20),
                  title: Text('Début : ${fmtDateTime(startsAt)}', style: const TextStyle(fontSize: 13)),
                  onTap: () async {
                    final date = await showDatePicker(
                      context: ctx,
                      initialDate: startsAt,
                      firstDate: DateTime(2024),
                      lastDate: DateTime(2030),
                    );
                    if (date == null || !ctx.mounted) return;
                    final time = await showTimePicker(
                      context: ctx,
                      initialTime: TimeOfDay.fromDateTime(startsAt),
                    );
                    setStateDialog(() {
                      startsAt = DateTime(
                        date.year,
                        date.month,
                        date.day,
                        time?.hour ?? startsAt.hour,
                        time?.minute ?? startsAt.minute,
                      );
                      if (!endsAt.isAfter(startsAt)) {
                        endsAt = startsAt.add(const Duration(hours: 2));
                      }
                    });
                  },
                ),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.stop_circle_outlined, size: 20),
                  title: Text('Fin : ${fmtDateTime(endsAt)}', style: const TextStyle(fontSize: 13)),
                  onTap: () async {
                    final date = await showDatePicker(
                      context: ctx,
                      initialDate: endsAt.isAfter(startsAt) ? endsAt : startsAt,
                      firstDate: startsAt,
                      lastDate: DateTime(2030),
                    );
                    if (date == null || !ctx.mounted) return;
                    final time = await showTimePicker(
                      context: ctx,
                      initialTime: TimeOfDay.fromDateTime(endsAt),
                    );
                    setStateDialog(() {
                      endsAt = DateTime(
                        date.year,
                        date.month,
                        date.day,
                        time?.hour ?? endsAt.hour,
                        time?.minute ?? endsAt.minute,
                      );
                    });
                  },
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Annuler')),
            FilledButton(
              onPressed: () {
                if (titleCtrl.text.trim().isEmpty) return;
                final cap = int.tryParse(capCtrl.text.trim()) ?? 10;
                final skill = skillCtrl.text.trim().isEmpty ? 'Général' : skillCtrl.text.trim();
                final loc = mode == 'ONSITE' && locationCtrl.text.trim().isNotEmpty
                    ? locationCtrl.text.trim()
                    : null;
                if (existing == null) {
                  store.createTraining(
                    title: titleCtrl.text.trim(),
                    description: descCtrl.text.trim(),
                    skill: skill,
                    capacity: cap,
                    mode: mode,
                    location: loc,
                    startsAt: startsAt,
                    endsAt: endsAt,
                  );
                } else {
                  store.updateTraining(
                    existing.id,
                    title: titleCtrl.text.trim(),
                    description: descCtrl.text.trim(),
                    skill: skill,
                    capacity: cap,
                    mode: mode,
                    location: loc,
                    startsAt: startsAt,
                    endsAt: endsAt,
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

  void _openAssessSkillDialog(BuildContext context) {
    final user = store.currentUser!;
    final skillCtrl = TextEditingController();
    var selectedLevel = 3;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setStateDialog) => AlertDialog(
          title: const Text('Évaluer une compétence'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: skillCtrl,
                decoration: const InputDecoration(
                  labelText: 'Compétence (existante ou personnalisée)',
                  hintText: 'Ex: Flutter, Architecture, Leadership...',
                ),
              ),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Niveau : $selectedLevel / 5', style: const TextStyle(fontWeight: FontWeight.bold)),
                  Row(
                    children: List.generate(5, (i) {
                      final lvl = i + 1;
                      return IconButton(
                        constraints: const BoxConstraints(),
                        padding: const EdgeInsets.symmetric(horizontal: 3),
                        icon: Icon(
                          lvl <= selectedLevel ? Icons.star : Icons.star_border,
                          color: Colors.amber,
                          size: 22,
                        ),
                        onPressed: () => setStateDialog(() => selectedLevel = lvl),
                      );
                    }),
                  ),
                ],
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Annuler')),
            FilledButton(
              onPressed: () {
                if (skillCtrl.text.trim().isEmpty) return;
                store.assessSkill(
                  targetUserId: user.id,
                  skill: skillCtrl.text.trim(),
                  level: selectedLevel,
                  selfAssessed: !user.isCoach,
                );
                Navigator.pop(ctx);
              },
              child: const Text('Enregistrer'),
            ),
          ],
        ),
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.status});
  final String status;

  @override
  Widget build(BuildContext context) {
    Color c = Colors.amber;
    if (status == 'CONFIRMED') c = Colors.blueAccent;
    if (status == 'DONE') c = Colors.teal;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: c.withValues(alpha: 0.18),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(status, style: TextStyle(color: c, fontSize: 10, fontWeight: FontWeight.bold)),
    );
  }
}

