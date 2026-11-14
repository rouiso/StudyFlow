import '../../services/prisma_api_service.dart';

/// Repository dédié aux projets, colonnes Kanban, tâches et sous-tâches.
class KanbanRepository {
  KanbanRepository(this._api);

  final PrismaApiService _api;

  Future<bool> sync(String action, String userId, Map<String, dynamic> payload) =>
      _api.kanban.sync(action, userId, payload);
}

