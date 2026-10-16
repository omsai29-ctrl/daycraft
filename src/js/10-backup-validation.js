function validateBackup(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid');
  const bundled = value.format === 'daycraft-backup';
  if (bundled && (!Number.isInteger(value.version) || value.version !== 2)) throw new Error('version');
  const planner = bundled ? value.planner : value;
  if (!planner || typeof planner !== 'object' || Array.isArray(planner) || !Array.isArray(planner.tasks)) throw new Error('planner');
  const collections = ['tasks', 'subjects', 'plans', 'notes', 'noteFolders', 'goals', 'exams', 'habits', 'focusSessions'];
  for (const key of collections) {
    if (planner[key] != null && !Array.isArray(planner[key])) throw new Error('collection');
    if (Array.isArray(planner[key]) && planner[key].some(item => !item || typeof item !== 'object' || Array.isArray(item))) throw new Error('collection item');
  }
  if (planner.tasks.some(t => !t || typeof t !== 'object' || Array.isArray(t))) throw new Error('task');
  if (planner.attendance != null && (typeof planner.attendance !== 'object' || Array.isArray(planner.attendance))) throw new Error('attendance');
  if (planner.settings != null && (typeof planner.settings !== 'object' || Array.isArray(planner.settings))) throw new Error('settings');
  if (planner.timetable != null && (typeof planner.timetable !== 'object' || Array.isArray(planner.timetable))) throw new Error('timetable');
  if (planner.timetable && planner.timetable.entries != null && !Array.isArray(planner.timetable.entries)) throw new Error('timetable entries');
  let flashcards = null;
  if (bundled) {
    if (!Array.isArray(value.flashcards) || value.flashcards.length > 500) throw new Error('flashcards');
    flashcards = value.flashcards;
    let cardCount = 0;
    for (const deck of flashcards) {
      if (!deck || typeof deck !== 'object' || Array.isArray(deck) || typeof deck.title !== 'string' || !Array.isArray(deck.cards) || deck.cards.length === 0) throw new Error('deck');
      if (deck.title.length > 500 || deck.cards.length > 10000 || (cardCount += deck.cards.length) > 20000) throw new Error('card limit');
      for (const card of deck.cards) {
        if (!card || typeof card !== 'object' || Array.isArray(card) || typeof card.front !== 'string' || typeof card.back !== 'string' || card.front.length > 20000 || card.back.length > 20000) throw new Error('card');
      }
    }
  }
  return { planner, flashcards, bundled, exportedAt: bundled ? value.exportedAt : null };
}

// Export for Node's built-in test runner; ignored in the browser build.
if (typeof module !== 'undefined' && module.exports) module.exports = { validateBackup };
