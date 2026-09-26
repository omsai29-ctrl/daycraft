/* ================= helpers ================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
const clone = o => JSON.parse(JSON.stringify(o));
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

const pad = n => String(n).padStart(2, '0');
const ymd = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const pd = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = pd(s); d.setDate(d.getDate() + n); return ymd(d); };
const today = () => ymd(new Date());
const nowMin = () => { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); };
const wdOf = s => (pd(s).getDay() + 6) % 7; // 0 = Monday
const diffDays = (a, b) => Math.round((pd(b) - pd(a)) / 864e5);
const toMin = t => { if (t == null || t === '') return null; const p = String(t).split(':'); return (+p[0]) * 60 + (+p[1] || 0); };
const fromMin = m => pad(Math.floor(m / 60) % 24) + ':' + pad(m % 60);
const stamp = () => { const n = new Date(); return ymd(n) + 'T' + pad(n.getHours()) + ':' + pad(n.getMinutes()); };

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const fmtT = m => {
  if (m == null) return '';
  const h = Math.floor(m / 60) % 24, mm = m % 60;
  return ((h % 12) || 12) + ':' + pad(mm) + ' ' + (h >= 12 ? 'PM' : 'AM');
};
const fmtRange = (s, e) => {
  if (s == null) return '';
  const a = fmtT(s), b = fmtT(e);
  const sameAp = a.slice(-2) === b.slice(-2);
  return (sameAp ? a.replace(/ [AP]M$/, '') : a) + '–' + b;
};
const fmtDur = m => {
  if (!m) return '';
  if (m < 60) return m + ' min';
  const h = Math.floor(m / 60), r = m % 60;
  return h + 'h' + (r ? ' ' + r + 'm' : '');
};
const fmtLong = s => { const d = pd(s); return DAYS[(d.getDay() + 6) % 7] + ', ' + MONTHS[d.getMonth()] + ' ' + d.getDate(); };
const fmtShort = s => { const d = pd(s); return MONTHS[d.getMonth()].slice(0, 3) + ' ' + d.getDate(); };
const fmtFull = s => fmtShort(s) + ', ' + pd(s).getFullYear();
const relLabel = s => {
  const n = diffDays(today(), s);
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  if (n === -1) return 'Yesterday';
  if (n > 1 && n < 7) return DAYS[wdOf(s)];
  return fmtShort(s) + (pd(s).getFullYear() !== new Date().getFullYear() ? ', ' + pd(s).getFullYear() : '');
};
const dueLabel = s => {
  const n = diffDays(today(), s);
  if (n < 0) return n === -1 ? 'Overdue since yesterday' : 'Overdue by ' + (-n) + ' days';
  if (n === 0) return 'Due today';
  if (n === 1) return 'Due tomorrow';
  if (n < 7) return 'Due ' + DAYS[wdOf(s)];
  return 'Due ' + fmtShort(s);
};
const inLabel = n => n <= 0 ? 'today' : n === 1 ? 'tomorrow' : 'in ' + n + ' days';
const minsLabel = m => m < 60 ? m + ' min' : (Math.floor(m / 60) + 'h' + (m % 60 ? ' ' + (m % 60) + 'm' : ''));

/* ================= icons ================= */
const IC = {
  today: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  planner: '<rect x="3" y="4.5" width="18" height="16.5" rx="2.5"/><path d="M16 2.5v4M8 2.5v4M3 10h18"/><path d="M7.5 14h4"/><path d="M7.5 17.5h9"/>',
  tasks: '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  plans: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h5M8 16h8"/>',
  subjects: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  goals: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  habits: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
  exams: '<path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/>',
  review: '<path d="M12 20V10M18 20V4M6 20v-4"/>',
  settings: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  more: '<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  left: '<path d="m15 18-6-6 6-6"/>',
  right: '<path d="m9 18 6-6-6-6"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  alert: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>',
  repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  sort: '<path d="M3 6h11M3 12h8M3 18h5"/><path d="m17 8 3-3 3 3M20 5v14"/>',
  flame: '<path d="M12 3c.5 3 2 4 3.5 5.5C17 10 18 11.8 18 14a6 6 0 0 1-12 0c0-1.6.6-2.9 1.6-4 .3 1 .9 1.6 1.7 1.8C10.8 9.4 11.6 6.4 12 3z"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>'
};
const ico = (n, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${IC[n] || ''}</svg>`;
const notificationsSupported = () => 'Notification' in window;
const notificationState = () => !notificationsSupported() ? 'unsupported' : Notification.permission;
const sendPlannerNotification = (title, body) => { try { if (notificationsSupported() && Notification.permission === 'granted') return new Notification(title, { body }); } catch (e) { /* noop */ } return null; };

/* ================= persistence ================= */
const KEY = 'planner.v1';
let store = null;
try { store = window.localStorage; store.setItem('__pl', '1'); store.removeItem('__pl'); } catch (e) { store = null; }
const storageOK = !!store;

const DEFAULT_SETTINGS = { dayStart: '07:00', dayEnd: '22:00', defaultDuration: 45, view: 'week', weekStart: 1, reminder: 10, theme: 'system' };
const SUBJECT_COLORS = ['#2A9D8F', '#C9883A', '#C25B7A', '#3B9AB5', '#7A8B45', '#B0703F', '#7B8794', '#8A6FD6', '#4F8F5B'];

function defaultSubjects() {
  return [['C Programming', '#2A9D8F'], ['Mathematics', '#C9883A'], ['Physics', '#C25B7A'], ['AI', '#3B9AB5'], ['Projects', '#7A8B45'], ['Assignments', '#B0703F'], ['Personal', '#7B8794']]
    .map(([name, color]) => ({ id: 's_' + name.toLowerCase().replace(/[^a-z]+/g, ''), name, color }));
}
function defaultHabits() {
  return ['Study', 'Exercise', 'Read', 'Sleep on time', 'Practice coding'].map((name, i) => ({ id: 'h_' + i + uid().slice(0, 3), name, log: {} }));
}

function blankTask(o) {
  return Object.assign({
    id: uid(), title: '', kind: 'task', subjectId: null, goalId: null, examId: null, priority: 'medium',
    date: null, start: null, duration: 45, due: null, recur: { type: 'none', days: [] },
    reminder: 'default', notes: '', subtasks: [], done: false, doneAt: null, skips: [], doneDates: {}, moves: []
  }, o || {});
}

function nextWeekday(from, wd) { // strictly after `from`
  let d = addDays(from, 1);
  while (wdOf(d) !== wd) d = addDays(d, 1);
  return d;
}

function seed() {
  const td = today(), n = nowMin();
  const subj = defaultSubjects();
  const S = k => subj.find(s => s.name === k).id;
  const habits = defaultHabits();
  habits.forEach((h, k) => { for (let i = 1; i <= 12; i++) if ((i * 3 + k * 5) % 7 < 5) h.log[addDays(td, -i)] = 1; });
  const g1 = uid(), g2 = uid(), g3 = uid(), ex1 = uid();
  const past = (start, dur) => toMin(start) + dur <= n;
  const T = (o) => blankTask(o);
  const tasks = [
    T({ title: 'Mathematics', kind: 'study', subjectId: S('Mathematics'), date: td, start: '09:00', duration: 60, done: past('09:00', 60), doneAt: past('09:00', 60) ? td + 'T10:00' : null }),
    T({ title: 'C Programming', kind: 'study', subjectId: S('C Programming'), goalId: g1, date: td, start: '10:00', duration: 90, done: past('10:00', 90), doneAt: past('10:00', 90) ? td + 'T11:30' : null }),
    T({ title: 'Break', kind: 'event', date: td, start: '11:30', duration: 30 }),
    T({ title: 'Physics lab preparation', subjectId: S('Physics'), goalId: g2, priority: 'high', date: td, start: '12:00', duration: 60, due: addDays(td, 1),
      subtasks: [{ id: uid(), text: 'Read the lab manual', done: true }, { id: uid(), text: 'Draft the procedure', done: true }, { id: uid(), text: 'Prepare the data table', done: false }],
      done: past('12:00', 60), doneAt: past('12:00', 60) ? td + 'T13:00' : null }),
    T({ title: 'Lunch', kind: 'event', date: td, start: '14:00', duration: 60, recur: { type: 'daily', days: [] } }),
    T({ title: 'Revise diffraction theory', kind: 'study', subjectId: S('Physics'), goalId: g2, examId: ex1, date: td, start: '15:30', duration: 45, done: past('15:30', 45), doneAt: past('15:30', 45) ? td + 'T16:15' : null }),
    T({ title: 'AI assignment', subjectId: S('AI'), priority: 'high', date: td, start: '16:15', duration: 60, due: addDays(td, 2) }),
    T({ title: 'Read C notes, chapter 4', subjectId: S('C Programming'), goalId: g1, priority: 'low', date: td }),
    T({ title: 'Practice coding', kind: 'study', subjectId: S('C Programming'), date: td, start: '20:00', duration: 45, recur: { type: 'daily', days: [] } }),
    T({ title: 'Physics Lab Report', subjectId: S('Physics'), goalId: g2, priority: 'high', date: addDays(td, 1), due: addDays(td, 1), duration: 60 }),
    T({ title: 'Physics', kind: 'study', subjectId: S('Physics'), examId: ex1, date: addDays(td, 1), start: '17:00', duration: 60 }),
    T({ title: 'C Assignment', subjectId: S('C Programming'), goalId: g1, priority: 'high', date: nextWeekday(td, 0), due: nextWeekday(td, 0) }),
    T({ title: 'Revise for AI quiz', kind: 'study', subjectId: S('AI'), date: nextWeekday(td, 1), start: '18:00', duration: 60 }),
    T({ title: 'AI Quiz', subjectId: S('AI'), priority: 'high', date: nextWeekday(td, 2), due: nextWeekday(td, 2) }),
    T({ title: 'Revise Optics', kind: 'study', subjectId: S('Physics'), examId: ex1, date: addDays(td, 3), start: '19:00', duration: 45 }),
    T({ title: 'Submit lab attendance form', subjectId: S('Personal'), date: addDays(td, -1), due: addDays(td, -1), duration: 15 }),
    T({ title: 'Email mentor about project idea', subjectId: S('Projects'), goalId: g3, date: null }),
    T({ title: 'Tidy up lab notebook', subjectId: S('Physics'), priority: 'low', date: null })
  ];
  const goals = [
    { id: g1, title: 'Finish C programming unit', deadline: addDays(td, 18), subjectId: S('C Programming'), milestones: [
      { id: uid(), text: 'Pointers', done: true, doneOn: addDays(td, -3) }, { id: uid(), text: 'Arrays and strings', done: true, doneOn: addDays(td, -1) },
      { id: uid(), text: 'Functions and recursion', done: false }, { id: uid(), text: 'File handling', done: false }] },
    { id: g2, title: 'Complete Physics lab preparation', deadline: addDays(td, 3), subjectId: S('Physics'), milestones: [
      { id: uid(), text: 'Finish the manual reading', done: true, doneOn: td }, { id: uid(), text: 'Write up the report', done: false }] },
    { id: g3, title: 'Finish project by October 10', deadline: '2026-10-10', subjectId: S('Projects'), milestones: [
      { id: uid(), text: 'Plan the features', done: true, doneOn: addDays(td, -6) }, { id: uid(), text: 'Build the first version', done: false },
      { id: uid(), text: 'Test with friends', done: false }, { id: uid(), text: 'Write the report', done: false }] }
  ];
  const topic = (t, d) => ({ id: uid(), text: t, done: d });
  const exams = [{ id: ex1, title: 'Physics Mid-Sem', subjectId: S('Physics'), date: '2026-10-12',
    topics: [topic('Units', true), topic('Waves', true), topic('Optics', true), topic('Diffraction', true), topic('Modern Physics', false)] }];
  return { v: 1, sample: true, updatedAt: 0, settings: clone(DEFAULT_SETTINGS), subjects: subj, tasks, plans: [], goals, exams, habits };
}

function migrate(o) {
  if (o.updatedAt == null) o.updatedAt = o.sample ? 0 : Date.now();
  o.settings = Object.assign({}, DEFAULT_SETTINGS, o.settings || {});
  ['subjects', 'tasks', 'plans', 'goals', 'exams', 'habits'].forEach(k => { if (!Array.isArray(o[k])) o[k] = []; });
  o.tasks = o.tasks.map(t => blankTask(t));
  return o;
}
function load() {
  try {
    const raw = store && store.getItem(KEY);
    if (raw) return migrate(JSON.parse(raw));
  } catch (e) { /* fall through */ }
  return seed();
}
let D = load();
let saveTimer = null;
function save() {
  D.updatedAt = Date.now();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { try { store && store.setItem(KEY, JSON.stringify(D)); } catch (e) { /* ignore */ } }, 120);
  schedulePush();
}

/* ================= transient UI state ================= */
const U = {
  page: 'today', pv: null, pd: today(), tf: { status: 'all', subject: '', priority: '', q: '', sort: 'smart' },
  subj: null, expanded: {}, goalOpen: {}, hv: 'week', hMonth: null, hSel: null, rv: today(), form: null, focus: null,
  focusEnd: false, plannerScrolled: false, doneOpen: true, wrap: false, pulse: null, lastTrigger: null
};
U.pv = (window.innerWidth < 700 && D.settings.view === 'week') ? 'day' : D.settings.view;
