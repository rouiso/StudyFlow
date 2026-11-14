# PDF requirements traceability

The attached `StudyFlow Cahier des charges v2` is the functional source of
truth. The repository follows its seven-module split and endpoint list while
using Firebase instead of the PDF's Serverpod/PostgreSQL infrastructure, as
required by the project brief.

## Implemented domain contract

The exact principal entities from PDF §7.1 are in
`lib/core/domain/specification_entities.dart`:

- M1: User, Team, TeamMember
- M2: Project, ProjectColumn, ProjectTemplate
- M3: Task, Subtask, Label
- M4: Milestone, Reminder, CalendarToken, Activity, ProjectSnapshot, Report
- M5: Channel, Message, Notification
- M6: FileAsset, Folder, FileVersion
- M7: Training, CoachingSession, CoachingGoal

The PDF's associated tables are also represented: TaskAssignee, TaskLabel,
MessageRead, TrainingEnrollment, and TrainingResource.

The named actions from PDF §16.1 are typed in
`lib/core/domain/module_services.dart`. Firebase implementations should be
added behind these interfaces; UI code must depend on interfaces, not on
Firestore SDK calls.

## Delivery status

| Area | Status |
| --- | --- |
| Responsive Flutter shell and seven module entry points | Implemented |
| Exact PDF entity and service contracts | Implemented |
| Firebase security rules and indexes | Implemented |
| Firebase Auth, Firestore, Storage, FCM runtime wiring | Pending project configuration |
| Concrete repositories and Cloud Functions | Pending |
| Real-time chat, uploads, reports, and AI operations | Pending backend implementation |
| Unit/widget tests for current contracts and shell | Implemented |
| Integration/emulator/security-rule tests | Pending Firebase emulator setup |

This distinction is intentional: no Firebase credentials, model provider keys,
or fabricated runtime data are committed to the repository.
