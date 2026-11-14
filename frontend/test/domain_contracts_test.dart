import 'package:flutter_test/flutter_test.dart';
import 'package:studyflow/core/domain/studyflow_contracts.dart';

void main() {
  test('exposes entities for every StudyFlow module', () {
    final entities = <Object>[
      const UserProfile(
        id: 'u1',
        displayName: 'Alex',
        email: 'alex@example.com',
      ),
      const Project(
        id: 'p1',
        teamId: 't1',
        ownerId: 'u1',
        name: 'Demo',
        status: 'active',
      ),
      const Task(
        id: 'task1',
        projectId: 'p1',
        title: 'Define entities',
        status: 'todo',
        priority: 'high',
        createdBy: 'u1',
      ),
      CalendarEvent(
        id: 'e1',
        teamId: 't1',
        title: 'Planning',
        startsAt: DateTime(2026, 1, 1),
        endsAt: DateTime(2026, 1, 1, 1),
        type: 'meeting',
      ),
      Message(
        id: 'm1',
        channelId: 'c1',
        authorId: 'u1',
        body: 'Hello',
        createdAt: DateTime(2026, 1, 1),
      ),
      const FileAsset(
        id: 'f1',
        teamId: 't1',
        name: 'brief.pdf',
        storagePath: 'teams/t1/brief.pdf',
        ownerId: 'u1',
      ),
      Training(
        id: 'tr1',
        title: 'Dart',
        description: 'Dart basics',
        objectives: const ['Types'],
        status: 'published',
      ),
    ];

    expect(entities, hasLength(7));
  });
}
