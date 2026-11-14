import '../../services/prisma_api_service.dart';

/// Repository dédié à l'agenda, aux jalons et aux rapports.
class CalendarRepository {
  CalendarRepository(this._api);

  final PrismaApiService _api;

  Future<bool> sync(String action, String userId, Map<String, dynamic> payload) =>
      _api.calendar.sync(action, userId, payload);
}

