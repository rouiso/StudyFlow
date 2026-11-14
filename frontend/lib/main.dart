import 'package:flutter/material.dart';
import 'core/models/studyflow_models.dart';
import 'screens/auth/login_screen.dart';
import 'screens/modules/calendar_reports_screen.dart';
import 'screens/modules/chat_files_screen.dart';
import 'screens/modules/kanban_screen.dart';
import 'screens/modules/tasks_screen.dart';
import 'screens/modules/teams_overview_screen.dart';
import 'screens/modules/training_coaching_screen.dart';
import 'state/studyflow_store.dart';

void main() => runApp(const StudyFlowApp());

class StudyFlowApp extends StatefulWidget {
  const StudyFlowApp({super.key});

  @override
  State<StudyFlowApp> createState() => _StudyFlowAppState();
}

class _StudyFlowAppState extends State<StudyFlowApp> {
  final StudyFlowStore _store = StudyFlowStore();
  bool _darkMode = true;

  @override
  void dispose() {
    _store.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final lightScheme = ColorScheme.fromSeed(
      seedColor: const Color(0xFF4F46E5),
      brightness: Brightness.light,
    );
    final darkScheme = ColorScheme.fromSeed(
      seedColor: const Color(0xFF818CF8),
      brightness: Brightness.dark,
    );

    return MaterialApp(
      title: 'StudyFlow Mobile',
      debugShowCheckedModeBanner: false,
      themeMode: _darkMode ? ThemeMode.dark : ThemeMode.light,
      theme: ThemeData(
        colorScheme: lightScheme,
        useMaterial3: true,
        cardTheme: const CardThemeData(
          elevation: 0,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.all(Radius.circular(18))),
        ),
      ),
      darkTheme: ThemeData(
        colorScheme: darkScheme,
        useMaterial3: true,
        scaffoldBackgroundColor: const Color(0xFF020617),
        cardTheme: const CardThemeData(
          elevation: 0,
          color: Color(0xFF0F172A),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.all(Radius.circular(18))),
        ),
      ),
      home: ListenableBuilder(
        listenable: _store,
        builder: (context, _) {
          if (_store.currentUser == null) {
            return LoginScreen(store: _store);
          }
          return StudyFlowShell(
            store: _store,
            darkMode: _darkMode,
            onToggleTheme: () => setState(() => _darkMode = !_darkMode),
          );
        },
      ),
    );
  }
}

class StudyFlowShell extends StatefulWidget {
  const StudyFlowShell({
    super.key,
    required this.store,
    required this.darkMode,
    required this.onToggleTheme,
  });

  final StudyFlowStore store;
  final bool darkMode;
  final VoidCallback onToggleTheme;

  @override
  State<StudyFlowShell> createState() => _StudyFlowShellState();
}

class _StudyFlowShellState extends State<StudyFlowShell> {
  int _selectedIndex = 0;

  static const _destinations = <(String label, IconData icon)>[
    ('Kanban', Icons.view_kanban_rounded),
    ('Tâches', Icons.check_circle_outline_rounded),
    ('Agenda & Stats', Icons.calendar_month_rounded),
    ('Chat', Icons.forum_outlined),
    ('Fichiers', Icons.folder_outlined),
    ('Formations', Icons.school_outlined),
    ('Équipe', Icons.groups_rounded),
  ];

  @override
  Widget build(BuildContext context) {
    final isWide = MediaQuery.sizeOf(context).width >= 850;
    final user = widget.store.currentUser!;

    final bodyContent = _buildCurrentModule();

    return Scaffold(
      appBar: AppBar(
        titleSpacing: isWide ? 16 : 8,
        title: Row(
          children: [
            Flexible(
              child: Text(
                'StudyFlow · ${widget.store.activeProject.name}',
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 17),
              ),
            ),
            const SizedBox(width: 8),
            Tooltip(
              message: widget.store.isPrismaConnected ? 'En ligne' : 'Hors ligne',
              child: Container(
                width: 9,
                height: 9,
                decoration: BoxDecoration(
                  color: widget.store.isPrismaConnected ? Colors.tealAccent : Colors.amber,
                  shape: BoxShape.circle,
                ),
              ),
            ),
          ],
        ),
        actions: [
          if (widget.store.projects.isNotEmpty)
            PopupMenuButton<String>(
              tooltip: 'Projet actif',
              icon: const Icon(Icons.folder_special_outlined),
              onSelected: (val) {
                if (val == '__new__') {
                  _openProjectDialog(context);
                } else if (val == '__edit__') {
                  _openProjectDialog(context, existing: widget.store.activeProject);
                } else {
                  widget.store.selectProject(val);
                }
              },
              itemBuilder: (_) => [
                for (final p in widget.store.projects)
                  PopupMenuItem(
                    value: p.id,
                    child: Row(
                      children: [
                        Icon(
                          p.id == widget.store.activeProject.id
                              ? Icons.check_circle
                              : Icons.circle_outlined,
                          size: 16,
                        ),
                        const SizedBox(width: 8),
                        Expanded(child: Text(p.name, overflow: TextOverflow.ellipsis)),
                      ],
                    ),
                  ),
                if (!user.isCoachOrViewer) ...[
                  const PopupMenuDivider(),
                  const PopupMenuItem(value: '__edit__', child: Text('Modifier le projet actif')),
                  const PopupMenuItem(value: '__new__', child: Text('Nouveau projet')),
                ],
              ],
            ),
          IconButton(
            tooltip: 'Synchroniser',
            onPressed: () => widget.store.hydrateFromPrisma(),
            icon: const Icon(Icons.sync),
          ),
          PopupMenuButton<String>(
            tooltip: 'Options',
            onSelected: (val) {
              if (val == 'theme') {
                widget.onToggleTheme();
              } else if (val == 'logout') {
                widget.store.logout();
              }
            },
            itemBuilder: (_) => [
              PopupMenuItem(
                value: 'theme',
                child: Row(
                  children: [
                    Icon(widget.darkMode ? Icons.light_mode_outlined : Icons.dark_mode_outlined, size: 18),
                    const SizedBox(width: 10),
                    Text(widget.darkMode ? 'Mode clair' : 'Mode sombre'),
                  ],
                ),
              ),
              const PopupMenuItem(
                value: 'logout',
                child: Row(
                  children: [
                    Icon(Icons.logout, size: 18, color: Colors.redAccent),
                    SizedBox(width: 10),
                    Text('Se déconnecter', style: TextStyle(color: Colors.redAccent)),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
      body: isWide
          ? Row(
              children: [
                NavigationRail(
                  selectedIndex: _selectedIndex,
                  onDestinationSelected: (i) => setState(() => _selectedIndex = i),
                  extended: MediaQuery.sizeOf(context).width >= 1150,
                  destinations: [
                    for (final d in _destinations)
                      NavigationRailDestination(icon: Icon(d.$2), label: Text(d.$1)),
                  ],
                ),
                const VerticalDivider(width: 1),
                Expanded(child: bodyContent),
              ],
            )
          : bodyContent,
      bottomNavigationBar: isWide
          ? null
          : NavigationBar(
              selectedIndex: _selectedIndex > 4 ? 0 : _selectedIndex,
              onDestinationSelected: (i) => setState(() => _selectedIndex = i),
              destinations: [
                for (final d in _destinations.take(4))
                  NavigationDestination(icon: Icon(d.$2), label: d.$1),
                const NavigationDestination(icon: Icon(Icons.apps), label: 'Plus'),
              ],
            ),
      drawer: isWide
          ? null
          : Drawer(
              child: ListView(
                children: [
                  DrawerHeader(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        Text(user.name, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                        Text('${user.email} · ${roleToString(user.role)}',
                            style: const TextStyle(fontSize: 12, color: Colors.grey)),
                      ],
                    ),
                  ),
                  for (var i = 0; i < _destinations.length; i++)
                    ListTile(
                      leading: Icon(_destinations[i].$2),
                      title: Text(_destinations[i].$1),
                      selected: _selectedIndex == i,
                      onTap: () {
                        setState(() => _selectedIndex = i);
                        Navigator.pop(context);
                      },
                    ),
                ],
              ),
            ),
    );
  }

  Widget _buildCurrentModule() {
    switch (_selectedIndex) {
      case 0:
        return KanbanScreen(store: widget.store);
      case 1:
        return TasksScreen(store: widget.store);
      case 2:
        return CalendarReportsScreen(store: widget.store);
      case 3:
        return ChatScreen(store: widget.store);
      case 4:
        return FilesScreen(store: widget.store);
      case 5:
        return TrainingCoachingScreen(store: widget.store);
      case 6:
        return TeamsOverviewScreen(store: widget.store);
      default:
        return KanbanScreen(store: widget.store);
    }
  }

  void _openProjectDialog(BuildContext context, {ProjectItem? existing}) {
    final nameCtrl = TextEditingController(text: existing?.name ?? '');
    final descCtrl = TextEditingController(text: existing?.description ?? '');
    var selectedColor = existing?.color ?? '#4f46e5';
    const colors = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setStateDialog) => AlertDialog(
          title: Text(existing == null ? 'Nouveau projet' : 'Modifier le projet'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameCtrl,
                decoration: const InputDecoration(labelText: 'Nom du projet'),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: descCtrl,
                maxLines: 2,
                decoration: const InputDecoration(labelText: 'Description'),
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                children: colors.map((c) {
                  final val = int.tryParse('FF${c.replaceFirst('#', '')}', radix: 16) ?? 0xFF4F46E5;
                  return InkWell(
                    onTap: () => setStateDialog(() => selectedColor = c),
                    child: Container(
                      width: 24,
                      height: 24,
                      decoration: BoxDecoration(
                        color: Color(val),
                        shape: BoxShape.circle,
                        border: selectedColor == c ? Border.all(color: Colors.white, width: 2.5) : null,
                      ),
                    ),
                  );
                }).toList(),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Annuler')),
            FilledButton(
              onPressed: () {
                if (nameCtrl.text.trim().isEmpty) return;
                if (existing == null) {
                  widget.store.createProject(
                    name: nameCtrl.text.trim(),
                    description: descCtrl.text.trim(),
                    color: selectedColor,
                  );
                } else {
                  widget.store.updateProject(
                    existing.id,
                    name: nameCtrl.text.trim(),
                    description: descCtrl.text.trim(),
                    color: selectedColor,
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
}
