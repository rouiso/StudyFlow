import 'auth/auth_provider.dart';
import 'calendar/calendar_provider.dart';
import 'coaching/coaching_provider.dart';
import 'communication/communication_provider.dart';
import 'kanban/kanban_provider.dart';
import 'studyflow_provider_base.dart';

export 'auth/auth_provider.dart';
export 'calendar/calendar_provider.dart';
export 'coaching/coaching_provider.dart';
export 'communication/communication_provider.dart';
export 'kanban/kanban_provider.dart';

typedef StudyFlowProvider = StudyFlowStore;

/// Provider principal composé des providers métier par domaine.
class StudyFlowStore extends StudyFlowStoreBase
    with
        AuthProviderMixin,
        KanbanProviderMixin,
        CalendarProviderMixin,
        CommunicationProviderMixin,
        CoachingProviderMixin {
  StudyFlowStore({
    super.api,
    super.authRepository,
    super.repository,
  });
}
