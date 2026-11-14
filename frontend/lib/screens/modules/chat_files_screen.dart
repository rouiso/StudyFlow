import 'dart:convert';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import '../../core/models/studyflow_models.dart';
import '../../state/studyflow_store.dart';

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key, required this.store});
  final StudyFlowStore store;

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final _msgCtrl = TextEditingController();

  @override
  void dispose() {
    _msgCtrl.dispose();
    super.dispose();
  }

  void _send() {
    if (_msgCtrl.text.trim().isEmpty) return;
    widget.store.sendMessage(_msgCtrl.text);
    _msgCtrl.clear();
  }

  @override
  Widget build(BuildContext context) {
    final user = widget.store.currentUser!;
    final messages = widget.store.currentMessages;

    return Column(
      children: [
        Expanded(
          child: messages.isEmpty
              ? const Center(child: Text('Aucun message dans ce canal.', style: TextStyle(color: Colors.grey)))
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: messages.length,
                  itemBuilder: (context, idx) {
                    final m = messages[idx];
                    final isMe = m.authorId == user.id;
                    final canModerate = user.role == UserRole.owner ||
                        user.role == UserRole.admin ||
                        user.role == UserRole.coach;
                    final author = widget.store.users.firstWhere(
                      (u) => u.id == m.authorId,
                      orElse: () => user,
                    );

                    return Align(
                      alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
                      child: Container(
                        constraints: const BoxConstraints(maxWidth: 340),
                        margin: const EdgeInsets.only(bottom: 10),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: isMe
                              ? const Color(0xFF4F46E5)
                              : Theme.of(context).colorScheme.surfaceContainerHighest,
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Column(
                          crossAxisAlignment: isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  isMe
                                      ? '${author.name} (Moi)'
                                      : '${author.name} · ${author.role.name.toUpperCase()}',
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                    color: isMe ? Colors.white70 : Colors.grey,
                                  ),
                                ),
                                if (isMe)
                                  IconButton(
                                    constraints: const BoxConstraints(),
                                    padding: const EdgeInsets.only(left: 6),
                                    iconSize: 14,
                                    tooltip: 'Modifier',
                                    icon: const Icon(Icons.edit_outlined, color: Colors.white70),
                                    onPressed: () => _openEditMessage(context, m),
                                  ),
                                if (isMe || canModerate)
                                  IconButton(
                                    constraints: const BoxConstraints(),
                                    padding: const EdgeInsets.only(left: 6),
                                    iconSize: 14,
                                    tooltip: 'Supprimer',
                                    icon: Icon(
                                      Icons.delete_outline,
                                      color: isMe ? Colors.white70 : Colors.redAccent,
                                    ),
                                    onPressed: () => widget.store.deleteMessage(m.id),
                                  ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Text(
                              m.content,
                              style: TextStyle(
                                fontSize: 13,
                                color: isMe ? Colors.white : null,
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
        ),
        Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _msgCtrl,
                  onSubmitted: (_) => _send(),
                  decoration: InputDecoration(
                    hintText: 'Écrire en tant que ${user.name.split(' ').first}...',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              FilledButton(
                onPressed: _send,
                style: FilledButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                child: const Icon(Icons.send, size: 18),
              ),
            ],
          ),
        ),
      ],
    );
  }

  void _openEditMessage(BuildContext context, ChatMessageItem m) {
    final ctrl = TextEditingController(text: m.content);
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Modifier le message'),
        content: TextField(
          controller: ctrl,
          maxLines: 3,
          decoration: const InputDecoration(border: OutlineInputBorder()),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Annuler')),
          FilledButton(
            onPressed: () {
              if (ctrl.text.trim().isNotEmpty) {
                widget.store.editMessage(m.id, ctrl.text.trim());
              }
              Navigator.pop(ctx);
            },
            child: const Text('Enregistrer'),
          ),
        ],
      ),
    );
  }
}

class FilesScreen extends StatelessWidget {
  const FilesScreen({super.key, required this.store});
  final StudyFlowStore store;

  @override
  Widget build(BuildContext context) {
    final files = store.currentFiles;

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Fichiers du projet (${files.length})', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              if (store.currentUser?.isCoachOrViewer != true)
                FilledButton.icon(
                  onPressed: () => _pickAndUploadFile(context),
                  icon: const Icon(Icons.upload_file, size: 18),
                  label: const Text('Téléverser'),
                ),
            ],
          ),
        ),
        Expanded(
          child: files.isEmpty
              ? const Center(child: Text('Aucun fichier partagé.', style: TextStyle(color: Colors.grey)))
              : ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 20),
                  itemCount: files.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (context, idx) {
                    final f = files[idx];
                    final sizeKb = (f.size / 1024).round();
                    final isImage = f.mimeType.startsWith('image/');
                    final fileUrl = '${store.serverUrl}/api/mobile/files/${f.id}?inline=1';

                    return Card(
                      child: ListTile(
                        onTap: () => _openFilePreview(context, f),
                        leading: isImage
                            ? ClipRRect(
                                borderRadius: BorderRadius.circular(8),
                                child: Image.network(
                                  fileUrl,
                                  width: 42,
                                  height: 42,
                                  fit: BoxFit.cover,
                                  errorBuilder: (_, __, ___) => const Icon(
                                    Icons.image_outlined,
                                    color: Color(0xFF4F46E5),
                                  ),
                                ),
                              )
                            : Icon(
                                f.mimeType.contains('pdf')
                                    ? Icons.picture_as_pdf
                                    : Icons.insert_drive_file_outlined,
                                color: const Color(0xFF4F46E5),
                              ),
                        title: Text(f.name, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                        subtitle: Text('$sizeKb Ko · ${f.createdAt.day}/${f.createdAt.month}/${f.createdAt.year}',
                            style: const TextStyle(fontSize: 11)),
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            IconButton(
                              tooltip: 'Visualiser',
                              icon: const Icon(Icons.visibility_outlined, size: 18),
                              onPressed: () => _openFilePreview(context, f),
                            ),
                            if (store.currentUser?.isCoachOrViewer != true)
                              IconButton(
                                tooltip: 'Supprimer',
                                icon: const Icon(Icons.delete_outline, size: 18, color: Colors.redAccent),
                                onPressed: () => store.deleteFile(f.id),
                              ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }

  Future<void> _pickAndUploadFile(BuildContext context) async {
    final picked = await FilePicker.pickFile();
    if (picked == null) return;
    final bytes = await picked.readAsBytes();

    final ok = await store.uploadRealFile(name: picked.name, bytes: bytes);
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            ok ? 'Fichier « ${picked.name} » téléversé !' : 'Échec du téléversement.',
          ),
        ),
      );
    }
  }

  bool _isTextFile(FileAssetItem f) {
    if (f.mimeType.startsWith('text/')) return true;
    final lower = f.name.toLowerCase();
    const exts = ['.txt', '.md', '.json', '.csv', '.log', '.xml', '.yaml', '.yml', '.dart', '.js', '.ts', '.css', '.html'];
    return exts.any((e) => lower.endsWith(e));
  }

  void _openFilePreview(BuildContext context, FileAssetItem f) {
    final fileUrl = '${store.serverUrl}/api/mobile/files/${f.id}?inline=1';
    final isImage = f.mimeType.startsWith('image/');
    final isText = _isTextFile(f);

    showDialog(
      context: context,
      builder: (ctx) => Dialog(
        insetPadding: const EdgeInsets.all(20),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 720, maxHeight: 560),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        f.name,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                      ),
                    ),
                    IconButton(
                      tooltip: 'Copier le lien',
                      icon: const Icon(Icons.link, size: 20),
                      onPressed: () {
                        Clipboard.setData(ClipboardData(text: fileUrl));
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Lien du fichier copié !')),
                        );
                      },
                    ),
                    IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: () => Navigator.pop(ctx),
                    ),
                  ],
                ),
                const Divider(),
                Expanded(
                  child: isImage
                      ? InteractiveViewer(
                          child: Center(
                            child: Image.network(
                              fileUrl,
                              fit: BoxFit.contain,
                              loadingBuilder: (_, child, progress) => progress == null
                                  ? child
                                  : const Center(child: CircularProgressIndicator()),
                              errorBuilder: (_, __, ___) => const Center(
                                child: Text('Aperçu image indisponible.'),
                              ),
                            ),
                          ),
                        )
                      : isText
                          ? FutureBuilder<http.Response>(
                              future: http.get(Uri.parse(fileUrl)),
                              builder: (_, snap) {
                                if (snap.connectionState == ConnectionState.waiting) {
                                  return const Center(child: CircularProgressIndicator());
                                }
                                if (snap.hasError || snap.data == null || snap.data!.statusCode != 200) {
                                  return const Center(child: Text('Impossible de charger le contenu texte.'));
                                }
                                final text = utf8.decode(snap.data!.bodyBytes, allowMalformed: true);
                                return SingleChildScrollView(
                                  child: SelectableText(
                                    text,
                                    style: const TextStyle(fontFamily: 'monospace', fontSize: 12),
                                  ),
                                );
                              },
                            )
                          : Center(
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(
                                    f.mimeType.contains('pdf')
                                        ? Icons.picture_as_pdf
                                        : Icons.insert_drive_file_outlined,
                                    size: 54,
                                    color: const Color(0xFF4F46E5),
                                  ),
                                  const SizedBox(height: 12),
                                  Text('${(f.size / 1024).round()} Ko · ${f.mimeType}'),
                                  const SizedBox(height: 12),
                                  SelectableText(
                                    fileUrl,
                                    textAlign: TextAlign.center,
                                    style: const TextStyle(fontSize: 12, color: Color(0xFF818CF8)),
                                  ),
                                ],
                              ),
                            ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

