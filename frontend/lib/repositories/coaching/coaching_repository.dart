import '../../services/prisma_api_service.dart';

/// Repository dédié aux formations, séances de coaching, objectifs et compétences.
class CoachingRepository {
  CoachingRepository(this._api);

  final PrismaApiService _api;

  Future<bool> sync(String action, String userId, Map<String, dynamic> payload) =>
      _api.coaching.sync(action, userId, payload);
}

