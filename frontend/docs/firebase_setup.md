# Firebase setup

The project is intentionally not configured with invented credentials.

1. Install the Firebase CLI and authenticate with the project owner account.
2. Run `firebase use studyflow-c9fba`.
3. Run `flutterfire configure --project=studyflow-c9fba` and select web,
   Android, and iOS.
4. Enable Email/Password Authentication, Firestore, Storage, Cloud Messaging,
   and App Check in the Firebase console.
5. Deploy rules and indexes with `firebase deploy --only firestore,storage`.
6. Deploy trusted functions from `functions/` after configuring their runtime
   secrets in the Firebase console.

Never commit `google-services.json`, `GoogleService-Info.plist`, service
accounts, or local environment files containing credentials.
