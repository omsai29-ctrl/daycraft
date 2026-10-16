const test = require('node:test');
const assert = require('node:assert/strict');
const { validateBackup } = require('../src/js/10-backup-validation.js');

function planner(overrides = {}) {
  return {
    v: 2,
    tasks: [{ id: 'task-1', title: 'Disposable test task' }],
    subjects: [],
    plans: [],
    notes: [],
    noteFolders: [],
    goals: [],
    exams: [],
    habits: [],
    focusSessions: [],
    attendance: {},
    settings: {},
    timetable: { entries: [] },
    ...overrides
  };
}
function bundle(overrides = {}) {
  return {
    format: 'daycraft-backup',
    version: 2,
    exportedAt: '2026-10-16T00:00:00.000Z',
    planner: planner(),
    flashcards: [{ id: 'deck-1', title: 'Test deck', cards: [{ id: 'card-1', front: 'Question', back: 'Answer' }] }],
    ...overrides
  };
}

test('accepts a valid versioned bundle and returns planner plus flashcards', () => {
  const result = validateBackup(bundle());
  assert.equal(result.bundled, true);
  assert.equal(result.planner.tasks.length, 1);
  assert.equal(result.flashcards[0].cards[0].back, 'Answer');
});

test('accepts a legacy planner-only backup without replacing flashcards', () => {
  const result = validateBackup(planner());
  assert.equal(result.bundled, false);
  assert.equal(result.flashcards, null);
});

test('rejects missing planner tasks before import', () => {
  assert.throws(() => validateBackup({ notes: [] }));
});

test('rejects invalid collection types and malformed collection entries', () => {
  assert.throws(() => validateBackup(planner({ notes: {} })));
  assert.throws(() => validateBackup(planner({ notes: ['not-a-note-object'] })));
});

test('rejects malformed attendance and timetable entries', () => {
  assert.throws(() => validateBackup(planner({ attendance: [] })));
  assert.throws(() => validateBackup(planner({ timetable: { entries: {} } })));
});

test('rejects unsupported bundle versions', () => {
  assert.throws(() => validateBackup(bundle({ version: 3 })));
});

test('rejects malformed decks and cards', () => {
  assert.throws(() => validateBackup(bundle({ flashcards: [{ title: 'Bad deck', cards: [{ front: 'Question' }] }] })));
  assert.throws(() => validateBackup(bundle({ flashcards: [{ title: 'Bad deck', cards: [] }] })), { message: 'deck' });
});

test('enforces deck, card-count, and card-text limits', () => {
  assert.throws(() => validateBackup(bundle({ flashcards: Array(501).fill({ title: 'Deck', cards: [] }) })));
  assert.throws(() => validateBackup(bundle({ flashcards: [{ title: 'Deck', cards: Array(10001).fill({ front: 'Q', back: 'A' }) }] })));
  assert.throws(() => validateBackup(bundle({ flashcards: [{ title: 'Deck', cards: [{ front: 'Q'.repeat(20001), back: 'A' }] }] })));
});

test('rejects null, arrays, and primitive top-level inputs', () => {
  for (const value of [null, [], 'backup', 7]) assert.throws(() => validateBackup(value));
});
