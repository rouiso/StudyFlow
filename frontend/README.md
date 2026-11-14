# StudyFlow

StudyFlow is a Flutter web-first workspace for student teams: projects,
Kanban tasks, deadlines, reports, chat, files, training, and coaching.

## Current status

The repository contains a responsive Material 3 application shell with all
seven module entry points, dashboard metrics, navigation, theme switching,
Firebase rules/indexes, and architecture documentation. The UI currently runs
in local preview mode until Firebase configuration is generated for the
existing project `studyflow-c9fba`.

## Run locally

```powershell
flutter pub get
flutter run -d chrome
flutter analyze
flutter test
```

## Firebase

Follow [docs/firebase_setup.md](docs/firebase_setup.md) before enabling
production repositories. Do not invent or commit Firebase credentials.

See [docs/architecture.md](docs/architecture.md),
[docs/database_schema.md](docs/database_schema.md), and
[docs/ai_ml_architecture.md](docs/ai_ml_architecture.md) for the implementation
boundaries and data contracts.

The PDF-to-code mapping is tracked in
[docs/requirements_traceability.md](docs/requirements_traceability.md).
