# Daycraft — Project Brain

This file is the short operational source of truth for current decisions, architecture, and verification status. Update it when implementation or test status changes.

## Project identity
- Repository: `omsai29-ctrl/daycraft`
- App: Daycraft / My Planner
- Stack: HTML, CSS, vanilla JavaScript; Python build script; localStorage; optional Supabase; PWA/Capacitor Android.
- Build command: `python build.py`
- Windows PowerShell tests: `npm.cmd test` when `npm.ps1` is blocked.

## Core product rules
1. Keep local/offline use functional.
2. Cloud sync is optional and currently covers planner data, not every local store.
3. Flashcards currently use separate localStorage key `daycraft_flashcards_v1`; do not promise cloud sync.
4. JSON backups do not embed note attachment file bytes.
5. Never merge data-safety changes based on unit tests alone; complete runtime checks first.
6. Never say a deployment or APK build succeeded unless its workflow/build result confirms it.

## Current P0 backup work
- PR #5: [P0.1: Include flashcards in validated planner backups](https://github.com/omsai29-ctrl/daycraft/pull/5)
- Branch: `p0/complete-backup-bundle`
- Head at last check: `81bd193b15f12b5777847c778a931ddb11b6e1b9`
- Draft and unmerged by design.
- GitHub Actions “Daycraft P0 checks” passed on the checked commit.
- Local nine-test validation suite and Python build passed previously.
- Manual runtime checks already completed:
  - Normal planner backup export/import with disposable task and note.
  - Unsupported backup version rejected with “Invalid or unsupported backup. Nothing was changed.”
- Manual checks still needed:
  - Import disposable flashcard JSON, export backup, inspect bundle, restore and verify deck/cards.
  - Legacy planner-only backup import without erasing existing flashcards.
  - Note attachment file access after restore/restart and document the non-embedded attachment limitation.
  - Broader regression checks: Notes, Attendance, Timetable, Plans, Checklist, Focus, Subjects, Exams, Habits, Goals.
  - Offline/local persistence and optional cloud sync safety.
  - Android smoke test.
- Do not merge PR #5 until remaining critical runtime checks and review are complete.

## Suggested test order
1. Flashcard round-trip (two-card disposable deck).
2. Legacy backup import while a disposable flashcard deck exists.
3. Note metadata and attachment persistence test.
4. Regression pass over main features.
5. Offline use, then reconnect and inspect sync state.
6. Android test.
7. Review PR #5, update status, then merge only when gates pass.
8. Add/review documentation and proceed to P1.

## P1 ideas (not a commitment or current implementation)
- Dashboard personalisation: reorder/hide cards, theme and timetable controls.
- Better mobile timetable navigation.
- Quick-add untimed plans/checklist items.
- Notes folder and attachment UX improvements.
- Universal search.
- AI study assistant through a secure backend; never expose provider secret keys in client code.
- Revision flashcard import/export and study flow refinements.

## Documentation policy
These docs are working drafts. Mark items as implemented, tested, planned, or unverified rather than describing desired behaviour as a guaranteed feature. Update this file after each material change.
