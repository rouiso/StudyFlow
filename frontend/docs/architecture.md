# StudyFlow architecture

StudyFlow is a Flutter application targeting web first and keeping the client
portable to Android and iOS. The UI is feature-oriented and uses an explicit
domain boundary so Firebase repositories can be introduced without coupling
widgets to Firestore.

## Layers

- `lib/app`: application composition, theme, and navigation.
- `lib/core`: cross-cutting errors, services, AI contracts, and shared widgets.
- `lib/core/domain/studyflow_contracts.dart`: typed entities and service
  contracts for every module. Concrete Firebase implementations should live in
  each feature's `data/` folder.
- `lib/features`: one folder per module (M1-M7), each split into `data`,
  `domain`, and `presentation`.
- `functions`: trusted server-side work such as notifications, report
  aggregation, and AI requests.

The current web shell is a usable local preview. It deliberately does not
pretend that Firebase is configured: the generated `firebase_options.dart`
must come from `flutterfire configure` against project `studyflow-c9fba`.

## Module boundaries

1. Authentication and teams
2. Projects and Kanban
3. Tasks and assignments
4. Calendar, deadlines, reports, and statistics
5. Chat and notifications
6. File management and sharing
7. Training, coaching, and skills

Each repository must enforce team/project membership in addition to the
Firestore and Storage rules. The client never makes authorization decisions.

## Entities, services, and actions

The domain contract maps each module to its persistent entities and explicit
actions:

| Module | Entities | Service actions |
| --- | --- | --- |
| M1 Authentication and teams | `UserProfile`, `Team`, `TeamMember`, `TeamInvitation` | register, sign in, reset password, manage profile, create team, invite, accept, change role, remove member, recommend members |
| M2 Projects and Kanban | `Project`, `KanbanColumn`, `Label` | create/update/archive projects, add/reorder columns, create labels, recommend templates, detect bottlenecks |
| M3 Tasks and assignments | `Task`, `Subtask`, `TaskComment`, `TaskAttachment` | create/update/move/assign tasks, add subtasks/comments/attachments, recommend assignees, predict overdue risk |
| M4 Calendar and reports | `CalendarEvent`, `Deadline`, `ProjectReport` | watch/create/update/cancel events, list deadlines, schedule reminders, generate/export reports, predict deadlines, detect conflicts |
| M5 Chat and notifications | `Channel`, `Message`, `Notification` | create channels, stream/send/read messages, manage notifications, summarize conversations, extract action items |
| M6 Files and sharing | `Folder`, `FileAsset`, `FileVersion` | create folders, upload/delete/version/share files, download, search, summarize documents |
| M7 Training and coaching | `Training`, `TrainingEnrollment`, `CoachingSession`, `Skill`, `DevelopmentGoal` | create/enroll/progress training, request/cancel coaching, assess skills, create goals, recommend paths, identify gaps |
