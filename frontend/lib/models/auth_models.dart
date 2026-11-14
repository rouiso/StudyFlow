enum UserRole { owner, admin, member, coach, viewer }

UserRole parseUserRole(String? raw) {
  switch (raw?.toUpperCase()) {
    case 'OWNER':
      return UserRole.owner;
    case 'ADMIN':
      return UserRole.admin;
    case 'COACH':
      return UserRole.coach;
    case 'VIEWER':
      return UserRole.viewer;
    default:
      return UserRole.member;
  }
}

String roleToString(UserRole role) {
  switch (role) {
    case UserRole.owner:
      return 'OWNER';
    case UserRole.admin:
      return 'ADMIN';
    case UserRole.coach:
      return 'COACH';
    case UserRole.viewer:
      return 'VIEWER';
    case UserRole.member:
      return 'MEMBER';
  }
}

class AppUser {
  const AppUser({
    required this.id,
    required this.name,
    required this.email,
    required this.avatar,
    required this.role,
  });

  final String id;
  final String name;
  final String email;
  final String avatar;
  final UserRole role;

  bool get isCoachOrViewer => role == UserRole.coach || role == UserRole.viewer;
  bool get isCoach => role == UserRole.coach;
  bool get canEditTasks => !isCoachOrViewer;

  factory AppUser.fromJson(Map<String, dynamic> json) => AppUser(
        id: json['id']?.toString() ?? '',
        name: json['name']?.toString() ?? 'Utilisateur',
        email: json['email']?.toString() ?? '',
        avatar: json['avatar']?.toString() ?? json['image']?.toString() ?? '',
        role: parseUserRole(json['role']?.toString()),
      );
}

