/* ================= scheduling logic ================= */
const isRec = t => !!(t.recur && t.recur.type && t.recur.type !== 'none');
const PR = { high: 0, medium: 1, low: 2 };
const subjOf = id => D.subjects.find(s => s.id === id) || null;
const goalOf = id => D.goals.find(g => g.id === id) || null;
const taskOf = id => D.tasks.find(t => t.id === id) || null;

function occursOn(t, d) {
  if (!isRec(t)) return t.date === d;
  if (!t.date || d < t.date) return false;
  if (t.skips && t.skips.includes(d)) return false;
  if (t.recur.until && d > t.recur.until) return false;
  const wd = wdOf(d);
  switch (t.recur.type) {
    case 'daily': return true;
    case 'weekly': return wd === wdOf(t.date);
    case 'custom': return (t.recur.days || []).includes(wd);
  }
  return false;
}
const isDoneOn = (t, d) => isRec(t) ? !!(t.doneDates && t.doneDates[d]) : !!t.done;
function inst(t, d) {
  const s = toMin(t.start), dur = t.duration || D.settings.defaultDuration;
  return { t, d, id: t.id, key: t.id + '@' + d, start: s, end: s == null ? null : s + dur, dur, done: isDoneOn(t, d), kind: t.kind || 'task' };
}
const dayInst = d => D.tasks.filter(t => occursOn(t, d)).map(t => inst(t, d));
const byTime = (a, b) => (a.start == null ? 9999 : a.start) - (b.start == null ? 9999 : b.start) || PR[a.t.priority] - PR[b.t.priority];

function overdueList() {
  const td = today();
  return D.tasks.filter(t => !isRec(t) && !t.done && t.kind !== 'event' && ((t.date && t.date < td) || (t.due && t.due < td)))
    .map(t => inst(t, t.date || t.due))
    .sort((a, b) => (a.d < b.d ? -1 : 1));
}

function busy(d, excludeId) {
  return dayInst(d).filter(i => i.start != null && !i.done && i.id !== excludeId).sort((a, b) => a.start - b.start);
}
function conflictFor(d, start, dur, excludeId) {
  if (!d || start == null) return null;
  return busy(d, excludeId).find(i => start < i.end && start + dur > i.start) || null;
}
function freeSlot(d, dur, from, excludeId) {
  let s = Math.ceil(from / 5) * 5;
  for (const i of busy(d, excludeId)) {
    if (i.end <= s) continue;
    if (i.start >= s + dur) break;
    s = Math.max(s, i.end);
  }
  s = Math.ceil(s / 5) * 5;
  return s + dur <= 1440 ? s : null;
}

function detach(t, d) {
  t.skips = t.skips || [];
  if (!t.skips.includes(d)) t.skips.push(d);
  const c = clone(t);
  c.id = uid(); c.recur = { type: 'none', days: [] }; c.skips = []; c.moves = [];
  c.date = d; c.done = !!(t.doneDates && t.doneDates[d]); c.doneAt = c.done ? t.doneDates[d] : null; c.doneDates = {};
  D.tasks.push(c);
  return c;
}

/* Move items [{id,d}] to a date. `start` undefined = keep time, null = untimed, number = minutes. */
function moveItems(items, date, start) {
  items.forEach(({ id, d }) => {
    let t = taskOf(id); if (!t) return;
    if (isRec(t)) t = detach(t, d);
    const prev = t.date, dur = t.duration || D.settings.defaultDuration;
    let s = start === undefined ? toMin(t.start) : start;
    if (date && s != null && conflictFor(date, s, dur, t.id)) s = freeSlot(date, dur, s, t.id);
    t.date = date || null;
    t.start = (date && s != null) ? fromMin(s) : null;
    if (date && t.due && t.due < date) t.due = date;
    if (prev && date !== prev) {
      if (!date) t.moves.push({ on: today(), from: prev, to: 'none' });
      else if (date > prev) t.moves.push({ on: today(), from: prev, to: date });
    }
  });
}

function toggleDone(id, d) {
  const t = taskOf(id); if (!t) return false;
  if (isRec(t)) {
    t.doneDates = t.doneDates || {};
    if (t.doneDates[d]) { delete t.doneDates[d]; return false; }
    t.doneDates[d] = stamp(); return true;
  }
  t.done = !t.done; t.doneAt = t.done ? stamp() : null;
  return t.done;
}

/* ================= goals / exams / subjects / habits ================= */
function goalStats(g) {
  const ms = g.milestones || [];
  const tasks = D.tasks.filter(t => t.goalId === g.id && !isRec(t) && t.kind !== 'event');
  const total = ms.length + tasks.length;
  const done = ms.filter(m => m.done).length + tasks.filter(t => t.done).length;
  return { ms, tasks, total, done, pct: total ? Math.round(done / total * 100) : 0 };
}
const examPct = e => e.topics.length ? Math.round(e.topics.filter(t => t.done).length / e.topics.length * 100) : 0;
function subjStats(sid) {
  const tasks = D.tasks.filter(t => t.subjectId === sid && !isRec(t) && t.kind !== 'event');
  const done = tasks.filter(t => t.done).length;
  return { tasks, total: tasks.length, done, open: tasks.length - done, pct: tasks.length ? Math.round(done / tasks.length * 100) : 0 };
}
function streak(h) {
  let d = today(), n = 0;
  if (!h.log[d]) d = addDays(d, -1);
  while (h.log[d]) { n++; d = addDays(d, -1); }
  return n;
}
function daysSinceHabit(h) {
  for (let i = 0; i < 60; i++) if (h.log[addDays(today(), -i)]) return i;
  return 60;
}

/* deadlines: future things with a due date */
function deadlines(limit) {
  const td = today(), out = [];
  D.tasks.forEach(t => {
    if (isRec(t) || t.done || t.kind === 'event' || !t.due || t.due < td) return;
    out.push({ kind: 'task', id: t.id, title: t.title, date: t.due, prio: t.priority });
  });
  D.exams.forEach(e => { if (e.date >= td && diffDays(td, e.date) <= 45) out.push({ kind: 'exam', id: e.id, title: e.title, date: e.date }); });
  D.goals.forEach(g => { if (g.deadline && g.deadline >= td && diffDays(td, g.deadline) <= 30 && goalStats(g).pct < 100) out.push({ kind: 'goal', id: g.id, title: g.title, date: g.deadline }); });
  out.sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : (PR[a.prio || 'medium'] - PR[b.prio || 'medium']));
  return limit ? out.slice(0, limit) : out;
}

/* things that need a look */
function attention() {
  const td = today(), out = [];
  overdueList().slice(0, 4).forEach(i => out.push({
    kind: 'overdue', text: i.t.title, sub: 'Overdue · ' + relLabel(i.d), a: 'resched', id: i.id, d: i.d, label: 'Reschedule'
  }));
  D.tasks.forEach(t => {
    if (isRec(t) || t.done || t.kind === 'event') return;
    const n = (t.moves || []).filter(m => m.to === 'none' || m.to > m.from).length;
    if (n >= 2 && !(t.date && t.date < td)) out.push({ kind: 'postponed', text: t.title, sub: 'Postponed ' + n + ' times — try a smaller first step', a: 'edit', id: t.id, d: t.date || td, label: 'Open' });
  });
  D.tasks.forEach(t => {
    if (isRec(t) || t.done || t.kind === 'event' || t.priority !== 'high' || t.date) return;
    out.push({ kind: 'nodate', text: t.title, sub: 'High priority, but not scheduled', a: 'edit', id: t.id, d: td, label: 'Schedule' });
  });
  D.exams.forEach(e => {
    const n = diffDays(td, e.date);
    if (n >= 0 && n <= 14 && examPct(e) < 60) out.push({ kind: 'exam', text: e.title + ' ' + inLabel(n), sub: examPct(e) + '% prepared', a: 'nav', p: 'exams', label: 'Plan revision' });
  });
  D.goals.forEach(g => {
    if (!g.deadline) return;
    const n = diffDays(td, g.deadline), st = goalStats(g);
    if (n >= 0 && n <= 10 && st.pct < 50) out.push({ kind: 'goal', text: g.title, sub: 'Due ' + inLabel(n) + ' · ' + st.pct + '% done', a: 'nav', p: 'goals', label: 'Open goal' });
  });
  D.habits.forEach(h => {
    const n = daysSinceHabit(h);
    if (n >= 3 && n < 60) out.push({ kind: 'habit', text: h.name, sub: 'No check-in for ' + n + ' days', a: 'nav', p: 'habits', label: 'Open habits' });
  });
  return out;
}

/* ================= review ================= */
function weekStartOf(d) {
  const g = pd(d).getDay(), off = (g - D.settings.weekStart + 7) % 7;
  return addDays(d, -off);
}
function weekDays(d) { const s = weekStartOf(d); return Array.from({ length: 7 }, (_, i) => addDays(s, i)); }

function reviewData(anchor) {
  const days = weekDays(anchor), td = today();
  const planned = [];
  days.forEach(d => dayInst(d).forEach(i => { if (i.kind !== 'event') planned.push(i); }));
  const done = planned.filter(i => i.done);
  const studyMin = done.filter(i => i.kind === 'study').reduce((a, i) => a + i.dur, 0);
  const postponed = D.tasks.filter(t => (t.moves || []).some(m => days.includes(m.on) && (m.to === 'none' || m.to > m.from)));
  const perDay = days.map(() => 0);
  D.tasks.forEach(t => {
    if (t.kind === 'event') return;
    const stamps = isRec(t) ? Object.values(t.doneDates || {}) : (t.done && t.doneAt ? [t.doneAt] : []);
    stamps.forEach(s => { const i = days.indexOf(s.slice(0, 10)); if (i >= 0) perDay[i]++; });
  });
  const goalsMoved = D.goals.map(g => {
    let n = (g.milestones || []).filter(m => m.done && m.doneOn && days.includes(m.doneOn)).length;
    D.tasks.forEach(t => { if (t.goalId === g.id && !isRec(t) && t.done && t.doneAt && days.includes(t.doneAt.slice(0, 10))) n++; });
    return { g, n, pct: goalStats(g).pct };
  }).filter(x => x.n > 0);
  const upto = days.filter(d => d <= td);
  let habitDone = 0;
  D.habits.forEach(h => upto.forEach(d => { if (h.log[d]) habitDone++; }));
  return {
    days, planned, done, studyMin, postponed, perDay, goalsMoved, habitDone, habitPossible: D.habits.length * upto.length,
    pct: planned.length ? Math.round(done.length / planned.length * 100) : 0
  };
}

/* ================= smart planning ================= */
function stepsFor(f) {
  const subj = subjOf(f.subjectId);
  const title = (f.title || '').trim();
  const big = /project|assignment|report|lab\b/i.test(title) || (subj && /project|assignment/i.test(subj.name));
  if (big) return ['Read the brief and plan — 20 min', 'Do the main work — 60 min', 'Check it and submit — 20 min'];
  const topic = title.replace(/^(study|revise|revision|finish|complete|prepare|do|work on)\s+/i, '').trim() || (subj ? subj.name : 'the topic');
  return ['Revise ' + topic + ' theory — 45 min', 'Solve 10 problems — 45 min', 'Review mistakes — 20 min'];
}
function needsBreakdown(f, editing) {
  if (f.kind === 'event' || (f.subtasks && f.subtasks.length) || (f.title || '').trim().length < 3) return false;
  if ((f.duration || 0) >= 120) return true;
  if (editing) return false;
  const t = f.title.trim();
  const words = t.split(/\s+/).length;
  if (words <= 4 && /^(study|revise|revision|finish|complete|prepare|work on)\b/i.test(t)) return true;
  if (words <= 3 && /project|assignment|report/i.test(t)) return true;
  return D.subjects.some(s => s.name.toLowerCase() === t.toLowerCase()) && f.kind === 'study';
}

function planMyDay() {
  const td = today(), now = nowMin(), s = D.settings;
  const dayEnd = toMin(s.dayEnd);
  const cands = [];
  D.tasks.forEach(t => {
    if (isRec(t) || t.done || t.kind === 'event') return;
    const untimedToday = t.date === td && t.start == null;
    const unscheduled = !t.date;
    const overdue = (t.date && t.date < td) || (t.due && t.due < td);
    const dueSoon = !t.date && t.due && t.due <= addDays(td, 1);
    if (untimedToday || overdue || dueSoon || (unscheduled && t.priority === 'high')) cands.push(t);
  });
  cands.sort((a, b) => PR[a.priority] - PR[b.priority] || ((a.due || '9') < (b.due || '9') ? -1 : 1));
  const out = [];
  let from = Math.max(now + 5, toMin(s.dayStart)), total = 0;
  for (const t of cands) {
    if (out.length >= 4 || total >= 240) break;
    const dur = t.duration || s.defaultDuration;
    const slot = freeSlot(td, dur, from, t.id);
    if (slot == null || slot + dur > dayEnd) continue;
    out.push({ id: t.id, title: t.title, start: slot, dur });
    total += dur;
    from = slot + dur + 15; // leave a breather
    // reserve: temporarily treat as busy by nudging `from`; freeSlot re-reads real data, so nudge is enough
  }
  return out;
}

/* ================= natural-language quick add ================= */
const MONTH_RE = '(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
const WD_FULL = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
function to24(h, m, ap) {
  h = +h; m = +(m || 0);
  if (ap) { ap = ap[0].toLowerCase(); if (ap === 'p' && h < 12) h += 12; if (ap === 'a' && h === 12) h = 0; }
  return h * 60 + m;
}
function guessHour(h, m) { // no am/pm given: 1-6 → pm, 7-11 → am, 12 → noon
  h = +h; m = +(m || 0);
  if (h >= 1 && h <= 6) h += 12;
  return h * 60 + m;
}
function nextWd(wd, sameWeekOk) {
  let d = today(); if (!sameWeekOk) d = addDays(d, 1);
  while (wdOf(d) !== wd) d = addDays(d, 1);
  return d;
}
function matchSubject(text) {
  const toks = (text.toLowerCase().match(/[a-z]+/g) || []);
  const STOP = ['and', 'of', 'the', 'to', 'in', 'for', 'my'];
  let best = null, bestScore = 0;
  D.subjects.forEach(sb => {
    const words = (sb.name.toLowerCase().match(/[a-z]+/g) || []).filter(w => w.length >= 2 && !STOP.includes(w));
    let score = 0;
    toks.forEach(tk => {
      words.forEach(w => {
        if (tk === w || tk === w + 's') score += 2;
        else if (tk.length >= 4 && (w.startsWith(tk) || (tk.endsWith('s') && w.startsWith(tk.slice(0, -1))))) score += 1;
      });
    });
    if (/^c\s/i.test(sb.name) && /\bC\b/.test(text)) score += 2;
    if (score > bestScore) { best = sb; bestScore = score; }
  });
  return best;
}

function parseQuick(raw) {
  const out = { found: false };
  let s = ' ' + raw + ' ';
  const cut = re => { const m = s.match(re); if (m) s = s.replace(m[0], ' '); return m; };
  let m;
  if ((m = cut(/\s(?:high\s+priority|urgent|!high)(?=\s)/i))) out.priority = 'high';
  else if ((m = cut(/\s(?:low\s+priority|!low)(?=\s)/i))) out.priority = 'low';
  else if ((m = cut(/\s(?:medium\s+priority|!med(?:ium)?)(?=\s)/i))) out.priority = 'medium';

  /* time range */
  const T = '(\\d{1,2})(?::(\\d{2}))?\\s*(am|pm|a\\.m\\.|p\\.m\\.)?';
  const rng = s.match(new RegExp('\\s(from\\s+)?' + T + '\\s*(?:to|-|–|—|till|until)\\s*' + T + '(?=[\\s,.]|$)', 'i'));
  if (rng && (rng[1] || rng[4] || rng[7] || rng[3] || rng[6])) {
    const [, , h1, m1, a1, h2, m2, a2] = rng;
    let a, b;
    if (a1 || a2) {
      b = to24(h2, m2, a2 || a1);
      a = to24(h1, m1, a1 || a2);
      if (!a1 && a >= b) a -= 720;
      if (a < 0) a += 720;
    } else { a = guessHour(h1, m1); b = guessHour(h2, m2); if (b <= a) b = a + 60; }
    if (b > a && a >= 0 && b <= 1440 + 60) {
      out.start = a; out.duration = b - a; s = s.replace(rng[0], ' ');
    }
  }
  if (out.start == null) {
    let t = s.match(/\s(?:at|@)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?(?=[\s,.]|$)/i);
    if (t) out.start = t[3] ? to24(t[1], t[2], t[3]) : guessHour(t[1], t[2]);
    else if ((t = s.match(/\s(\d{1,2})(?::(\d{2}))?\s*(am|pm)(?=[\s,.]|$)/i))) out.start = to24(t[1], t[2], t[3]);
    else if ((t = s.match(/\s([01]?\d|2[0-3]):([0-5]\d)(?=[\s,.]|$)/))) out.start = to24(t[1], t[2]);
    if (t) s = s.replace(t[0], ' ');
  }
  if (out.duration == null) {
    let d = s.match(/\sfor\s+(\d+(?:\.\d+)?)\s*(hours?|hrs?|h|minutes?|mins?|m)(?=[\s,.]|$)/i)
      || s.match(/\s(\d+(?:\.\d+)?)\s*(hours?|hrs?|minutes?|mins?)(?=[\s,.]|$)/i);
    if (d) {
      const n = parseFloat(d[1]);
      out.duration = Math.round(/^h/i.test(d[2]) ? n * 60 : n);
      s = s.replace(d[0], ' ');
    }
  }
  if (out.duration != null && (out.duration < 5 || out.duration > 720)) delete out.duration;

  /* dates */
  const dateOut = (date, kw) => { if (kw && /due|by/i.test(kw)) out.due = date; else out.date = date; };
  let dm;
  if ((dm = cut(/\s(?:(due|by)\s+)?(today|tonight)(?=[\s,.]|$)/i))) dateOut(today(), dm[1]);
  else if ((dm = cut(/\s(?:(due|by)\s+)?(tomorrow|tmrw|tmr)(?=[\s,.]|$)/i))) dateOut(addDays(today(), 1), dm[1]);
  else if ((dm = cut(/\s(?:(due|by)\s+)?in\s+(\d{1,2})\s+days?(?=[\s,.]|$)/i))) dateOut(addDays(today(), +dm[2]), dm[1]);
  else if ((dm = cut(new RegExp('\\s(?:(due|by)\\s+)?(?:on\\s+)?(\\d{1,2})(?:st|nd|rd|th)?\\s+' + MONTH_RE + '(?=[\\s,.]|$)', 'i')))) {
    dateOut(monthDate(dm[3], dm[2]), dm[1]);
  } else if ((dm = cut(new RegExp('\\s(?:(due|by)\\s+)?(?:on\\s+)?' + MONTH_RE + '\\s+(\\d{1,2})(?:st|nd|rd|th)?(?=[\\s,.]|$)', 'i')))) {
    dateOut(monthDate(dm[2], dm[3]), dm[1]);
  } else if ((dm = cut(/\s(?:(due|by)\s+)?(?:(?:on|next|this)\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?=[\s,.]|$)/i))) {
    dateOut(nextWd(WD_FULL.indexOf(dm[2].toLowerCase()), false), dm[1]);
  } else if ((dm = cut(/\s(?:(due|by)\s+)?(?:on|next|this)\s+(mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)(?=[\s,.]|$)/i))) {
    const idx = WD_FULL.findIndex(w => w.startsWith(dm[2].toLowerCase().slice(0, 3)));
    dateOut(nextWd(idx, false), dm[1]);
  }

  /* subject, kind */
  const sb = matchSubject(s);
  if (sb) out.subjectId = sb.id;
  let title = s.replace(/\s+/g, ' ').trim();
  if (title !== raw.replace(/\s+/g, ' ').trim()) title = title.replace(/\s+(on|at|from|for|by|due|to|till|until)$/i, '').replace(/^(on|at|from)\s+/i, '').trim();
  if (/^(study|revise|revision|practice|solve|read|learn|review)\b/i.test(title)) out.kind = 'study';
  else if (/\b(lunch|break|dinner|breakfast|lecture|class|meeting|commute)\b/i.test(title)) out.kind = 'event';
  if (out.kind === 'study' && sb) {
    const rest = title.replace(/^study\s+/i, '');
    if (/^study\s+/i.test(title) && rest.toLowerCase() === sb.name.toLowerCase()) title = sb.name;
  }
  out.title = title;
  out.found = out.date != null || out.due != null || out.start != null || out.duration != null || !!out.subjectId || !!out.priority;
  out.timeFound = out.date != null || out.start != null;
  return out;
}
function monthDate(mon, day) {
  const mi = MONTHS.findIndex(m => m.toLowerCase().startsWith(mon.toLowerCase().slice(0, 3)));
  const now = new Date();
  let y = now.getFullYear();
  let d = new Date(y, mi, +day);
  if (ymd(d) < today()) d = new Date(y + 1, mi, +day);
  return ymd(d);
}
