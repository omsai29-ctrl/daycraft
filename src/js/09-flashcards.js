/* ================= revision flashcards (device-local) ================= */
const FC_KEY = 'daycraft.flashcards.v1';
const FC = { decks: [], pendingImport: null, activeDeck: null, activeCard: null, revealed: false, message: '' };

function fcLoad() {
  try {
    const raw = window.localStorage.getItem(FC_KEY);
    const data = raw ? JSON.parse(raw) : [];
    FC.decks = Array.isArray(data) ? data.filter(d => d && Array.isArray(d.cards)) : [];
  } catch (e) { FC.decks = []; }
}
function fcSave() {
  try { window.localStorage.setItem(FC_KEY, JSON.stringify(FC.decks)); return true; }
  catch (e) { toast('Could not save flashcards on this device. Check available storage.'); return false; }
}
function fcDue(card) { return !Number.isFinite(Number(card.dueAt)) || Number(card.dueAt) <= Date.now(); }
function fcAllCards() { return FC.decks.flatMap(deck => deck.cards.map(card => Object.assign({ deckId: deck.id, deckTitle: deck.title }, card))); }
function fcEsc(s) { return esc(String(s == null ? '' : s)); }
function fcDate(ts) {
  if (!Number.isFinite(Number(ts))) return 'Due now';
  const d = new Date(Number(ts));
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) + (d.toDateString() === new Date().toDateString() ? ' · today' : '');
}
function fcImportFromFile(file) {
  if (!file) return;
  if (!/\.json$/i.test(file.name || '')) { toast('Choose a .json flashcard file.'); return; }
  if (file.size > 5 * 1024 * 1024) { toast('This JSON file is too large (5 MB maximum).'); return; }
  const reader = new FileReader();
  reader.onload = () => {
    let raw;
    try { raw = JSON.parse(String(reader.result || '')); }
    catch (e) { toast('Invalid JSON. Please check the file format.'); return; }
    const source = Array.isArray(raw) ? { cards: raw } : raw;
    if (!source || !Array.isArray(source.cards) || !source.cards.length) {
      toast('Expected a JSON object with a non-empty "cards" array.'); return;
    }
    if (source.cards.length > 500) { toast('Import up to 500 cards per deck.'); return; }
    const cards = [];
    for (let i = 0; i < source.cards.length; i++) {
      const item = source.cards[i] || {};
      const front = String(item.front ?? item.question ?? item.prompt ?? '').trim();
      const back = String(item.back ?? item.answer ?? '').trim();
      if (!front || !back) { toast('Card ' + (i + 1) + ' needs both a question and an answer.'); return; }
      cards.push({ id: uid(), front, back, createdAt: Date.now(), dueAt: Date.now(), intervalDays: 0, reviews: 0, lastRating: null, topic: String(item.topic || source.topic || '').trim() });
    }
    FC.pendingImport = {
      id: uid(),
      title: String(source.title || source.name || 'Imported flashcards').trim().slice(0, 100) || 'Imported flashcards',
      subject: String(source.subject || '').trim().slice(0, 100),
      topic: String(source.topic || '').trim().slice(0, 100),
      createdAt: Date.now(),
      cards
    };
    openModal(
      '<div class="m-head"><h2>Preview flashcard import</h2><button class="icon-btn" data-a="close-modal" aria-label="Close">' + ico('x') + '</button></div>' +
      '<div class="m-body"><div class="fc-preview"><b>' + fcEsc(FC.pendingImport.title) + '</b>' +
      (FC.pendingImport.subject ? '<span>' + fcEsc(FC.pendingImport.subject) + '</span>' : '') +
      '<p>' + cards.length + ' cards will be added to this device.</p><div class="fc-preview-sample"><small>EXAMPLE QUESTION</small><div>' + fcEsc(cards[0].front) + '</div><small>ANSWER</small><div>' + fcEsc(cards[0].back) + '</div></div>' +
      '<p class="muted">This import adds a new deck; it will not replace existing decks or upload cards to Supabase.</p></div></div>' +
      '<div class="m-foot"><span class="grow"></span><button class="btn" data-a="close-modal">Cancel</button><button class="btn btn-primary" data-fc="confirm-import">Import ' + cards.length + ' cards</button></div>',
      { cls: 'sm', autofocus: false, label: 'Preview flashcard import' }
    );
  };
  reader.onerror = () => toast('Could not read that file.');
  reader.readAsText(file);
}
function fcImportConfirm() {
  const deck = FC.pendingImport;
  if (!deck) return;
  const existing = FC.decks.some(d => d.id === deck.id);
  if (!existing) FC.decks.push(deck);
  if (!fcSave()) return;
  FC.pendingImport = null;
  closeModal();
  FC.activeDeck = deck.id;
  FC.activeCard = null;
  FC.revealed = false;
  render();
  toast('Imported ' + deck.cards.length + ' flashcards. Available offline on this device.');
}
function fcStartReview(deckId) {
  const deck = FC.decks.find(d => d.id === deckId);
  const card = deck && deck.cards.filter(fcDue).sort((a,b) => Number(a.dueAt || 0) - Number(b.dueAt || 0))[0];
  if (!card) { toast('No cards are due in this deck.'); return; }
  FC.activeDeck = deck.id; FC.activeCard = card.id; FC.revealed = false; render();
}
function fcRate(rating) {
  const deck = FC.decks.find(d => d.id === FC.activeDeck);
  const card = deck && deck.cards.find(c => c.id === FC.activeCard);
  if (!card) return;
  const now = Date.now();
  card.reviews = (Number(card.reviews) || 0) + 1;
  card.lastRating = rating;
  if (rating === 'forgot') {
    card.intervalDays = 0;
    card.dueAt = now + 10 * 60 * 1000;
  } else if (rating === 'difficult') {
    card.intervalDays = card.intervalDays > 0 ? Math.max(1, Math.ceil(card.intervalDays * 1.2)) : 1;
    card.dueAt = now + card.intervalDays * 86400000;
  } else {
    card.intervalDays = card.intervalDays > 0 ? Math.min(60, Math.ceil(card.intervalDays * 2)) : 4;
    card.dueAt = now + card.intervalDays * 86400000;
  }
  if (!fcSave()) return;
  const next = deck.cards.filter(fcDue).sort((a,b) => Number(a.dueAt || 0) - Number(b.dueAt || 0))[0];
  FC.activeCard = next ? next.id : null;
  FC.revealed = false;
  render();
  if (!next) toast('Review complete for now.');
}
function viewFlashcards() {
  const all = fcAllCards(), due = all.filter(fcDue);
  const activeDeck = FC.decks.find(d => d.id === FC.activeDeck);
  const activeCard = activeDeck && activeDeck.cards.find(c => c.id === FC.activeCard);
  const actions = '<button class="btn btn-primary" data-fc="pick-file">' + ico('plus') + 'Import JSON</button><input id="fc-import-file" type="file" accept=".json,application/json" hidden>';
  let body = '';
  if (activeCard && activeDeck) {
    body = '<section class="fc-review-card"><div class="fc-review-meta"><span>' + fcEsc(activeDeck.title) + '</span><span>' + activeDeck.cards.filter(fcDue).length + ' due</span></div>' +
      '<div class="fc-card-side"><small>QUESTION</small><h2>' + fcEsc(activeCard.front) + '</h2></div>' +
      (FC.revealed ? '<div class="fc-card-side fc-answer"><small>ANSWER</small><p>' + fcEsc(activeCard.back) + '</p></div>' : '<button class="btn btn-primary fc-reveal" data-fc="reveal">Show answer</button>') +
      (FC.revealed ? '<div class="fc-ratings"><button class="btn" data-fc="rate" data-rating="forgot">Forgot</button><button class="btn" data-fc="rate" data-rating="difficult">Difficult</button><button class="btn btn-primary" data-fc="rate" data-rating="easy">Easy</button></div>' : '') +
      '<button class="btn btn-ghost" data-fc="stop-review">Back to decks</button></section>';
  } else {
    body = '<section class="fc-overview"><div class="fc-stat"><b>' + all.length + '</b><span>Total cards</span></div><div class="fc-stat"><b>' + due.length + '</b><span>Due now</span></div><div class="fc-stat"><b>' + all.filter(c => c.lastRating === 'difficult' || c.lastRating === 'forgot').length + '</b><span>Needs attention</span></div></section>' +
      '<div class="fc-help"><b>Import cards created with ChatGPT</b><p>Upload a JSON file containing a title and a <code>cards</code> array with <code>front</code> and <code>back</code> fields. Imports are stored locally and are not sent to cloud sync.</p><button class="btn btn-primary" data-fc="pick-file">' + ico('plus') + 'Choose JSON file</button></div>' +
      (FC.decks.length ? '<div class="fc-decks-head"><h2>Your decks</h2><span>' + FC.decks.length + (FC.decks.length === 1 ? ' deck' : ' decks') + '</span></div><div class="fc-decks">' + FC.decks.map(d => {
        const cards = d.cards || [], dDue = cards.filter(fcDue).length;
        const needs = cards.filter(c => c.lastRating === 'difficult' || c.lastRating === 'forgot').length;
        return '<article class="fc-deck"><div class="fc-deck-top"><div><h3>' + fcEsc(d.title) + '</h3>' +
          (d.subject ? '<span>' + fcEsc(d.subject) + '</span>' : '') +
          (d.topic ? '<span> · ' + fcEsc(d.topic) + '</span>' : '') + '</div><span class="fc-due-count">' + dDue + ' due</span></div>' +
          '<div class="fc-deck-meta"><span>' + cards.length + ' cards</span><span>' + needs + ' need review</span></div>' +
          '<button class="btn btn-primary" data-fc="review-deck" data-deck="' + fcEsc(d.id) + '" ' + (dDue ? '' : 'disabled') + '>' + (dDue ? 'Review due cards' : 'Nothing due') + '</button></article>';
      }).join('') + '</div>' : '<div class="fc-empty"><div class="fc-empty-icon">' + ico('flashcards') + '</div><h2>No flashcard decks yet</h2><p>Ask ChatGPT to create question-and-answer cards from your notes, save them as JSON, then import the file here.</p></div>');
  }
  return pageHead('Revision Flashcards', 'Import question-and-answer decks and revise offline.', actions) + '<div class="fc-page">' + body + '<p class="fc-local-note">' + ico('check') + ' Stored on this device only · No Supabase upload</p></div>';
}
IC.flashcards = '<rect x="3" y="4" width="14" height="16" rx="2"/><path d="M7 8h6M7 12h6M7 16h3"/><path d="M17 7h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-9"/>';
NAV.push(['flashcards', 'Revision Flashcards']);
NAV_GROUPS.push(['Study', ['flashcards']]);
NAV_LABEL.flashcards = 'Revision Flashcards';
PAGES.flashcards = viewFlashcards;
fcLoad();

document.addEventListener('click', e => {
  const el = e.target.closest && e.target.closest('[data-fc]');
  if (!el) return;
  const action = el.dataset.fc;
  if (action === 'pick-file') { const input = document.getElementById('fc-import-file'); if (input) input.click(); }
  else if (action === 'confirm-import') fcImportConfirm();
  else if (action === 'reveal') { FC.revealed = true; render(); }
  else if (action === 'rate') fcRate(el.dataset.rating);
  else if (action === 'review-deck') fcStartReview(el.dataset.deck);
  else if (action === 'stop-review') { FC.activeCard = null; FC.revealed = false; render(); }
});
document.addEventListener('change', e => {
  if (e.target && e.target.id === 'fc-import-file') {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    fcImportFromFile(file);
  }
});
