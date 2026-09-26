/* ================= SUBJECTS ================= */
function viewSubjects() {
  if (U.subj && subjOf(U.subj)) return viewSubjectDetail(subjOf(U.subj));
  U.subj = null;
  const td = today();
  const rows = D.subjects.map(s => {
    const st = subjStats(s.id);
    const nx = D.tasks.filter(t => t.subjectId === s.id && !isRec(t) && !t.done && t.due && t.due >= td).sort((a, b) => a.due < b.due ? -1 : 1)[0];
    const bits = [st.open + ' open'];
    if (st.done) bits.push(st.done + ' done');
    if (nx) bits.push('Next: ' + nx.title + ', ' + relLabel(nx.due).toLowerCase());
    return `<li class="row" data-a="subj-open" data-id="${s.id}" role="button" tabindex="0">
      <i class="dot" style="background:${s.color};width:10px;height:10px"></i>
      <div class="grow"><div class="r-t">${esc(s.name)}</div><div class="r-m">${esc(bits.join(' · '))}</div></div>
      <div class="r-side">${bar(st.pct, 'green')}<div class="mini"><span>Progress</span><span class="num">${st.pct}%</span></div></div></li>`;
  }).join('');
  return pageHead('Subjects', 'Every area of your college life, with its own progress.', `<button class="btn btn-primary" data-a="subj-new">${ico('plus')}New subject</button>`) +
    (rows ? `<ul class="rows">${rows}</ul>` : emptyBox('No subjects yet.', 'Create one for each class or area of your life.', `<button class="btn btn-primary" data-a="subj-new">${ico('plus')}New subject</button>`));
}

function viewSubjectDetail(s) {
  const td = today(), st = subjStats(s.id);
  const all = D.tasks.filter(t => t.subjectId === s.id && t.kind !== 'event');
  const open = all.filter(t => isRec(t) || !t.done).map(t => inst(t, t.date || '')).sort((a, b) => (a.d || '9') < (b.d || '9') ? -1 : 1);
  const done = all.filter(t => !isRec(t) && t.done).map(t => inst(t, t.date || ''));
  const dls = deadlines().filter(d => (d.kind === 'task' && taskOf(d.id) && taskOf(d.id).subjectId === s.id) || (d.kind === 'exam' && (D.exams.find(e => e.id === d.id) || {}).subjectId === s.id));
  const goals = D.goals.filter(g => g.subjectId === s.id);
  return `<button class="btn btn-sm btn-quiet" data-a="subj-back" style="margin:0 0 14px -10px">${ico('left')}All subjects</button>
  ${pageHead(s.name, `${st.open} open · ${st.done} done`, `<button class="btn" data-a="subj-edit" data-id="${s.id}">Edit</button>${addBtn('Add task', `data-subject="${s.id}"`)}`)}
  <div style="max-width:380px;margin:-14px 0 36px"><div style="display:flex;align-items:center;gap:12px">${bar(st.pct, 'green')}<span class="gs num">${st.pct}%</span></div></div>
  <div class="grid-2"><div class="col-stack">
    <section><h2 class="h2">Tasks</h2>${open.length ? `<ul class="tlist">${open.map(i => taskRow(i, { showDate: true })).join('')}</ul>` : emptyBox('No open tasks.', '', `<button class="btn btn-sm" data-a="add" data-subject="${s.id}">${ico('plus')}Add a task</button>`, true)}</section>
    ${done.length ? `<section><h2 class="h2">Completed</h2><ul class="tlist">${done.map(i => taskRow(i, { showDone: true })).join('')}</ul></section>` : ''}
  </div><div class="col-stack">
    <section><h2 class="h2">Upcoming deadlines</h2>${dls.length ? dlList(dls, td) : '<p class="muted" style="font-size:14px">No deadlines.</p>'}</section>
    ${goals.length ? `<section><h2 class="h2">Goals</h2><ul class="rows">${goals.map(g => { const gs = goalStats(g); return `<li class="row" data-a="nav" data-p="goals" role="button" tabindex="0"><div class="grow"><div class="r-t">${esc(g.title)}</div></div><div class="r-side">${bar(gs.pct, 'purple')}<div class="mini"><span>Progress</span><span class="num">${gs.pct}%</span></div></div></li>`; }).join('')}</ul></section>` : ''}
  </div></div>`;
}

/* ================= GOALS ================= */
function viewGoals() {
  const td = today();
  const cards = D.goals.map(g => {
    const st = goalStats(g);
    const dl = g.deadline ? diffDays(td, g.deadline) : null;
    const dlTxt = g.deadline ? (dl < 0 ? `Was due ${fmtShort(g.deadline)}` : `Due ${fmtShort(g.deadline)} · ${inLabel(dl)}`) : 'No deadline';
    const soon = dl != null && dl >= 0 && dl <= 5 && st.pct < 100;
    const sb = subjOf(g.subjectId);
    return `<section class="goal">
      <div class="goal-h">
        <div class="goal-t">${esc(g.title)}</div>
        ${sb ? `<span class="st muted" style="display:inline-flex;gap:6px;align-items:center;font-size:12.5px"><i class="dot" style="background:${sb.color}"></i>${esc(sb.name)}</span>` : ''}
        <span class="goal-dl ${soon ? 'soon' : ''}">${dlTxt}</span>
        <button class="btn btn-sm btn-quiet" data-a="goal-edit" data-id="${g.id}">Edit</button>
      </div>
      <div class="goal-meter">${bar(st.pct, 'purple')}<span class="gs"><b>${st.done}</b> of ${st.total} · ${st.pct}%</span></div>
      <div class="goal-b">
        <div><h4>Milestones</h4>
          <ul class="ck-list">${(g.milestones || []).map(m => `<li class="${m.done ? 'done' : ''}"><button class="chk sm ${m.done ? 'on' : ''}" data-a="ms" data-id="${g.id}" data-mid="${m.id}" aria-label="Toggle milestone">${ico('check')}</button><span class="grow">${esc(m.text)}</span><button class="icon-btn x" style="width:24px;height:24px" data-a="ms-del" data-id="${g.id}" data-mid="${m.id}" aria-label="Remove milestone">${ico('x')}</button></li>`).join('') || '<li class="muted">No milestones yet.</li>'}</ul>
          <div class="add-inline"><input class="input" id="ms-${g.id}" data-enter="ms-add" data-id="${g.id}" placeholder="Add a milestone" aria-label="New milestone"><button class="btn btn-sm" data-a="ms-add" data-id="${g.id}">Add</button></div></div>
        <div><h4>Related tasks</h4>
          ${st.tasks.length ? `<ul class="ck-list">${st.tasks.slice().sort((a, b) => (a.done - b.done)).map(t => `<li class="${t.done ? 'done' : ''}"><button class="chk sm ${t.done ? 'on' : ''}" data-a="toggle" data-id="${t.id}" data-d="${t.date || ''}" aria-label="Toggle task">${ico('check')}</button><span class="grow" style="cursor:pointer" data-a="edit" data-id="${t.id}" data-d="${t.date || ''}" role="button" tabindex="0">${esc(t.title)}</span></li>`).join('')}</ul>` : '<p class="muted" style="font-size:13.5px">Tasks you link to this goal show up here.</p>'}
          <div style="margin-top:12px"><button class="btn btn-sm" data-a="add" data-goal="${g.id}" data-subject="${g.subjectId || ''}">${ico('plus')}Add task for this goal</button></div></div>
      </div></section>`;
  }).join('');
  return pageHead('Goals', 'Bigger things you\'re working toward. Tasks you link to a goal move its progress.', `<button class="btn btn-primary" data-a="goal-new">${ico('plus')}New goal</button>`) +
    (cards || emptyBox('No goals yet.', 'Try “Finish the C programming unit” or “Finish the project by October 10”.', `<button class="btn btn-primary" data-a="goal-new">${ico('plus')}New goal</button>`));
}

/* ================= HABITS ================= */
function viewHabits() {
  const td = today();
  const seg = `<div class="seg"><button class="${U.hv === 'week' ? 'on' : ''}" data-a="hab-view" data-v="week">Week</button><button class="${U.hv === 'month' ? 'on' : ''}" data-a="hab-view" data-v="month">Month</button></div>`;
  const acts = seg + `<button class="btn btn-primary" data-a="habit-new">${ico('plus')}New habit</button>`;
  if (!D.habits.length) return pageHead('Habits', 'Small things you do regularly.', acts) + emptyBox('No habits yet.', 'Start with one or two: study, exercise, read.', `<button class="btn btn-primary" data-a="habit-new">${ico('plus')}New habit</button>`);

  if (U.hv === 'month') {
    const sel = D.habits.find(h => h.id === U.hSel) || D.habits[0]; U.hSel = sel.id;
    const ym = U.hMonth || td.slice(0, 7) + '-01';
    const first = pd(ym), month = first.getMonth();
    const lead = (first.getDay() + 6) % 7;
    const dim = new Date(first.getFullYear(), month + 1, 0).getDate();
    let cells = DAYS.map(d => `<div class="dw">${d.slice(0, 1)}</div>`).join('') + '<div class="blank"></div>'.repeat(lead);
    for (let k = 1; k <= dim; k++) {
      const d = ymd(new Date(first.getFullYear(), month, k));
      cells += `<button class="hb ${sel.log[d] ? 'on' : ''} ${d > td ? 'fut' : ''}" data-a="habit" data-id="${sel.id}" data-d="${d}" aria-pressed="${!!sel.log[d]}" aria-label="${fmtLong(d)}">${k}</button>`;
    }
    const cnt = Object.keys(sel.log).filter(d => d.startsWith(ym.slice(0, 7))).length;
    const sk = streak(sel);
    return pageHead('Habits', 'Tap a day to check it off.', acts) +
      `<div class="chips" style="margin-bottom:20px">${D.habits.map(h => `<button class="chip ${h.id === sel.id ? 'on' : ''}" data-a="hab-sel" data-id="${h.id}">${esc(h.name)}</button>`).join('')}</div>
      <div class="pl-nav" style="margin-bottom:14px"><button class="icon-btn" data-a="hab-month" data-n="-1" aria-label="Previous month">${ico('left')}</button><strong style="min-width:150px;text-align:center;font-weight:600">${MONTHS[month]} ${first.getFullYear()}</strong><button class="icon-btn" data-a="hab-month" data-n="1" aria-label="Next month">${ico('right')}</button></div>
      <div class="hab-cal">${cells}</div>
      <p style="margin-top:16px" class="streak"><span class="num">${cnt}</span> check-ins this month${sk > 1 ? ` · ${ico('flame')}<span class="num">${sk}</span>-day streak` : ''}</p>`;
  }

  const days = weekDays(td);
  const head = `<tr><th></th>${days.map(d => `<th class="${d === td ? 'tdy' : ''}">${DAYS[wdOf(d)].slice(0, 3)}<b>${pd(d).getDate()}</b></th>`).join('')}</tr>`;
  const rows = D.habits.map(h => {
    const n = days.filter(d => h.log[d]).length, sk = streak(h);
    return `<tr><td><div class="hn">${esc(h.name)}</div><div class="hs">${n}/7 this week${sk > 1 ? ' · ' + sk + '-day streak' : ''}</div></td>${days.map(d => `<td><button class="hb ${h.log[d] ? 'on' : ''} ${d > td ? 'fut' : ''}" data-a="habit" data-id="${h.id}" data-d="${d}" aria-pressed="${!!h.log[d]}" aria-label="${esc(h.name)}, ${fmtLong(d)}">${ico('check')}</button></td>`).join('')}</tr>`;
  }).join('');
  return pageHead('Habits', 'Tap a circle to check a day off. You can fill in earlier days too.', acts) +
    `<table class="hab-table"><thead>${head}</thead><tbody>${rows}</tbody></table>
     <p style="margin-top:20px"><button class="link" data-a="habit-manage">Edit or remove habits</button></p>`;
}

/* ================= EXAMS ================= */
function viewExams() {
  const td = today();
  const list = D.exams.slice().sort((a, b) => a.date < b.date ? -1 : 1);
  const html = list.map(e => {
    const pct = examPct(e), n = diffDays(td, e.date), sb = subjOf(e.subjectId);
    const sessions = D.tasks.filter(t => t.examId === e.id).sort((a, b) => (a.date || '9') < (b.date || '9') ? -1 : 1);
    const soon = n >= 0 && n <= 7;
    return `<section class="exam ${soon ? 'soon' : ''}" ${sb ? `style="--bc:${sb.color}"` : ''}>
      <div class="exam-h"><h2 class="exam-t">${esc(e.title)}</h2>
        ${sb ? `<span class="exam-d st" style="display:inline-flex;gap:6px;align-items:center"><i class="dot" style="background:${sb.color}"></i>${esc(sb.name)}</span>` : ''}
        <span class="exam-when ${soon ? 'pill pill-red' : 'muted'}">${fmtShort(e.date)} · ${n < 0 ? 'passed' : inLabel(n)}</span>
        <button class="btn btn-sm btn-quiet" data-a="exam-edit" data-id="${e.id}">Edit</button></div>
      <div class="prep">${bar(pct, pct >= 100 ? 'green' : '')}<b class="num">${pct}%</b></div>
      <div class="prep-l">Prepared${e.topics.length ? ` · ${e.topics.filter(t => t.done).length} of ${e.topics.length} topics covered` : ''}</div>
      <h4>Topics</h4>
      <div class="topics">${e.topics.map(t => `<button class="tp ${t.done ? 'done' : ''}" data-a="topic" data-id="${e.id}" data-tid="${t.id}" aria-pressed="${t.done}"><span class="chk sm ${t.done ? 'on' : ''}">${ico('check')}</span>${esc(t.text)}</button>`).join('') || '<span class="muted" style="font-size:13.5px">No topics yet.</span>'}</div>
      <div class="add-inline" style="max-width:340px"><input class="input" id="tp-${e.id}" data-enter="topic-add" data-id="${e.id}" placeholder="Add a topic" aria-label="New topic"><button class="btn btn-sm" data-a="topic-add" data-id="${e.id}">Add</button></div>
      <h4>Revision and practice</h4>
      ${sessions.length ? `<ul class="tlist">${sessions.map(t => taskRow(inst(t, t.date || ''), { showDate: true })).join('')}</ul>` : '<p class="muted" style="font-size:13.5px">No sessions planned yet.</p>'}
      <div class="chips" style="margin-top:14px"><button class="btn btn-sm" data-a="exam-session" data-id="${e.id}" data-t="Revise">${ico('plus')}Revision session</button><button class="btn btn-sm" data-a="exam-session" data-id="${e.id}" data-t="Practice">${ico('plus')}Practice session</button></div>
    </section>`;
  }).join('');
  return pageHead('Exams', 'Plan what to cover and when.', `<button class="btn btn-primary" data-a="exam-new">${ico('plus')}New exam</button>`) +
    (html || emptyBox('No exams planned.', 'Add an exam to track topics and schedule revision.', `<button class="btn btn-primary" data-a="exam-new">${ico('plus')}Add an exam</button>`));
}

/* ================= REVIEW ================= */
function viewReview() {
  const r = reviewData(U.rv), td = today(), isThis = r.days.includes(td);
  const label = fmtShort(r.days[0]) + ' – ' + fmtShort(r.days[6]);
  const nav = `<div class="pl-nav"><button class="icon-btn" data-a="rv" data-n="-7" aria-label="Previous week">${ico('left')}</button><strong style="min-width:140px;text-align:center;font-weight:600;font-size:14px">${isThis ? 'This week' : label}</strong><button class="icon-btn" data-a="rv" data-n="7" aria-label="Next week">${ico('right')}</button></div>`;
  const overdue = overdueList();
  const remaining = Math.max(0, r.planned.length - r.done.length);
  const stats = `<div class="stats">
    <div class="stat"><div class="v">${r.done.length}<span class="muted"> / ${r.planned.length}</span></div><div class="l">Completed</div></div>
    <div class="stat"><div class="v">${remaining}</div><div class="l">Still open</div></div>
    <div class="stat"><div class="v">${Math.floor(r.studyMin / 60)}<span class="muted">h</span> ${pad(r.studyMin % 60)}<span class="muted">m</span></div><div class="l">Study time</div></div>
    <div class="stat"><div class="v">${r.postponed.length}</div><div class="l">Postponed</div></div></div>`;
  const max = Math.max(1, ...r.perDay), best = r.perDay.indexOf(Math.max(...r.perDay));
  const chart = `<div class="days-bar">${r.days.map((d, i) => `<div class="c ${r.perDay[i] > 0 ? 'has' : ''} ${i === best && r.perDay[i] > 0 ? 'best' : ''}"><em>${r.perDay[i] || ''}</em><i style="height:${Math.max(3, r.perDay[i] / max * 74)}px"></i><span>${DAYS[wdOf(d)].slice(0, 3)}</span></div>`).join('')}</div>`;
  const bestTxt = r.perDay[best] > 0 ? `Your best day was ${DAYS[wdOf(r.days[best])]} with ${r.perDay[best]} ${r.perDay[best] === 1 ? 'task' : 'tasks'} done.` : 'Complete a few tasks and your strongest days show up here.';
  const att = attention().slice(0, 8);
  const attHtml = att.length
    ? `<ul class="rem">${att.map(a => `<li class="k-${a.kind}">${ico('alert')}<div class="grow"><div>${esc(a.text)}</div><div class="rs">${esc(a.sub)}</div></div><button class="btn btn-sm" data-a="${a.a}" data-id="${a.id || ''}" data-d="${a.d || ''}" data-p="${a.p || ''}">${a.label}</button></li>`).join('')}</ul>`
    : emptyBox('Nothing needs attention.', 'No overdue work, no stalled goals. Nice.', '', true);
  const up = deadlines().filter(d => diffDays(td, d.date) <= 14).slice(0, 6);
  return pageHead('Review', 'A quick look back, and what to look at next.', nav) + stats +
    `<div class="grid-2"><div class="col-stack">
      <section><h2 class="h2">Needs attention</h2>${attHtml}</section>
      <section><h2 class="h2">Most productive days</h2>${chart}<p class="muted" style="margin-top:14px;font-size:14px">${bestTxt}</p></section>
    </div><div class="col-stack">
      <section><h2 class="h2">This week</h2><ul class="kv">
        <li><span>Overdue right now</span><span class="num">${overdue.length}</span></li>
        <li><span>Habits completed</span><span class="num">${r.habitDone} of ${r.habitPossible}</span></li>
        <li><span>Goals progressed</span><span>${r.goalsMoved.length ? r.goalsMoved.map(x => esc(x.g.title) + ' (+' + x.n + ', ' + x.pct + '%)').join('<br>') : 'None yet'}</span></li></ul></section>
      <section><h2 class="h2">Upcoming deadlines</h2>${up.length ? dlList(up, td) : '<p class="muted" style="font-size:14px">Nothing due in the next two weeks.</p>'}</section>
    </div></div>`;
}

/* ================= SETTINGS ================= */
function viewSettings() {
  const s = D.settings;
  const sel = (key, opts, val) => `<select class="select" data-set="${key}">${opts.map(([v, l]) => `<option value="${v}" ${String(v) === String(val) ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
  const row = (l, hint, ctl) => `<div class="set-row"><div><div class="lbl">${l}</div>${hint ? `<div class="hint">${hint}</div>` : ''}</div>${ctl}</div>`;
  return pageHead('Settings', 'Make it fit your day.', '') +
    `<div class="set-sec"><h2 class="h2">Your day</h2>
      ${row('Start of day', 'Where the planner grid begins', `<input class="input" type="time" data-set="dayStart" value="${s.dayStart}">`)}
      ${row('End of day', 'When we suggest wrapping up', `<input class="input" type="time" data-set="dayEnd" value="${s.dayEnd}">`)}
      ${row('Default task length', '', sel('defaultDuration', [[15, '15 min'], [30, '30 min'], [45, '45 min'], [60, '1 hour'], [90, '1.5 hours'], [120, '2 hours']], s.defaultDuration))}</div>
    <div class="set-sec"><h2 class="h2">Planner</h2>
      ${row('Preferred view', '', sel('view', [['day', 'Day'], ['week', 'Week'], ['month', 'Month']], s.view))}
      ${row('Week starts on', '', sel('weekStart', [[1, 'Monday'], [0, 'Sunday'], [6, 'Saturday']], s.weekStart))}</div>
    <div class="set-sec"><h2 class="h2">Reminders</h2>
      ${row('Default reminder', 'Applies to timed tasks. Reminders show while this page is open.', sel('reminder', [['off', 'None'], [10, '10 min before'], [30, '30 min before'], [60, '1 hour before']], s.reminder))}
      ${row('Browser notifications', 'Task reminders can appear as system notifications while Daycraft is open.', `<button class="btn btn-sm" data-a="notify">${notificationState() === 'granted' ? 'Enabled · Test' : notificationState() === 'denied' ? 'Blocked' : notificationState() === 'unsupported' ? 'Unavailable' : 'Enable'}</button>`)}</div>
    <div class="set-sec"><h2 class="h2">Appearance</h2>
      ${row('Theme', '', `<div class="seg">${[['light', 'Light'], ['dark', 'Dark'], ['system', 'System']].map(([v, l]) => `<button class="${s.theme === v ? 'on' : ''}" data-a="theme" data-v="${v}">${l}</button>`).join('')}</div>`)}</div>
    <div class="set-sec"><h2 class="h2">Sync</h2>
      <p class="set-note" style="color:var(--ink-2);font-weight:550" data-sync>${syncLabel()}</p>
      ${AUTH.user ? `<p class="set-note">Signed in as <strong data-auth-user>${esc(AUTH.user.email || 'your account')}</strong>. Your planner syncs between devices when you use the same account.</p><div class="chips"><button class="btn btn-sm" data-a="sync-now">Sync now</button><button class="btn btn-sm" data-a="auth-signout">Sign out</button></div>` : `<p class="set-note">Sign in once on your phone and laptop to keep the same planner data everywhere. Local data remains available offline.</p><button class="btn btn-primary" data-a="auth-open">Sign in to sync</button>`}</div>
    <div class="set-sec"><h2 class="h2">Your data</h2>
      <p class="set-note">${storageOK ? 'Saved in this browser on this device. Export a backup now and then for safekeeping.' : 'This browser is not saving changes. Export a backup to keep your data.'}</p>
      <div class="chips"><button class="btn" data-a="export">Export backup</button><button class="btn" data-a="import">Import backup</button><input type="file" id="imp" accept="application/json,.json" class="sr" tabindex="-1">
      ${D.sample ? `<button class="btn" data-a="clear-sample">Clear sample data</button>` : ''}<button class="btn btn-danger" data-a="reset">Erase everything</button></div></div>`;
}
