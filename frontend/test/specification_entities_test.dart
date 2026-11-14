import 'package:flutter_test/flutter_test.dart';
import 'package:studyflow/core/domain/specification_entities.dart';
import 'package:studyflow/core/domain/module_services.dart';

void main() {
  test('covers the v2.1 principal entity set and service contracts', () {
    final user = User(
      id: 'u1',
      name: 'Alex',
      email: 'alex@example.com',
      createdAt: DateTime(2026),
    );
    final training = Training(
      id: 'training1',
      teamId: 'team1',
      title: 'Flutter',
      description: 'Build Flutter apps',
      skill: 'Flutter',
      level: TrainingLevel.beginner,
      trainerId: 'u1',
      startsAt: DateTime(2026, 1, 1),
      endsAt: DateTime(2026, 1, 2),
      capacity: 20,
      mode: TrainingMode.online,
      status: TrainingStatus.published,
    );

    expect(user.email, 'alex@example.com');
    expect(training.status, TrainingStatus.published);
    expect(TeamRole.values, contains(TeamRole.coach));
    expect(SkillLevel(userId: 'u1', skill: 'Flutter', level: 2).level, 2);
  });
}
