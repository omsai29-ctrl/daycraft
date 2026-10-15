/* ================= local revision flashcards =================
   Kept in a dedicated localStorage key. Never added to D, planner
   backups, or the Supabase cloud payload. */
const FLASHCARD_KEY = 'daycraft_flashcards_v1';
const FC = { deckId: null, cardId: null, showAnswer: false };

function flashcardStore() {
  try {
    const raw = localStorage.getItem(FLASHCARD_KEY);
    const value = raw ? JSON.parse(raw) : [];
    return Array.isArray(value) ? value : [];
  } catch (e) { return []; }
}
function saveFlashcardStore(decks) {
  try {
    localStorage.setItem(FLASHCARD_KEY, JSON.stringify(decks));
    return true;
  } catch (e) {
    toast('Could not save flashcards on this device. Check available storage.');
    return false;
  }
}
function flashcardDue(card) {
  return !card.dueAt || Number(card.dueAt) <= Date.now();
}
function flashcardNextDue(cards) {
  const dates = cards.map(c => Number(c.dueAt) || 0).filter(n => n > Date.now());
  return dates.length ? Math.min(...dates) : null;
}
function formatFlashcardDue(value) {
  if (!value) return 'Due now';
  const date = new Date(value);
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}
function viewFlashcards() {
  const decks = flashcardStore();
  const total = decks.reduce((n, d) => n + d.cards.length, 0);
  const due = decks.reduce((n, d) => n + d.cards.filter(flashcardDue).length, 0);
  const deck = decks.find(d => d.id === FC.deckId) || null;
  if (FC.deckId && !deck) { FC.deckId = null; FC.cardId = null; FC.showAnswer = false; }
  if (!deck) {
    const rows = decks.map(d => {
      const dueCount = d.cards.filter(flashcardDue).length;
      const next = flashcardNextDue(d.cards);
      return '<article class="fc-deck"><button class="fc-deck-open" data-a="fc-deck" data-id="' + esc(d.id) + '"><span class="grow"><b>' + esc(d.title) + '</b><small>' + d.cards.length + ' cards · ' + dueCount + ' due' + (next ? ' · Next ' + esc(formatFlashcardDue(next)) : '') + '</small></span><span class="muted">' + ico('right') + '</span></button></article>';
    }).join('');
    return pageHead('Revision Flashcards', 'Import AI-generated cards from a JSON file and revise offline.', '<button class="btn btn-primary" data-a="fc-import-open">' + ico('file-up') + 'Import JSON</button><input type="file" id="fc-import-file" accept=".json,application/json" class="sr" tabindex="-1">') +
      '<section class="fc-summary"><div><b>' + total + '</b><span>Total cards</span></div><div><b>' + due + '</b><span>Due now</span></div></section>' +
      (rows ? '<section class="fc-decks"><h2 class="h2">Your decks</h2>' + rows + '</section>' : emptyBox('No flashcards yet.', 'Ask ChatGPT to generate question-and-answer cards, save them as a JSON file, then import that file here.', '<button class="btn btn-primary" data-a="fc-import-open">Import JSON file</button>', true)) +
      '<section class="fc-format"><h2 class="h2">Expected JSON format</h2><p class="muted">Use a deck title and a cards array. Each card needs a front and back; subject and topic are optional.</p><pre><code>' + esc(JSON.stringify({ title: 'Linear Algebra', cards: [{ front: 'What is a matrix rank?', back: 'The number of linearly independent rows or columns.', subject: 'Mathematics', topic: 'Matrices' }] }, null, 2)) + '</code></pre><p class="muted">A plain array of cards with front and back fields is also accepted. Imports add a new deck; they never replace existing decks.</p></section>';
  }
  const dueCards = deck.cards.filter(flashcardDue);
  let card = deck.cards.find(c => c.id === FC.cardId && flashcardDue(c));
  if (!card && dueCards.length) { card = dueCards[0]; FC.cardId = card.id; FC.showAnswer = false; }
  if (!card) {
    const next = flashcardNextDue(deck.cards);
    return pageHead(deck.title, 'Revision deck · ' + deck.cards.length + ' cards', '<button class="btn" data-a="fc-back">All decks</button>') +
      emptyBox('You are caught up.', next ? 'Next scheduled review: ' + formatFlashcardDue(next) + '.' : 'All cards in this deck have been reviewed.', '', true);
  }
  const idx = deck.cards.findIndex(c => c.id === card.id) + 1;
  return pageHead(deck.title, 'Card ' + idx + ' of ' + deck.cards.length + ' · ' + dueCards.length + ' due', '<button class="btn" data-a="fc-back">All decks</button>') +
    '<section class="fc-study"><div class="fc-card-side"><div class="fc-eyebrow">' + esc(card.topic || card.subject || 'QUESTION') + '</div><h2>' + esc(card.front) + '</h2>' +
    (FC.showAnswer ? '<div class="fc-answer"><div class="fc-eyebrow">ANSWER</div><p>' + esc(card.back) + '</p></div>' : '<button class="btn btn-primary" data-a="fc-reveal">Show answer</button>') + '</div>' +
    (FC.showAnswer ? '<div class="fc-rating"><p>How well did you know it?</p><div class="chips"><button class="btn" data-a="fc-rate" data-rating="forgot">Forgot</button><button class="btn" data-a="fc-rate" data-rating="difficult">Difficult</button><button class="btn btn-primary" data-a="fc-rate" data-rating="easy">Easy</button></div></div>' : '') +
    '<p class="muted fc-progress">' + deck.cards.filter(c => c.lastRating === 'forgot' || c.lastRating === 'difficult').length + ' cards need extra practice in this deck.</p></section>';
}
function importFlashcardsFile(file) {
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { toast('Please use a JSON file smaller than 5 MB.'); return; }
  const reader = new FileReader();
  reader.onload = () => {
    let parsed;
    try { parsed = JSON.parse(String(reader.result || '')); }
    catch (e) { toast('That file is not valid JSON.'); return; }
    const sourceCards = Array.isArray(parsed) ? parsed : parsed && parsed.cards;
    if (!Array.isArray(sourceCards) || !sourceCards.length) { toast('JSON must contain a non-empty cards array.'); return; }
    if (sourceCards.length > 1000) { toast('Please import no more than 1,000 cards per deck.'); return; }
    const cards = [];
    for (let i = 0; i < sourceCards.length; i++) {
      const item = sourceCards[i];
      if (!item || typeof item !== 'object' || typeof item.front !== 'string' || typeof item.back !== 'string' || !item.front.trim() || !item.back.trim()) {
        toast('Card ' + (i + 1) + ' needs non-empty front and back text. Nothing was imported.');
        return;
      }
      cards.push({
        id: uid(), front: item.front.trim().slice(0, 2000), back: item.back.trim().slice(0, 2000),
        subject: typeof item.subject === 'string' ? item.subject.trim().slice(0, 120) : '',
        topic: typeof item.topic === 'string' ? item.topic.trim().slice(0, 120) : '',
        createdAt: Date.now(), dueAt: 0, intervalDays: 0, lastRating: null, lastReviewedAt: null, reviews: 0
      });
    }
    const decks = flashcardStore();
    const title = String((!Array.isArray(parsed) && parsed.title) || file.name.replace(/\.json$/i, '') || 'Imported flashcards').trim().slice(0, 120) || 'Imported flashcards';
    const deck = { id: uid(), title, createdAt: Date.now(), cards };
    decks.unshift(deck);
    if (!saveFlashcardStore(decks)) return;
    FC.deckId = deck.id; FC.cardId = cards[0].id; FC.showAnswer = false;
    render();
    toast('Imported ' + cards.length + ' flashcards. Saved on this device.');
  };
  reader.onerror = () => toast('Could not read that file.');
  reader.readAsText(file);
}
function rateFlashcard(rating) {
  if (!['easy', 'difficult', 'forgot'].includes(rating)) return;
  const decks = flashcardStore(), deck = decks.find(d => d.id === FC.deckId);
  const card = deck && deck.cards.find(c => c.id === FC.cardId);
  if (!card) return;
  const now = Date.now();
  card.lastRating = rating; card.lastReviewedAt = now; card.reviews = (card.reviews || 0) + 1;
  const interval = rating === 'easy' ? Math.max(7, (card.intervalDays || 0) * 2 || 7) : rating === 'difficult' ? 1 : 0;
  card.intervalDays = interval;
  card.dueAt = now + interval * 86400000;
  if (!saveFlashcardStore(decks)) return;
  const next = deck.cards.find(c => c.id !== card.id && flashcardDue(c));
  FC.cardId = next ? next.id : null; FC.showAnswer = false;
  render();
  if (!next) toast('Review saved. You have finished today’s due cards.');
}
