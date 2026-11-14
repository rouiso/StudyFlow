class ChatMessageItem {
  const ChatMessageItem({
    required this.id,
    required this.channelId,
    required this.authorId,
    required this.content,
    required this.createdAt,
  });

  final String id;
  final String channelId;
  final String authorId;
  final String content;
  final DateTime createdAt;

  ChatMessageItem copyWith({String? content}) => ChatMessageItem(
        id: id,
        channelId: channelId,
        authorId: authorId,
        content: content ?? this.content,
        createdAt: createdAt,
      );

  factory ChatMessageItem.fromJson(Map<String, dynamic> json) => ChatMessageItem(
        id: json['id']?.toString() ?? '',
        channelId: json['channelId']?.toString() ?? 'proj-1',
        authorId: json['authorId']?.toString() ?? '',
        content: json['content']?.toString() ?? '',
        createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? '') ?? DateTime.now(),
      );
}

class FileAssetItem {
  const FileAssetItem({
    required this.id,
    required this.projectId,
    required this.uploaderId,
    required this.name,
    required this.mimeType,
    required this.size,
    required this.createdAt,
  });

  final String id;
  final String projectId;
  final String uploaderId;
  final String name;
  final String mimeType;
  final int size;
  final DateTime createdAt;

  factory FileAssetItem.fromJson(Map<String, dynamic> json) => FileAssetItem(
        id: json['id']?.toString() ?? '',
        projectId: json['projectId']?.toString() ?? 'proj-1',
        uploaderId: json['uploaderId']?.toString() ?? 'user-1',
        name: json['name']?.toString() ?? 'fichier',
        mimeType: json['mimeType']?.toString() ?? 'application/octet-stream',
        size: (json['size'] as num?)?.toInt() ?? 0,
        createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? '') ?? DateTime.now(),
      );
}

