# Daycraft — Application Flow

**Status:** High-level map inferred from the current navigation and event handlers. Verify against the running app when UI changes.

## 1. Entry and navigation
```text
Launch app
  ├─ Load local planner state
  ├─ Apply saved appearance preferences
  ├─ Initialise optional Supabase sync
  └─ Open Today
       ├─ Plan: Planner / Timetable / Tasks / Checklist / Plans / Focus / Attendance
       ├─ Track: Notes / Subjects / Goals / Habits / Exams / Flashcards
       ├─ Reflect: Review
       └─ Settings
```

## 2. Task flow
```text
Choose Add task or checklist action
  → Enter task details
  → Validate required fields
  → Save to local planner state
  → Refresh view and show confirmation
```

## 3. Notes flow
```text
Open Notes
  → Choose subject/folder or create one
  → Create/edit note
  → Optionally attach device files where supported
  → Save note metadata locally
  → Reopen note and verify attachment access
```
Attachment file bytes are not embedded in JSON backup. Test attachment recovery separately from note metadata restore.

## 4. Backup and restore flow
### Export
```text
Settings → Your data → Export backup
  → Collect planner data
  → Collect flashcard decks (versioned backup implementation)
  → Validate export limits and data shapes
  → Download JSON file
```

### Import
```text
Settings → Your data → Import backup
  → Select JSON file
  → Parse and validate the entire payload
  → If invalid: show error; leave current data unchanged
  → If valid: restore flashcards when present
  → Apply planner data
  → Refresh app and report result
```

Legacy planner-only backups should remain importable and must not erase the separate flashcard store. The round-trip flow must be manually verified before merging the backup change.

## 5. Flashcard flow
```text
Flashcards → Import JSON
  → Parse deck/cards
  → Require non-empty front/back text
  → Save deck to localStorage
  → Open a card
  → Reveal answer
  → Rate Forgot / Difficult / Easy
  → Update review schedule locally
```
Current flashcard storage is local to the browser/app origin and is not part of the Supabase planner sync payload.

## 6. Cloud sync flow
```text
Settings → Sync / Account
  → Configure Supabase and authenticate
  → Keep local data available offline
  → Push/pull supported planner payload
  → Show synced, syncing, or retry/error state
```
Do not assume flashcards or attachment bytes participate in this sync flow.

## 7. Release path
```text
Feature branch
  → Automated tests
  → Build
  → Manual P0 checks
  → Code review
  → Merge to main
  → GitHub Pages deployment (if workflow succeeds)
  → Android sync/build/sign
  → Device smoke test
```
