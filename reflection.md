# StudyFlow - Technical Reflection

## 1. Project overview

StudyFlow is a progressive-web project collaboration application delivered as an
installable Progressive Web App. Its interface is built with Next.js, React, and
TypeScript. The backend uses Next.js route handlers and MongoDB through the MongoDB
Node.js driver. It supports project
planning, Kanban tasks, deadlines, team chat, files, training, coaching, reporting,
and AI-assisted workflows.

The application combines browser-side persistence with server data. The interface
saves its working state to `localStorage`, while the service worker caches static
assets and pages for a limited offline experience. API calls remain network-dependent.
The backend centralizes data access, role checks, AI-provider calls, and queued email
delivery. This makes the project useful as a connected end-to-end demonstration, while
also exposing areas that still need production hardening.

## 2. Team contribution

### Mehdi - Authentication

Mehdi worked on authentication and account access. This part includes sign-up,
sign-in, password management, session loading, user profiles, logout, and protection
of authenticated actions. New accounts can join an existing team with an invitation
code or create a project and become its owner. Authentication was made independent
of the demo login interface, which now requires a real email and password.

### Oumaima - Projects, Kanban, columns, and teams

Oumaima worked on project and workspace organization. The application supports
multiple projects, project selection, project names and descriptions, project colors,
Kanban boards, configurable columns, column positions, and Kanban view navigation.
Team support includes team membership, invitation codes, owner management, and
workspace-level separation.

### Iheb - Tasks and subtasks

Iheb implemented the task experience. A task has a title, description, priority,
deadline, project, column, creator, assignees, labels, and subtasks. Tasks can be
created, edited, assigned, and deleted. Subtasks provide a smaller breakdown
of each task and contribute to completion indicators. Assignment changes and overdue
tasks are also connected to the notification system.

### Achref - Calendar, milestones, statistics, and reports

Achref created the calendar and reporting area. The agenda combines task deadlines,
milestones, formations, and coaching sessions into a single multi-source calendar.
Users can filter events by day and navigate between months.

The reports tab contains project-level KPIs: global progress, completed tasks,
overdue tasks, deadlines within seven days, subtasks completed, and active milestones.
It also presents task distribution by Kanban column and priority. The report period
can be limited to the complete project, the last seven days, or the last thirty days.
Generated reports are stored and listed in the application, and project metrics can
be exported as CSV text.

### Soulaima - Chat

Soulaima developed the team chat and notification experience. Chat channels are
associated with projects and teams. Users can send messages, edit their own messages,
and moderate or delete messages according to their role. The channel interface also
supports moderation and project-context filtering. Chat content is used locally by
the assistant to extract potential action items and summarize recent conversation,
without exposing private coaching information.

### Rihab - File storage, permissions, and sharing

Rihab handled file storage and access control. Files are uploaded to the backend,
associated with a project, and stored with file metadata and versions. The interface
supports upload, preview, download, sharing context, and deletion for authorized users.
Coach users are not allowed to modify project files or team work. Role checks are also
applied to team membership and invitation actions.

### Maysa - Coaching

Maysa worked on formations and coaching. The module includes training catalog entries,
skills, levels, capacity limits, online or on-site mode, and enrollment. Users can
request coaching sessions, propose dates, and receive confirmed appointments.
Coaches manage sessions, confirm slots, provide shared reports, and write private
coach-only notes. Coach accounts open directly in the coaching and formations workspace
without project navigation unrelated to their role.

### The whole team - Mail, chatbot, and AI

The complete team contributed to the cross-cutting AI and communication features.
The backend is responsible for credentials and context, while Flutter presents the
results and chat interface.

The application includes:

- A Groq-powered help assistant with a local FAQ fallback.
- An explainable local AI engine for every module.
- Automatic SMTP mail notifications.
- Scheduled deadline reminders.
- Automatic Jitsi meeting-room links for online formations and coaching.

## 3. Module reflection

### Authentication, teams, and permissions

Registration supports creating an account and then choosing onboarding, joining a team
with an invitation token, or creating a team. Team membership is the basis for access
to projects. The application defines three roles: `OWNER` manages the team and project
administration, `MEMBER` works on project tasks and files, and `COACH` focuses on
training and coaching while remaining read-only for project work.

The server issues an HttpOnly session cookie and checks team membership and role in
many data-changing routes. This is a useful separation between presentation controls
and backend authorization. However, the current authentication implementation is
unfinished: registration requires a password but does not save it, and login finds a
user by email without verifying the submitted password. Authentication therefore needs
to be completed before the application can be treated as production-ready.

### Projects, Kanban, and tasks

Projects organize their teams, ordered workflow columns, tasks, milestones, files,
messages, and activity. The Kanban board supports configurable columns and WIP limits.
Tasks carry priority, descriptions, due dates, assignees, labels, and subtasks. Progress
is visible both at task level and across the project, helping the team turn large
deliverables into smaller pieces of work.

The task and column APIs validate project relationships and call shared permission
checks before allowing changes. AI-assisted task breakdown and board generation can
reduce the effort of planning, but generated content still needs review by the team
before it becomes a commitment.

### Calendar and project reporting

The calendar brings together project deadlines, milestones, training sessions, and
coaching appointments. It supports navigating dates, managing milestones, extracting
dated events from user-provided text, and exporting calendar data as an iCalendar
(`.ics`) file. The weekly summary feature uses the same kinds of upcoming items to
prepare an email overview.

The statistics view translates project state into progress and workload information,
including task completion, priorities, and work distribution. These views are most
useful when the team keeps task statuses and due dates current; otherwise, the
indicators can be precise calculations of outdated data.

### Chat, files, and activity

Project chat gives members a shared place to discuss work, while activity records help
explain changes to the project. File metadata and version history are stored in
MongoDB; uploaded file contents are written to the server's local `uploads` directory
unless `UPLOAD_DIR` is configured elsewhere. The upload route checks membership,
file size, disallowed executable extensions, and the configured project storage quota.

This design is straightforward for a local demonstration. A deployed multi-instance
service would need shared object storage and a clear retention and backup strategy
rather than relying on one server's filesystem.

### Training, skills, and coaching

The learning area combines training entries, enrollment, skill levels, and coaching
sessions. The application distinguishes coach and member capabilities, and stores
coaching sessions and goals as part of the project workspace. AI can draft training
descriptions, coaching topics, and skill suggestions from a user's request; people
remain responsible for choosing schedules, capacity, and final content.

## 4. Artificial intelligence

AI is integrated through server-side route handlers, so provider keys are read from
environment variables rather than exposed in browser code. Gemini is the primary
provider and Groq can be used as a fallback. The server also implements local
heuristics and deterministic templates for selected recommendations and generation
operations, which keeps some functions useful when a provider is not configured.
Operations that require a valid model response can still return an explicit service
error when neither provider supplies usable output.

The current AI features include:

- Generating Kanban structures, workflow columns, tasks, and subtasks.
- Drafting training, coaching topics, and project skill lists.
- Extracting profile skills and dated calendar events from user-provided text.
- Producing contextual recommendations from tasks, columns, project membership,
  skills, training, recent files, and other authorized project data.
- Opening a contextual assistant from the application screens.

The AI route requires a session and applies a per-user request limit. Project-based
generators check team membership and role. AI output is normalized before it is
returned or used, but generated recommendations remain suggestions and should not
replace human review. Limiting prompts to the relevant project context is also
important because prompts and project data may be sent to an external provider.

### Generative AI for planning

The `/api/ai` route supports generating Kanban boards, columns, tasks, subtasks, skills,
training drafts, and coaching topics. Some operations use deterministic local templates
when a provider is unavailable; others return an explicit error if a valid model result
is required. Role checks limit which team members can generate or apply project content.

### Contextual AI recommendations

Contextual AI recommendations use authorized project information, such as tasks,
columns, team roles, skills, training, recent files, and recent channel messages. Private
coaching notes are not included in the constructed AI context. The API requires a
session and applies a per-user request limit. AI output is normalized before it is
returned or used, but recommendations remain suggestions and require human review.
Project prompts and data can be sent to an external provider, so limiting context to
what is needed is an important privacy consideration.

## 5. Email and scheduled work

Email is handled on the server through an SMTP-configured queue. The service renders
text and HTML templates, records message status, retries temporary failures with
increasing delays, and uses fingerprints to avoid queuing duplicate reminders.
The scheduled `/api/cron` handler requires a configured secret and prepares
near-deadline and overdue notifications as well as weekly summaries containing tasks,
milestones, training, and coaching.

Keeping delivery outside the user-facing action means an SMTP problem does not have
to undo a task or enrollment change. It also makes clear operational logging and
monitoring important: queued, retried, and permanently failed messages should be
observable without exposing message contents or credentials.

## 6. Security and data handling

The backend contains shared checks for team membership, project access, and role-based
actions. Sensitive AI generation, file upload, task editing, and team administration
are intended to be governed by these checks rather than by hiding buttons in the UI.
Provider credentials are held in environment configuration, and file uploads are
bounded by size, extension, and quota checks.

There are still important gaps to close before a production deployment. Passwords are
not currently persisted or verified by the authentication routes, so the session
cookie alone does not establish a secure password-based login. The database inspection
endpoint should also be restricted to authenticated, authorized operators before it
is exposed outside a local demonstration. Session lifecycle, request validation, and
permission coverage should be tested systematically across every API route.

## 7. Technical choices

Next.js provides both the React interface and server-side route handlers, reducing the
number of separately deployed services. TypeScript helps keep UI and API data shapes
consistent, while the component-based interface supports desktop and mobile layouts.
The PWA manifest and service worker make the app installable and cache static assets
and pages. The app also saves its working state in browser `localStorage`; API routes
are deliberately excluded from service-worker caching, so server-backed operations
still need a network connection.

MongoDB is accessed through the official Node.js driver. This keeps the current data layer direct and avoids an
extra database service, while placing more responsibility on the adapter and the
application to enforce validation and data relationships.

## 8. Challenges and lessons learned

One challenge is keeping browser state and server-owned data aligned. Local storage
makes the interface resilient to reloads and brief network loss, while account,
membership, and project data still need to be loaded from the backend. Clear ownership
of each field and an explicit conflict-resolution strategy will become increasingly
important as the app grows.

A second challenge is authorization across multiple modules. A role decision made
only in the UI is not enough, so route handlers need consistent membership and
permission checks. Central helpers reduce duplication, but automated tests are
needed to prevent a newly added endpoint from bypassing the policy.

A third challenge is making AI useful without making the application dependent on a
provider. Local heuristics are predictable and fast; generative output is more
flexible but can be incomplete or incorrect. Separating generation from approval
keeps the user in control.

Finally, email and file operations cross system boundaries. Queues and bounded
uploads make failures easier to handle, but production use will require durable
storage, backups, observability, and operational limits.

## 9. Improvements for future work

The next steps for a production-oriented version are:

- Hash and verify passwords with a dedicated password-hashing algorithm, add account
  recovery, and issue sessions with a secure lifecycle.
- Restrict diagnostic endpoints and add route-by-route authorization tests.
- Define a reliable offline mutation queue, retry policy, and conflict-resolution
  behavior rather than relying only on cached pages and local state.
- Add MongoDB schema validation, indexes, and integration tests for critical flows.
- Move uploads to shared object storage and add backup, retention, and malware-scanning
  policies.
- Add delivery metrics and operational alerts for the email queue and scheduled jobs.
- Evaluate AI outputs, provider limits, and data-minimization rules with representative
  prompts and explicit user review.
- Add end-to-end tests for owner, member, and coach experiences on desktop and mobile.

## 10. Conclusion

StudyFlow connects planning, execution, communication, learning, and reporting in one
mobile-first application. Its Next.js interface, MongoDB-backed route handlers,
local browser persistence, PWA caching, role-aware workflows, AI helpers, and SMTP
queue demonstrate how these concerns can work together in a student project.

The strongest outcome is the breadth of the connected workflow: a team can organize
projects, track tasks and milestones, share files, discuss progress, and use training
and coaching features without leaving the application. The main lesson is that a
convincing interface is only one part of a reliable product. Authentication,
authorization, offline synchronization, and production data operations must be
validated as carefully as the visible features.
