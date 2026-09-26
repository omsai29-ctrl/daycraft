/* ================= shared view bits ================= */
const prioGlyph = p => `<span class="prio ${p}" title="${cap(p)} priority" role="img" aria-label="${cap(p)} priority"><i></i><i></i><i></i></span>`;
const subjColor = id => { const s = subjOf(id); return s ? s.color : null; };
const subjTag = id => { const s = subjOf(id); return s ? `<span class="st"><i class="dot" style="background:${s.color}"></i>${esc(s.name)}</span>` : ''; };
const chkBtn = (on, id, d, label) => {
  const pulse = U.pulse && U.pulse === id + '@' + (d || '') ? ' pulse' : '';
  return `<button class="chk ${on ? 'on' : ''}${pulse}" data-a="toggle" data-id="${id}" data-d="${d}" aria-pressed="${on}" aria-label="${on ? 'Mark not done: ' : 'Mark done: '}${esc(label)}">${ico('check')}</button>`;
};
const bar = (pct, cls = '') => `<div class="bar ${cls}" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div>`;
const pageHead = (title, sub, actions) => `<div class="page-head"><div><h1 class="page-title">${esc(title)}</h1>${sub ? `<p class="page-sub">${sub}</p>` : ''}</div><div class="chips">${actions || ''}</div></div>`;
const addBtn = (label, attrs = '') => `<button class="btn btn-primary" data-a="add" ${attrs}>${ico('plus')}${label}</button>`;
/* a div that behaves like a button for pointer *and* keyboard users */
const openable = (attrs, inner, label) => `<div class="tb" role="button" tabindex="0" ${attrs} aria-label="${esc(label)}">${inner}</div>`;

/* ---------------------------------------------------------------
   taskRow — one row, progressive disclosure.
   Shows at most: time/duration · subject · one status note.
   Everything else waits until the task is opened.
   --------------------------------------------------------------- */
function taskRow(i, o = {}) {
  const t = i.t, done = i.done, td = today();
  const late = !done && !isRec(t) && ((t.date && t.date < td) || (t.due && t.due < td));
  const meta = [];

  if (late) meta.push(`<span class="t-red">Overdue · ${esc(relLabel(i.d))}</span>`);
  else if (o.showDate && i.d) meta.push(`<span>${esc(relLabel(i.d))}</span>`);

  if (i.start != null) meta.push(`<span class="${done ? '' : 't-blue'} num">${fmtRange(i.start, i.end)}</span>`);
  else if (t.duration && !o.noDur && t.kind !== 'event' && !done) meta.push(`<span class="num">${fmtDur(t.duration)}</span>`);

  if (t.subjectId) meta.push(subjTag(t.subjectId));

  if (t.due && !done && !late) {
    const n = diffDays(td, t.due);
    if (n <= 7 || o.showDate) meta.push(`<span class="${n <= 1 ? 't-orange' : ''}">${dueLabel(t.due)}</span>`);
  }
  if (isRec(t)) meta.push(`<span class="st">${ico('repeat')}${esc(recurText(t))}</span>`);
  if (o.showGoal && t.goalId && goalOf(t.goalId)) meta.push(`<span class="st">${ico('goals')}${esc(goalOf(t.goalId).title)}</span>`);
  if (done && o.showDone) {
    const st = isRec(t) ? (t.doneDates || {})[i.d] : t.doneAt;
    if (st && st.length > 10) meta.push(`<span class="t-green">Done ${fmtT(toMin(st.slice(11)))}</span>`);
  }

  const subs = t.subtasks || [], sd = subs.filter(s => s.done).length, ek = i.key;
  if (subs.length) meta.push(`<button data-a="expand" data-k="${ek}" aria-expanded="${!!U.expanded[ek]}">${sd}/${subs.length} steps</button>`);

  const sublist = subs.length && U.expanded[ek]
    ? `<ul class="subs sublist">${subs.map(s => `<li class="${s.done ? 'done' : ''}"><button class="chk sm ${s.done ? 'on' : ''}" data-a="sub" data-id="${t.id}" data-sid="${s.id}" aria-label="Toggle step">${ico('check')}</button><span>${esc(s.text)}</span></li>`).join('')}</ul>`
    : '';

  const drag = o.reorder ? ` draggable="true" data-reorder="${t.id}"` : '';
  const body = `<div class="ttl">${esc(t.title)}</div><div class="tm">${meta.join('')}</div>${sublist}`;

  return `<li class="task p-${t.priority} ${done ? 'done' : ''} ${late ? 'over' : ''}"${drag}>
    ${t.kind === 'event' ? '<span style="width:20px;flex:none"></span>' : chkBtn(done, t.id, i.d, t.title)}
    ${openable(`data-a="edit" data-id="${t.id}" data-d="${i.d || ''}"`, body, 'Open ' + t.title)}
    <span class="pr">${done || t.kind === 'event' ? '' : prioGlyph(t.priority)}</span>
  </li>`;
}

function recurText(t) {
  const r = t.recur || {};
  if (r.type === 'daily') return 'Daily';
  if (r.type === 'weekly') return 'Weekly';
  if (r.type === 'custom') return (r.days || []).slice().sort().map(d => DAYS[d].slice(0, 3)).join(', ') || 'Custom';
  return '';
}

const emptyBox = (title, text, acts, tight) => `<div class="empty ${tight ? 'tight' : ''}"><h3>${title}</h3>${text ? `<p>${text}</p>` : ''}${acts ? `<div class="acts">${acts}</div>` : ''}</div>`;

/* deadline list, shared by Today / Subjects / Review */
function dlList(items, td) {
  return `<ul class="dl">${items.map(d => {
    const n = diffDays(td, d.date);
    const when = n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : relLabel(d.date);
    const cls = n <= 0 ? 'r' : n <= 2 ? 'o' : '';
    const kind = d.kind === 'exam' ? 'exam' : d.kind === 'goal' ? 'goal' : '';
    return `<li data-a="${d.kind === 'task' ? 'edit' : 'nav'}" data-id="${d.id}" data-d="" data-p="${d.kind === 'exam' ? 'exams' : 'goals'}" role="button" tabindex="0">
      <span class="ttl">${esc(d.title)}</span>
      ${kind ? `<span class="kind ${kind}">${kind === 'exam' ? 'Exam' : 'Goal'}</span>` : ''}
      <span class="when ${cls}">${when}</span></li>`;
  }).join('')}</ul>`;
}

/* ================= TODAY ================= */
function viewToday() {
  const td = today(), now = nowMin();
  const items = dayInst(td);
  const timed = items.filter(i => i.start != null).sort((a, b) => a.start - b.start);
  const checks = items.filter(i => i.kind !== 'event');
  const doneN = checks.filter(i => i.done).length, total = checks.length;
  const pct = total ? Math.round(doneN / total * 100) : 0;
  const overdue = overdueList();
  const active = timed.filter(i => !i.done && i.start <= now && now < i.end);
  const cur = active.find(i => i.kind !== 'event') || active[0] || null;
  const next = timed.find(i => !i.done && i.start > now && (!cur || i.key !== cur.key)) || null;
  const openToday = checks.filter(i => !i.done);

  /* ---- header: date, live clock, progress ---- */
  const dd = pd(td);
  const head = `<header class="t-head">
    <div>
      <div class="t-eyebrow">${DAYS[wdOf(td)]}</div>
      <h1 class="t-date">${MONTHS[dd.getMonth()]} ${dd.getDate()}</h1>
      <div class="t-time"><span id="clock">${fmtT(now)}</span></div>
    </div>
    <div class="t-prog">
      <div class="txt"><span>Today's progress</span><b class="num">${doneN}<span class="muted"> / ${total}</span></b></div>
      ${bar(pct, 'green')}
    </div>
  </header>`;

  /* ---- notices ---- */
  let notice = '';
  if (D.sample) notice += `<div class="notice"><span class="grow">This is sample data, so you can see how everything fits together. Clear it when you're ready for your own.</span><button class="btn btn-sm" data-a="clear-sample">Start fresh</button></div>`;
  if (!storageOK) notice += `<div class="notice warn"><span class="grow">This browser isn't saving changes. Use Settings → Export backup to keep your data.</span></div>`;

  /* ---- carry-over banners ---- */
  let cards = '';
  if (overdue.length) {
    cards += `<div class="wrap-card red"><div class="grow"><b>${overdue.length} overdue ${overdue.length === 1 ? 'task' : 'tasks'}</b><div class="sub">${esc(overdue.slice(0, 2).map(i => i.t.title).join(', '))}${overdue.length > 2 ? ' and more' : ''}</div></div>
      <div class="acts"><button class="btn btn-sm" data-a="carry" data-scope="overdue" data-to="today">Move to today</button><button class="btn btn-sm" data-a="carry" data-scope="overdue" data-to="pick">Pick a date</button><button class="btn btn-sm btn-quiet" data-a="carry" data-scope="overdue" data-to="none">Unschedule</button></div></div>`;
  }
  const eod = now >= toMin(D.settings.dayEnd) - 60;
  if (openToday.length && (eod || U.wrap)) {
    cards += `<div class="wrap-card orange"><div class="grow"><b>${openToday.length} unfinished ${openToday.length === 1 ? 'task' : 'tasks'}</b><div class="sub">Move them now so tomorrow doesn't start behind.</div></div>
      <div class="acts"><button class="btn btn-sm" data-a="carry" data-scope="today" data-to="tomorrow">Move to tomorrow</button><button class="btn btn-sm" data-a="carry" data-scope="today" data-to="pick">Pick a date</button><button class="btn btn-sm btn-quiet" data-a="carry" data-scope="today" data-to="none">Unschedule</button>${!eod ? `<button class="icon-btn" data-a="wrap-off" aria-label="Dismiss">${ico('x')}</button>` : ''}</div></div>`;
  }

  /* ---- NOW ---- */
  let nowHtml;
  if (cur) {
    const elapsed = Math.min(100, Math.max(0, Math.round((now - cur.start) / cur.dur * 100)));
    const left = cur.end - now;
    const subs = cur.t.subtasks || [];
    nowHtml = `<section class="now" aria-label="Happening now">
      <div class="now-top"><span class="pill pill-blue">Now</span><span class="now-left">${minsLabel(left)} left</span></div>
      <h2 class="now-title">${esc(cur.t.title)}</h2>
      <div class="now-meta"><span class="num">${fmtRange(cur.start, cur.end)}</span>${cur.t.subjectId ? subjTag(cur.t.subjectId) : ''}${cur.kind === 'event' ? '<span>Scheduled event</span>' : ''}</div>
      ${bar(elapsed)}
      ${subs.length ? `<ul class="subs">${subs.map(s => `<li class="${s.done ? 'done' : ''}"><button class="chk sm ${s.done ? 'on' : ''}" data-a="sub" data-id="${cur.id}" data-sid="${s.id}" aria-label="Toggle step">${ico('check')}</button><span>${esc(s.text)}</span></li>`).join('')}</ul>` : ''}
      <div class="now-actions">${cur.kind !== 'event'
        ? `<button class="btn btn-primary" data-a="toggle" data-id="${cur.id}" data-d="${cur.d}">${ico('check')}Mark done</button><button class="btn" data-a="resched" data-id="${cur.id}" data-d="${cur.d}">Reschedule</button>`
        : `<button class="btn" data-a="edit" data-id="${cur.id}" data-d="${cur.d}">Edit</button>`}</div>
    </section>`;
  } else {
    let msg, sub = '', acts = '';
    if (total && openToday.length === 0) { msg = 'All done for today.'; sub = 'Everything on today\'s list is finished.'; }
    else if (!items.length && !overdue.length) { msg = ''; }
    else {
      msg = 'Nothing scheduled right now';
      sub = next ? `Free until ${fmtT(next.start)}.` : 'Nothing else is scheduled today.';
      const upFirst = openToday.filter(i => i.start == null).sort((a, b) => PR[a.t.priority] - PR[b.t.priority])[0];
      if (upFirst) acts = `<p class="now-hint">Good time for <b>${esc(upFirst.t.title)}</b></p><div class="now-actions"><button class="btn" data-a="edit" data-id="${upFirst.id}" data-d="${upFirst.d}">Open it</button><button class="btn btn-quiet" data-a="plan-day">${ico('sparkle')}Plan my day</button></div>`;
      else if (openToday.length === 0 && !next) acts = `<div class="now-actions"><button class="btn" data-a="plan-day">${ico('sparkle')}Plan my day</button><button class="btn btn-quiet" data-a="add">${ico('plus')}Add a task</button></div>`;
    }
    nowHtml = msg ? `<section class="now now-idle" aria-label="Happening now"><div class="now-top"><span class="pill">Now</span></div><h2 class="now-title">${msg}</h2>${sub ? `<p>${sub}</p>` : ''}${acts}</section>` : '';
  }

  /* ---- NEXT ---- */
  let nextHtml = '';
  if (next) {
    nextHtml = `<section class="next" aria-label="Up next" data-a="edit" data-id="${next.id}" data-d="${next.d}" role="button" tabindex="0"><span class="pill pill-orange">Next</span>
      <div class="grow"><div class="nt">${esc(next.t.title)}</div><div class="nm num">${fmtRange(next.start, next.end)} · in ${minsLabel(next.start - now)}</div></div>
      ${ico('right')}</section>`;
  } else if (cur || nowHtml) {
    const tm = dayInst(addDays(td, 1)).filter(i => i.start != null && i.kind !== 'event').sort((a, b) => a.start - b.start)[0];
    if (tm && !openToday.length) nextHtml = `<section class="next"><span class="pill pill-orange">Next</span><div class="grow"><div class="nt">${esc(tm.t.title)}</div><div class="nm">Tomorrow, ${fmtT(tm.start)}</div></div></section>`;
  }

  /* ---- today's tasks ---- */
  const openList = items.filter(i => i.kind !== 'event' && !i.done).sort(byTime);
  const timedOpen = openList.filter(i => i.start != null);
  const untimed = openList.filter(i => i.start == null).sort((a, b) => (a.t.order || 0) - (b.t.order || 0) || PR[a.t.priority] - PR[b.t.priority]);
  const doneList = checks.filter(i => i.done).sort((a, b) => (a.start || 0) - (b.start || 0));

  let tasksHtml = '';
  if (!checks.length && !overdue.length) {
    tasksHtml = emptyBox('Your day is clear.', 'Nothing is planned for today yet.',
      `<button class="btn btn-primary" data-a="plan-day">${ico('sparkle')}Plan my day</button><button class="btn" data-a="add">${ico('plus')}Add a task</button>`);
  } else {
    const secs = [];
    if (overdue.length) secs.push(`<div class="sub-h">Overdue <span class="n">${overdue.length}</span></div><ul class="tlist">${overdue.map(i => taskRow(i)).join('')}</ul>`);
    if (timedOpen.length) secs.push(`${overdue.length ? '<div class="sub-h">Scheduled</div>' : ''}<ul class="tlist">${timedOpen.map(i => taskRow(i)).join('')}</ul>`);
    if (untimed.length) secs.push(`<div class="sub-h">Anytime today <span class="n">${untimed.length}</span></div><ul class="tlist">${untimed.map(i => taskRow(i, { reorder: true })).join('')}</ul>`);
    if (!secs.length) secs.push(`<div class="empty tight"><h3>Nothing left to do today.</h3><p>Every task on today's list is done.</p></div>`);
    if (doneList.length) secs.push(`<div class="sub-h">Completed <span class="n">${doneList.length}</span></div><ul class="tlist">${doneList.map(i => taskRow(i, { showDone: true })).join('')}</ul>`);
    tasksHtml = secs.join('');
  }

  const canPlan = planMyDay().length > 0;
  const wrapLink = [
    canPlan ? `<button class="link" data-a="plan-day">Plan my day</button>` : '',
    openToday.length && !(eod || U.wrap) ? `<button class="link" data-a="wrap">Wrap up</button>` : ''
  ].filter(Boolean).join(' &nbsp; ');

  /* ---- schedule timeline ---- */
  const tl = timed.length ? `<ol class="tl">${timed.map(i => {
    const isNow = cur && cur.key === i.key, past = i.end <= now && !i.done;
    const cls = [i.kind === 'event' ? 'ev' : '', i.done ? 'done' : '', past ? 'past' : '', isNow ? 'now' : ''].join(' ');
    const sb = subjOf(i.t.subjectId);
    const sbName = sb && sb.name.toLowerCase() !== i.t.title.toLowerCase() ? ' · ' + esc(sb.name) : '';
    return `<li class="${cls}" data-a="edit" data-id="${i.id}" data-d="${i.d}" role="button" tabindex="0"><span class="tt num">${fmtT(i.start)}</span><span class="mk"><i></i></span><div><div class="ttl">${esc(i.t.title)}</div><div class="sm">${fmtDur(i.dur)}${sbName}</div></div></li>`;
  }).join('')}</ol>` : `<p class="muted" style="font-size:14px">Nothing has a time yet. Give a task a start time and it appears here.</p>`;

  /* ---- deadlines ---- */
  const dls = deadlines(6);
  const dlHtml = dls.length ? dlList(dls, td) : `<p class="muted" style="font-size:14px">No deadlines coming up.</p>`;

  /* ---- needs attention ---- */
  const att = attention().filter(a => a.kind !== 'overdue').slice(0, 3);
  const remHtml = att.length ? `<section><h2 class="h2">Needs attention</h2><ul class="rem">${att.map(a => `<li class="k-${a.kind}">${ico('alert')}<div class="grow"><div>${esc(a.text)}</div><div class="rs">${esc(a.sub)}</div></div><button class="btn btn-sm btn-quiet" data-a="${a.a}" data-id="${a.id || ''}" data-d="${a.d || ''}" data-p="${a.p || ''}">${a.label}</button></li>`).join('')}</ul></section>` : '';

  /* ---- habits ---- */
  const hab = D.habits.length ? `<section><h2 class="h2">Habits<button class="link aux" data-a="nav" data-p="habits">Open</button></h2><div class="hab-mini">${D.habits.map(h => `<button class="${h.log[td] ? 'on' : ''}" data-a="habit" data-id="${h.id}" data-d="${td}" aria-pressed="${!!h.log[td]}"><span class="chk sm ${h.log[td] ? 'on' : ''}">${ico('check')}</span>${esc(h.name)}</button>`).join('')}</div></section>` : '';

  return `${notice}${head}${cards}
  <div class="dash-actions"><button class="btn" data-a="nav" data-p="plans">${ico('check')}Plans<span class="dash-plan-count">${D.plans.filter(p=>!p.done).length || ''} </span></button></div>
  <div class="grid-2">
    <div class="col-stack">
      <div>${nowHtml}${nextHtml}</div>
      <section><h2 class="h2">Today's tasks ${wrapLink ? `<span class="aux">${wrapLink}</span>` : ''}</h2>${tasksHtml}</section>
    </div>
    <div class="col-stack">
      <section><h2 class="h2">Schedule</h2>${tl}</section>
      <section><h2 class="h2">Upcoming<button class="link aux" data-a="tf" data-s="upcoming">See all</button></h2>${dlHtml}</section>
      ${remHtml}
      ${hab}
    </div>
  </div>`;
}
