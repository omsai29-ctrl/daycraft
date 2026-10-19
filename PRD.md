# Daycraft — Product Requirements Document

**Status:** Working draft; validate against current product behaviour before treating every item as shipped.  
**Product type:** Personal planner / study organiser for web, installable PWA, and Android wrapper.

## 1. Product vision
Daycraft helps a student organise academic and personal work in one lightweight planner that works locally, can be used offline, and can optionally sync planner data across devices.

## 2. Problem
Tasks, class schedules, notes, attendance, revision, and personal goals are often scattered across separate tools. A useful planner should make routine capture quick, keep the main schedule readable on mobile, and protect users from accidental data loss.

## 3. Target users
- Students who manage classes, assignments, exams, revision, and attendance.
- Individuals who want a simple daily planner on a laptop and phone.
- Users with modest hardware or intermittent connectivity who benefit from a lightweight web app.

## 4. Product principles
1. **Local-first:** keep the app useful without signing in.
2. **Explicit sync:** cloud sync is optional and must communicate its state.
3. **Safe data operations:** validate imports before applying them and explain limitations.
4. **Low-friction capture:** tasks and plans should be quick to add.
5. **Mobile usability:** key actions should not require excessive scrolling.
6. **Honest status:** distinguish implemented, tested, and planned functionality.

## 5. Main feature areas
- **Planning:** Today, Planner, Tasks, Checklist, Plans, and Timetable.
- **Study tracking:** Subjects, Attendance, Exams, Focus sessions, Goals, Habits, and Review.
- **Notes:** notes and folders, with device-side attachment handling in supported environments.
- **Revision:** local flashcard decks imported from JSON and reviewed offline.
- **Personalisation:** themes, accent colours, and timetable appearance controls.
- **Data safety:** export/import backups, local persistence, and optional Supabase account-based sync for the planner data model.
- **Installability:** PWA support and an Android/Capacitor project.

Feature availability can vary by build and platform. Use the regression checklist in `BRAIN.md` before calling a feature release-ready.

## 6. Functional requirements
- Users can create, edit, complete, and organise planner tasks.
- Users can view and edit a weekly timetable and configure session appearance.
- Users can create untimed plans and checklist items.
- Users can manage notes and note folders.
- Users can record attendance against subjects.
- Users can import flashcards with non-empty front/back text and review cards locally.
- Users can export and import planner data; the P0 backup bundle change proposes including flashcard decks while retaining legacy planner-only import compatibility.
- Users can use local data without cloud authentication.
- Signed-in users can optionally sync supported planner data through Supabase.

## 7. Non-functional requirements
- Run as a lightweight HTML/CSS/JavaScript app.
- Build using Python 3 with `python build.py`.
- Avoid exposing Supabase service-role credentials in client code.
- Reject malformed or unsupported backup data before changing existing data.
- Show actionable errors when local storage or file operations fail.
- Maintain a repeatable test/build workflow in GitHub Actions.

## 8. Out of scope unless separately approved
- Paid API dependencies as a requirement for core planner use.
- Assuming device attachment bytes are embedded in JSON backups.
- Assuming flashcards are cloud-synced; current implementation stores them separately in localStorage.
- Treating an Android release APK as ready before device-level validation.

## 9. Success measures
- Backup export and restore preserve supported data.
- Invalid imports leave existing data unchanged.
- Core planner features pass the P0 regression checklist.
- Offline use remains functional for locally stored data.
- Sync state and conflicts/errors are understandable.
- Mobile navigation and timetable use are practical.

## 10. Release gates
P0 data-safety checks and manual runtime checks must pass before merge/release. Automated validation tests and a successful build are necessary but not sufficient. Track unresolved items explicitly in `BRAIN.md`.
