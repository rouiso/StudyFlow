import 'dart:convert';
import '../api/api_client.dart';

/// Service HTTP dédié à l'authentification et aux équipes.
class AuthApiService {
  AuthApiService(this._client);

  final ApiClient _client;

  Future<Map<String, dynamic>?> postAuth({
    required String mode,
    required String email,
    required String password,
    String? name,
  }) async {
    final res = await _client.postJson('/api/mobile/auth', {
      'mode': mode,
      'email': email,
      'password': password,
      'name': ?name,
    });
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    if (res.statusCode == 200 && data['ok'] == true) {
      return data;
    }
    return null;
  }

  Future<bool> joinTeam(String userId, String inviteToken) =>
      _sync('JOIN_TEAM', userId, {'inviteToken': inviteToken});

  Future<bool> inviteMember(String userId, String email, {String role = 'MEMBER'}) =>
      _sync('INVITE_MEMBER', userId, {'email': email, 'role': role});

  Future<bool> _sync(String action, String userId, Map<String, dynamic> payload) async {
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
