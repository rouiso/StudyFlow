import 'package:flutter_test/flutter_test.dart';
import 'package:studyflow/core/models/studyflow_models.dart';
import 'package:studyflow/services/seed_data.dart';
import 'package:studyflow/main.dart';
import 'package:studyflow/providers/studyflow_provider.dart';

void main() {
  testWidgets('starts on LoginScreen with demo profiles', (tester) async {
    await tester.pumpWidget(const StudyFlowApp());
    await tester.pumpAndSettle();

    expect(find.text('Connexion à StudyFlow'), findsOneWidget);
    expect(find.text('Léa Martin'), findsOneWidget);
    expect(find.text('Mme Dupont'), findsOneWidget);
  });

  test('M1: Coach role cannot edit or move tasks (§4.2)', () {
    final coach = StudyFlowSeedData.users.firstWhere((u) => u.role == UserRole.coach);
    final owner = StudyFlowSeedData.users.firstWhere((u) => u.role == UserRole.owner);

    expect(coach.isCoachOrViewer, isTrue);
    expect(coach.canEditTasks, isFalse);
    expect(owner.canEditTasks, isTrue);
  });

  test('M2: calculateBetween computes fractional index between cards', () {
    expect(calculateBetween(1000.0, 2000.0), 1500.0);
    expect(calculateBetween(null, 1000.0), 500.0);
    expect(calculateBetween(2000.0, null), 3000.0);
  });

  test('M7: Full training rejects new enrollment', () async {
    final store = StudyFlowStore();
    store.currentUser = store.users.firstWhere((u) => u.id == 'user-3'); // Sarah (not enrolled in tr-1)
    // tr-1 has capacity 2 and 2 pre-seeded enrollments
    final err = await store.enrollTraining('tr-1');
    expect(err, isNotNull);
  });

  test('AI: aiBreakdownTask generates 3 subtasks', () {
    final subtasks = aiBreakdownTask('Créer API Prisma');
    expect(subtasks.length, 3);
  });
}
