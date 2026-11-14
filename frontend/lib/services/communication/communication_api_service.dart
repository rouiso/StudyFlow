import '../sync/sync_api_service.dart';

/// Service HTTP dédié au module Messagerie & Fichiers partagés.
class CommunicationApiService {
  CommunicationApiService(this._sync);

  final SyncApiService _sync;

  Future<bool> sync(String action, String userId, Map<String, dynamic> payload) =>
      _sync.syncAction(action: action, userId: userId, payload: payload);
}

