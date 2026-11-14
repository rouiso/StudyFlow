import '../../services/prisma_api_service.dart';

/// Repository dédié à la messagerie et aux fichiers partagés.
class CommunicationRepository {
  CommunicationRepository(this._api);

  final PrismaApiService _api;

  Future<bool> sync(String action, String userId, Map<String, dynamic> payload) =>
      _api.communication.sync(action, userId, payload);
}

