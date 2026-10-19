# Daycraft — UI/UX Design Brief

**Status:** Product direction and usability requirements; exact visuals should be checked against the current deployed build.

## 1. Experience goal
A calm, fast, practical planner that feels at home on both laptop and phone. Prioritise clarity, predictable navigation, and quick capture over decorative complexity.

## 2. Design principles
- **Readable first:** clear hierarchy, comfortable text contrast, and uncluttered cards.
- **Consistent actions:** reuse familiar button styles, labels, and interaction patterns.
- **Responsive layouts:** desktop may use a sidebar; mobile should prioritise the core actions and avoid unnecessary scrolling.
- **Customisable, not chaotic:** offer coherent themes with related accent choices while keeping text legible.
- **Feedback for every important action:** show save, sync, import, and failure states.
- **Accessible controls:** meaningful labels, visible focus states, keyboard support where appropriate, and touch-friendly targets.

## 3. Information architecture
### Plan
Today, Planner, Timetable, Tasks, Checklist, Plans, Focus, Attendance.

### Track
Notes, Subjects, Goals, Habits, Exams, Flashcards.

### Reflect
Review.

Settings should remain easy to find, including data export/import, sync/account settings, and appearance controls.

## 4. Visual direction
- Support light and dark themes.
- Provide a classic monochrome option: dark text on a light surface, understated borders, restrained accent use.
- Offer distinct accent palettes rather than mixing unrelated accent colours inside one theme.
- Keep status colours meaningful (e.g. warning/error) and separate from decorative accents.
- Timetable appearance controls should make class blocks, text colour, borders, and session labels easy to distinguish.
- Avoid text or quote overlays in decorative backgrounds where they compete with planning content.

## 5. Key flows to optimise
1. Add a task from any main view with minimal required fields.
2. Add an untimed checklist item or plan without filling start/end times.
3. Navigate and edit timetable on a phone with minimal horizontal/vertical friction.
4. Create a subject note and folder, then attach and reopen a file on supported Android builds.
5. Export a backup and restore it with a clear confirmation.
6. Import a flashcard JSON file and review cards offline.
7. Understand whether data is local-only, syncing, synced, or in an error/retry state.

## 6. Mobile usability requirements
- Keep primary navigation and Add actions reachable.
- Minimise repeated scrolling for the timetable and long settings pages.
- Avoid controls that depend only on hover.
- Make dialogs fit smaller screens and preserve entered values on recoverable validation errors.
- Make file selection, multi-file selection, and image browsing behaviour explicit where supported.

## 7. UX states that must be designed
- Empty state with one clear next action.
- Loading/connecting state.
- Saved locally / syncing / synced / sync error.
- Import validation failure with no data changes.
- Storage quota or permission failure.
- No flashcards due versus deck empty.
- Offline use and later reconnection.
- Android file permission or missing attachment.

## 8. Review checklist
- Can a first-time user locate each major section?
- Can a task/plan be captured quickly without unnecessary fields?
- Is the active theme visually obvious and readable?
- Does mobile timetable navigation avoid excessive scrolling?
- Are destructive actions confirmed and reversible where possible?
- Do success messages reflect actual completed operations?
- Does each error explain what happened and what to do next?
