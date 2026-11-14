# Firestore data model

Core documents use generated IDs and store `createdAt`/`updatedAt` timestamps.
References are IDs, not duplicated mutable objects.

| Collection | Required fields | Access |
| --- | --- | --- |
| `users` | `displayName`, `email`, `skills`, `availability` | owner |
| `teams` | `name`, `ownerId` | members |
| `teams/{teamId}/members` | `userId`, `role`, `joinedAt` | members; owner manages |
| `projects` | `teamId`, `ownerId`, `memberIds`, `name`, `status` | project members |
| `tasks` | `projectId`, `memberIds`, `assigneeId`, `status`, `dueDate` | project members |
| `calendar_events` | `teamId`, `startsAt`, `endsAt`, `type` | team members |
| `channels/messages` | `channelId`, `authorId`, `body`, `createdAt` | channel members |
| `files` | `teamId`, `projectId`, `storagePath`, `ownerId` | team members |
| `trainings` | `ownerId`, `objectives`, `materials` | published/team scope |
| `coaching_sessions` | `coachId`, `learnerId`, `startsAt`, `status` | participants |
| `ai_recommendations` | `userId`, `kind`, `explanation`, `confidence` | target user/team |

Use the indexes in `firestore.indexes.json` for the first critical queries.
Paginate lists with a cursor and limit; do not load an entire team into the
client. Cloud Functions should materialize expensive reports in
`project_statistics` and label predictions separately from measured values.
