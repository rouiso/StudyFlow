import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/models/studyflow_models.dart';
import '../../providers/studyflow_provider.dart';

class TeamsOverviewScreen extends StatelessWidget {
  const TeamsOverviewScreen({super.key, required this.store});
  final StudyFlowStore store;

  @override
  Widget build(BuildContext context) {
    final activeUser = store.currentUser!;
    final canInvite = activeUser.role == UserRole.owner || activeUser.role == UserRole.admin;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 26,
                  backgroundColor: const Color(0xFF4F46E5),
                  child: Text(
                    activeUser.name.substring(0, 1).toUpperCase(),
                    style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(activeUser.name, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                      Text(activeUser.email, style: const TextStyle(fontSize: 12, color: Colors.grey)),
                      const SizedBox(height: 4),
                      Text(
                        'Rôle : ${roleToString(activeUser.role)} · ${store.isPrismaConnected ? "Connecté au serveur" : "Mode hors ligne"}',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: store.isPrismaConnected ? Colors.teal : Colors.amber,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        if (store.teamName != null || store.teamInviteToken != null) ...[
          const SizedBox(height: 12),
          Card(
            child: ListTile(
              leading: const Icon(Icons.group_work_outlined, color: Color(0xFF4F46E5)),
              title: Text(store.teamName ?? 'Mon équipe', style: const TextStyle(fontWeight: FontWeight.bold)),
              subtitle: store.teamInviteToken != null
                  ? Text('Code d\'invitation : ${store.teamInviteToken}', style: const TextStyle(fontSize: 12))
                  : null,
              trailing: store.teamInviteToken != null
                  ? IconButton(
                      tooltip: 'Copier le code',
                      icon: const Icon(Icons.copy, size: 18),
                      onPressed: () {
                        Clipboard.setData(ClipboardData(text: store.teamInviteToken!));
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Code d\'invitation copié !')),
                        );
                      },
                    )
                  : null,
            ),
          ),
        ],
        const SizedBox(height: 18),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          crossAxisAlignment: WrapCrossAlignment.center,
          alignment: WrapAlignment.spaceBetween,
          children: [
            Text(
              'Membres de l\'équipe (${store.users.length})',
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
            ),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                OutlinedButton.icon(
                  onPressed: () => _openJoinTeamDialog(context),
                  icon: const Icon(Icons.login, size: 16),
                  label: const Text('Rejoindre'),
                ),
                if (canInvite) ...[
                  const SizedBox(width: 8),
                  FilledButton.icon(
                    onPressed: () => _openInviteDialog(context),
                    icon: const Icon(Icons.person_add_alt_1, size: 16),
                    label: const Text('Inviter'),
                  ),
                ],
              ],
            ),
          ],
        ),
        const SizedBox(height: 10),
        ...store.users.map((u) {
          final isCurrent = u.id == activeUser.id;
          return Card(
            margin: const EdgeInsets.only(bottom: 10),
            child: ListTile(
              leading: CircleAvatar(
                backgroundColor: u.isCoach ? Colors.purple : const Color(0xFF4F46E5),
                child: Text(u.name.substring(0, 1).toUpperCase(), style: const TextStyle(color: Colors.white)),
              ),
              title: Text(
                isCurrent ? '${u.name} (Vous)' : u.name,
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
              ),
              subtitle: Text(u.email, style: const TextStyle(fontSize: 12)),
              trailing: Chip(
                label: Text(roleToString(u.role), style: const TextStyle(fontSize: 11)),
                visualDensity: VisualDensity.compact,
              ),
            ),
          );
        }),
      ],
    );
  }

  void _openJoinTeamDialog(BuildContext context) {
    final ctrl = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Rejoindre une équipe'),
        content: TextField(
          controller: ctrl,
          decoration: const InputDecoration(labelText: 'Code d\'invitation (ex: SF-XXXXXX)'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Annuler')),
          FilledButton(
            onPressed: () async {
              final ok = await store.joinTeam(ctrl.text);
              if (!ctx.mounted) return;
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text(ok ? 'Équipe rejointe !' : 'Code d\'invitation invalide.')),
              );
            },
            child: const Text('Rejoindre'),
          ),
        ],
      ),
    );
  }

  void _openInviteDialog(BuildContext context) {
    final emailCtrl = TextEditingController();
    var role = 'MEMBER';
    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setStateDialog) => AlertDialog(
          title: const Text('Inviter un membre'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: emailCtrl,
                decoration: const InputDecoration(labelText: 'E-mail du membre inscrit'),
              ),
              const SizedBox(height: 10),
              DropdownButtonFormField<String>(
                initialValue: role,
                decoration: const InputDecoration(labelText: 'Rôle'),
                items: const [
                  DropdownMenuItem(value: 'MEMBER', child: Text('Membre')),
                  DropdownMenuItem(value: 'ADMIN', child: Text('Administrateur')),
                  DropdownMenuItem(value: 'COACH', child: Text('Coach')),
                  DropdownMenuItem(value: 'VIEWER', child: Text('Observateur')),
                ],
                onChanged: (v) => setStateDialog(() => role = v ?? 'MEMBER'),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Annuler')),
            FilledButton(
              onPressed: () async {
                final ok = await store.inviteMember(emailCtrl.text, role: role);
                if (!ctx.mounted) return;
                Navigator.pop(ctx);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(
                      ok ? 'Membre ajouté à l\'équipe !' : 'Utilisateur introuvable ou déjà membre.',
                    ),
                  ),
                );
              },
              child: const Text('Ajouter'),
            ),
          ],
        ),
      ),
    );
  }
}

