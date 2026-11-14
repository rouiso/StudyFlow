import '../../core/models/studyflow_models.dart';
import '../../services/prisma_api_service.dart';
import '../../services/seed_data.dart';

/// Repository d'authentification et de gestion d'équipe.
class AuthRepository {
  AuthRepository({PrismaApiService? api}) : _api = api ?? PrismaApiService();

  final PrismaApiService _api;

  String get serverUrl => _api.baseUrl;

  void updateServerUrl(String url) {
    _api.baseUrl = url.trim().replaceAll(RegExp(r'/$'), '');
  }

  Future<AppUser?> login(String email, String password) async {
    try {
      final data = await _api.postAuth(
        mode: 'login',
        email: email,
        password: password,
      );
      if (data != null && data['user'] != null) {
        return AppUser.fromJson(data['user'] as Map<String, dynamic>);
      }
      return null;
    } catch (_) {
      return StudyFlowSeedData.users.cast<AppUser?>().firstWhere(
            (u) => u!.email.toLowerCase() == email.trim().toLowerCase(),
            orElse: () => null,
          );
    }
  }

  Future<AppUser?> register(String name, String email, String password) async {
    try {
      final data = await _api.postAuth(
        mode: 'register',
        name: name,
        email: email,
        password: password,
      );
      if (data != null && data['user'] != null) {
        return AppUser.fromJson(data['user'] as Map<String, dynamic>);
      }
      return null;
    } catch (_) {
      return AppUser(
        id: 'user-${DateTime.now().millisecondsSinceEpoch}',
        name: name.trim(),
        email: email.trim().toLowerCase(),
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        role: UserRole.member,
      );
    }
  }

  Future<bool> joinTeam(String userId, String inviteToken) =>
      _api.auth.joinTeam(userId, inviteToken);

  Future<bool> inviteMember(String userId, String email, {String role = 'MEMBER'}) =>
      _api.auth.inviteMember(userId, email, role: role);
}

