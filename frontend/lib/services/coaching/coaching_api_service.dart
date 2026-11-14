import '../sync/sync_api_service.dart';

/// Service HTTP dédié au module Formations, Coaching, Objectifs & Compétences.
class CoachingApiService {
  CoachingApiService(this._sync);

  final SyncApiService _sync;

  Future<bool> sync(String action, String userId, Map<String, dynamic> payload) =>
      _sync.syncAction(action: action, userId: userId, payload: payload);
}

