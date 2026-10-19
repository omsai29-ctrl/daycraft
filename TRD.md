# Daycraft — Technical Requirements Document

**Status:** Working draft based on repository structure; confirm runtime and Android behaviour with manual tests.

## 1. Architecture
- **Client:** HTML, CSS, and vanilla JavaScript in `src/`.
- **Build:** `build.py` reads `src/style.css`, concatenates sorted `src/js/*.js`, injects both into `src/template.html`, and writes `dist/index.html`.
- **Local persistence:** browser localStorage for planner state and a separate key for flashcards.
- **Optional cloud:** Supabase Auth and a `planner_data` table with one row per user, protected by row-level security.
- **Installability:** PWA assets plus a Capacitor Android project.
- **Automated checks:** Node's built-in test runner for pure validation logic; GitHub Actions runs tests and the build on the P0 workflow.

## 2. Repository conventions
- JavaScript modules are concatenated in filename order, so cross-file functions rely on that order.
- Keep browser code compatible with the existing non-module script build.
- Node-only exports in browser source must be guarded, e.g. `typeof module !== 'undefined'`.
- Keep tests under `tests/` and use `npm.cmd test` in Windows PowerShell if script execution policy blocks `npm.ps1`.

## 3. Data storage boundaries
- Planner data is held in the app's main data object and local cache.
- Flashcards use localStorage key `daycraft_flashcards_v1`, separate from the main planner object.
- Supabase sync currently targets planner data; do not assume flashcard decks sync to the cloud.
- Note attachment bytes are stored through device/local file handling where supported; JSON backup does not embed those bytes. Import must not delete pre-existing local attachment files.
- Clearing browser data, uninstalling an app, changing browser profiles, or using a different origin may affect localStorage. A backup is essential for data that must be retained.

## 4. Backup contract
The P0 backup bundle branch defines a versioned object:
- `format: "daycraft-backup"`
- `version: 2`
- `exportedAt` timestamp
- `planner` object containing planner data
- `flashcards` array of decks, each with a non-empty `cards` array
- Each card requires string `front` and `back` fields.
- Limits are enforced for deck count, cards per deck, total cards, and text lengths.
- Legacy planner-only JSON remains accepted by the validator and should not overwrite the separate flashcard store.
- Validate the entire payload before applying changes. A rejected import must not partially replace existing data.
- Export is intended to enforce a file-size ceiling and reject malformed collection items.

These requirements describe the PR branch implementation; confirm real export/import behaviour in the app before merging.

## 5. Security and privacy
- Only use Supabase public anon/publishable credentials in browser code.
- Never ship a service-role key to the client.
- Keep Row Level Security policies scoped to the authenticated user's own row.
- Do not log passwords, auth tokens, or private backup contents.
- Treat imported JSON as untrusted input and validate types, shapes, and size limits.
- Do not claim that local-only data is recoverable after browser storage is cleared unless an independent backup exists.

## 6. Error handling
- Storage write failures should return a failure result and present a user-visible message.
- Backup parse/validation failures should be non-destructive.
- Sync errors should be visible and retried safely rather than reported as successful sync.
- Device file operations should stop safely when file listing or migration checks fail.

## 7. Verification requirements
- Run `npm test` / `npm.cmd test`.
- Run `python build.py`.
- Confirm GitHub Actions on the exact commit.
- Manually test valid bundle export/import, invalid bundle rejection, legacy import, flashcard round-trip, notes and attachments, offline behaviour, sync, and core feature regressions.
- Run Android smoke tests on a real device or emulator before treating an APK as release-ready.
