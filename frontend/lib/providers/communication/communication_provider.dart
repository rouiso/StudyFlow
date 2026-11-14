import 'dart:convert';
import '../../core/models/studyflow_models.dart';
import '../studyflow_provider_base.dart';

/// Provider du domaine Communication (Messagerie & Fichiers partagés).
mixin CommunicationProviderMixin on StudyFlowStoreBase {
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

    await communicationRepo.sync('SEND_MESSAGE', currentUser!.id, {
      'projectId': activeProject.id,
      'content': content.trim(),
    });
    await hydrateFromPrisma();
  }

  Future<void> editMessage(String messageId, String content) async {
    if (currentUser == null || content.trim().isEmpty) return;
    messages = messages
        .map((m) => m.id == messageId ? m.copyWith(content: content.trim()) : m)
        .toList();
    notifyListeners();

    await communicationRepo.sync('EDIT_MESSAGE', currentUser!.id, {
      'messageId': messageId,
      'content': content.trim(),
    });
  }

  Future<void> deleteMessage(String messageId) async {
    if (currentUser == null) return;
    messages = messages.where((m) => m.id != messageId).toList();
    notifyListeners();

    await communicationRepo.sync('DELETE_MESSAGE', currentUser!.id, {'messageId': messageId});
  }

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

    final ok = await communicationRepo.sync('UPLOAD_FILE', currentUser!.id, {
      'projectId': activeProject.id,
      'name': trimmed,
      'mimeType': mime,
      'size': bytes.length,
      'contentBase64': base64Encode(bytes),
    });
    await hydrateFromPrisma();
    return ok;
  }

  Future<void> deleteFile(String fileId) async {
    if (currentUser == null || currentUser!.isCoachOrViewer) return;
    files = files.where((f) => f.id != fileId).toList();
    notifyListeners();

    await communicationRepo.sync('DELETE_FILE', currentUser!.id, {'fileId': fileId});
  }
}

