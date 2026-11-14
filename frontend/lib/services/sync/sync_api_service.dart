import 'dart:convert';
import '../api/api_client.dart';

/// Service HTTP dédié à la synchronisation et au chargement de l'espace de travail.
class SyncApiService {
  SyncApiService(this._client);

  final ApiClient _client;

  Future<Map<String, dynamic>?> fetchBootstrap(String userId) async {
    try {
      final res = await _client.get('/api/mobile/bootstrap?userId=$userId');
      if (res.statusCode == 200) {
        final json = jsonDecode(res.body) as Map<String, dynamic>;
        if (json['ok'] == true && json['data'] != null) {
          return json['data'] as Map<String, dynamic>;
        }
      }
    } catch (_) {}
    return null;
  }

  Future<bool> syncAction({
    required String action,
    required String userId,
    required Map<String, dynamic> payload,
  }) async {
    try {
      final res = await _client.postJson('/api/mobile/sync', {
        'action': action,
        'userId': userId,
        'payload': payload,
      });
      final json = jsonDecode(res.body) as Map<String, dynamic>;
      return res.statusCode == 200 && json['ok'] == true;
    } catch (_) {
      return false;
    }
  }
}

