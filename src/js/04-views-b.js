/* ================= PLANNER ================= */
const HH = 52;
let gridMeta = { gs: 0 };

function plannerTitle() {
  const d = U.pd;
  if (U.pv === 'day') return fmtLong(d);
  if (U.pv === 'month') return MONTHS[pd(d).getMonth()] + ' ' + pd(d).getFullYear();
  const days = weekDays(d), a = pd(days[0]), b = pd(days[6]);
  if (a.getMonth() === b.getMonth()) return MONTHS[a.getMonth()] + ' ' + a.getDate() + ' – ' + b.getDate();
  return fmtShort(days[0]) + ' – ' + fmtShort(days[6]);
}

function layoutDay(list) {
  const items = list.slice().sort((a, b) => a.start - b.start || b.end - a.end);
  const out = [];
  let cluster = [], clusterEnd = -1;
  const flush = () => {
    const lanes = [];
    cluster.forEach(it => {
      let l = lanes.findIndex(e => e <= it.start);
      if (l < 0) { l = lanes.length; lanes.push(0); }
      lanes[l] = it.end; it.lane = l;
    });
    cluster.forEach(it => { it.lanes = lanes.length; });
    out.push(...cluster); cluster = [];
  };
  items.forEach(it => {
    if (cluster.length && it.start >= clusterEnd) { flush(); clusterEnd = -1; }
    cluster.push(it); clusterEnd = Math.max(clusterEnd, it.end);
  });
  if (cluster.length) flush();
  return out;
}

function viewPlanner() {
  const v = U.pv, td = today();
  const isNow = v === 'month' ? U.pd.slice(0, 7) === td.slice(0, 7) : weekDays(U.pd).includes(td);
  const head = `<div class="pl-bar">
    <h1 class="pl-title">${esc(plannerTitle())}</h1>
    <div class="pl-nav">
      <button class="icon-btn" data-a="pl" data-n="-1" aria-label="Previous">${ico('left')}</button>
      <button class="icon-btn" data-a="pl" data-n="1" aria-label="Next">${ico('right')}</button>
    </div>
    ${isNow && v !== 'day' ? '' : `<button class="btn btn-sm" data-a="pl-today">Today</button>`}
    <span class="grow"></span>
    <div class="seg" role="tablist">${['day', 'week', 'month'].map(k => `<button class="${v === k ? 'on' : ''}" data-a="pl-view" data-v="${k}" role="tab" aria-selected="${v === k}">${cap(k)}</button>`).join('')}</div>
    ${addBtn('Add', `data-date="${U.pd}"`)}
  </div>`;
  if (v === 'month') return head + monthHtml();
  const days = v === 'day' ? [U.pd] : weekDays(U.pd);
  const strip = v === 'day'
    ? `<div class="day-strip">${weekDays(U.pd).map(d => `<button class="${d === U.pd ? 'on' : ''} ${d === td ? 'today' : ''}" data-a="pl-goto" data-d="${d}">${DAYS[wdOf(d)].slice(0, 3)}<b>${pd(d).getDate()}</b></button>`).join('')}</div>`
    : '';
  return head + strip + gridHtml(days);
}

function gridHtml(days) {
  const s = D.settings, td = today(), n = days.length;
  const ds = toMin(s.dayStart), de = toMin(s.dayEnd);
  let gs = Math.floor(ds / 60) * 60, ge = Math.ceil(de / 60) * 60;
  const per = days.map(d => dayInst(d));
  per.forEach(list => list.forEach(i => {
    if (i.start != null) { gs = Math.min(gs, Math.floor(i.start / 60) * 60); ge = Math.max(ge, Math.min(1440, Math.ceil(i.end / 60) * 60)); }
  }));
  gridMeta = { gs, ge };
  const H = (ge - gs) / 60 * HH, now = nowMin();
  const y = m => (m - gs) / 60 * HH;

  /* hour rail — every hour, quiet and tabular */
  const hours = [];
  for (let m = gs; m < ge; m += 60) {
    const lbl = fmtT(m).replace(':00', '').toLowerCase().replace(' ', '');
    hours.push(`<span class="hl ${m === gs ? 'first' : ''}" style="top:${y(m)}px">${lbl}</span>`);
  }

  /* day headers */
  const heads = days.map(d => {
    const wknd = wdOf(d) >= 5;
    return `<div class="dh ${d === td ? 'today' : ''} ${wknd && d !== td ? 'dim' : ''}" data-a="pl-goto" data-d="${d}" role="button" tabindex="0" aria-label="Open ${fmtLong(d)}">
      <div class="dw">${DAYS[wdOf(d)].slice(0, 3)}</div><div class="dn num">${pd(d).getDate()}</div></div>`;
  }).join('');

  /* untimed lane */
  const lanes = days.map((d, k) => {
    const un = per[k].filter(i => i.start == null && i.kind !== 'event').sort((a, b) => (a.t.order || 0) - (b.t.order || 0));
    return `<div class="lane" data-lane="${d}">${un.map(i => {
      const late = !i.done && d < td && !isRec(i.t);
      const c = subjColor(i.t.subjectId);
      return `<div class="lchip ${i.done ? 'done' : ''} ${late ? 'late' : ''}" ${c ? `style="--bc:${c}"` : ''} data-chip="${i.id}" data-d="${d}" data-a="edit" data-id="${i.id}"><button class="chk sm ${i.done ? 'on' : ''}" data-a="toggle" data-id="${i.id}" data-d="${d}" aria-label="Toggle ${esc(i.t.title)}">${ico('check')}</button><span class="tx">${esc(i.t.title)}</span></div>`;
    }).join('')}</div>`;
  }).join('');

  /* columns */
  const cols = days.map((d, k) => {
    const list = layoutDay(per[k].filter(i => i.start != null));
    const nextKey = d === td ? (per[k].filter(i => i.start != null && !i.done && i.start > now && i.kind !== 'event').sort((a, b) => a.start - b.start)[0] || {}).key : null;

    /* quiet shading outside the working day, so the useful hours read first */
    let off = '';
    if (ds > gs) off += `<div class="offh" style="top:0;height:${y(ds)}px"></div>`;
    if (de < ge) off += `<div class="offh" style="top:${y(de)}px;height:${H - y(de)}px"></div>`;

    const blocks = list.map(i => {
      const top = y(i.start), h = Math.max(20, i.dur / 60 * HH - 3);
      const late = !i.done && i.kind !== 'event' && !isRec(i.t) && d < td;
      const size = h < 30 ? 'xs' : h >= 62 ? 'lg' : '';
      const c = subjColor(i.t.subjectId);
      const cls = ['blk', size, i.kind === 'event' ? 'ev' : '', i.done ? 'done' : '', late ? 'late' : '', nextKey === i.key ? 'nx' : ''].join(' ');
      const style = `top:${top}px;height:${h}px;left:calc(${i.lane} / ${i.lanes} * 100% + 2px);width:calc(100% / ${i.lanes} - 4px)${c ? ';--bc:' + c : ''}`;
      return `<div class="${cls}" tabindex="0" data-blk="${i.id}" data-d="${d}" data-a="edit" data-id="${i.id}" style="${style}" aria-label="${esc(i.t.title)}, ${fmtRange(i.start, i.end)}">
        <div class="b-t">${esc(i.t.title)}</div>${size !== 'xs' ? `<div class="b-m num">${fmtRange(i.start, i.end)}</div>` : ''}<i class="rz" data-rz></i></div>`;
    }).join('');

    const nl = d === td && now >= gs && now <= ge ? `<div class="nowline" id="nowline" style="top:${y(now)}px"></div>` : '';
    return `<div class="col ${d === td ? 'today' : ''}" data-col="${d}" style="height:${H}px">${off}${blocks}${nl}</div>`;
  }).join('');

  return `<div class="wk ${n === 1 ? 'one' : ''}" style="--n:${n};--hh:${HH}px"><div class="wk-scroll" id="wkscroll" data-gs="${gs}"><div class="wk-in">
    <div class="wk-sticky"><div class="wk-row wk-head"><div class="gut"></div>${heads}</div>
    <div class="wk-row wk-lane"><div class="gut">To do</div>${lanes}</div></div>
    <div class="wk-row wk-body"><div class="gut" style="height:${H}px">${hours.join('')}</div>${cols}</div>
  </div></div></div>`;
}

/* ---------------------------------------------------------------
   Month — answers "what is happening this month?" and little else.
   Chips for the first few items, coloured flags for the rest.
   --------------------------------------------------------------- */
function monthHtml() {
  const first = U.pd.slice(0, 8) + '01', td = today();
  const start = weekStartOf(first), month = pd(U.pd).getMonth();
  const hdr = Array.from({ length: 7 }, (_, i) => `<div>${DAYS[wdOf(addDays(start, i))].slice(0, 3)}</div>`).join('');

  /* index exams & goal deadlines by date so cells can flag them */
  const examOn = {}, goalOn = {};
  D.exams.forEach(e => { examOn[e.date] = true; });
  D.goals.forEach(g => { if (g.deadline) goalOn[g.deadline] = true; });

  const cells = [];
  for (let k = 0; k < 42; k++) {
    const d = addDays(start, k);
    if (k >= 35 && pd(d).getMonth() !== month) break;
    const list = dayInst(d).sort(byTime);
    const shown = list.slice(0, 3), more = list.length - shown.length;
    const dueHere = D.tasks.some(t => !isRec(t) && !t.done && t.due === d && t.kind !== 'event');

    const flags = [
      examOn[d] ? '<i class="exam" title="Exam"></i>' : '',
      goalOn[d] ? '<i class="goal" title="Goal deadline"></i>' : '',
      dueHere ? '<i class="due" title="Something is due"></i>' : ''
    ].join('');

    cells.push(`<div class="mcell ${pd(d).getMonth() !== month ? 'out' : ''} ${d === td ? 'today' : ''}" data-mcell="${d}" data-a="add" data-date="${d}">
      <div class="mrow">
        <button class="mn" data-a="pl-goto" data-d="${d}" aria-label="Open ${fmtLong(d)}">${pd(d).getDate()}</button>
        ${flags ? `<span class="mflags">${flags}</span>` : ''}
      </div>
      ${shown.map(i => {
        const late = !i.done && i.kind !== 'event' && !isRec(i.t) && d < td;
        const c = subjColor(i.t.subjectId);
        const tm = i.start != null ? `<b>${fmtT(i.start).replace(':00', '').replace(' ', '').toLowerCase()}</b>` : '';
        return `<div class="mchip ${i.done ? 'done' : ''} ${late ? 'late' : ''}" ${c ? `style="--bc:${c}"` : ''} draggable="true" data-mchip="${i.id}" data-d="${d}" data-a="edit" data-id="${i.id}"><span class="tx">${tm}${esc(i.t.title)}</span></div>`;
      }).join('')}${more > 0 ? `<div class="mmore">+${more} more</div>` : ''}</div>`);
  }
  return `<div class="month"><div class="month-h">${hdr}</div><div class="month-g">${cells.join('')}</div></div>`;
}

/* ================= TASKS ================= */
const SORTS = [['smart', 'Smart order'], ['priority', 'Priority'], ['due', 'Due date'], ['title', 'Name']];

function matchesQuery(t) {
  const q = (U.tf.q || '').trim().toLowerCase();
  if (!q) return true;
  if ((t.title || '').toLowerCase().includes(q)) return true;
  if ((t.notes || '').toLowerCase().includes(q)) return true;
  if ((t.subtasks || []).some(s => (s.text || '').toLowerCase().includes(q))) return true;
  const sb = subjOf(t.subjectId);
  if (sb && sb.name.toLowerCase().includes(q)) return true;
  const g = goalOf(t.goalId);
  if (g && g.title.toLowerCase().includes(q)) return true;
  return false;
}

function sortInst(list) {
  const mode = U.tf.sort || 'smart';
  if (mode === 'smart') return list;
  const l = list.slice();
  if (mode === 'priority') l.sort((a, b) => PR[a.t.priority] - PR[b.t.priority] || byTime(a, b));
  else if (mode === 'due') l.sort((a, b) => ((a.t.due || a.d || '9999') < (b.t.due || b.d || '9999') ? -1 : 1));
  else if (mode === 'title') l.sort((a, b) => a.t.title.localeCompare(b.t.title));
  return l;
}

function taskEntries(status) {
  const td = today(), out = [];
  const subj = U.tf.subject, pr = U.tf.priority;
  const ok = t => t.kind !== 'event' && (!subj || t.subjectId === subj) && (!pr || t.priority === pr) && matchesQuery(t);
  const S = list => sortInst(list);

  const overdue = overdueList().filter(i => ok(i.t));
  if (status === 'overdue') return { list: overdue, groups: [['Overdue', S(overdue)]] };
  if (status === 'done') {
    const list = [];
    D.tasks.filter(ok).forEach(t => {
      if (isRec(t)) Object.keys(t.doneDates || {}).forEach(d => list.push({ i: inst(t, d), at: t.doneDates[d] }));
      else if (t.done) list.push({ i: inst(t, t.date || (t.doneAt || '').slice(0, 10) || td), at: t.doneAt || '' });
    });
    list.sort((a, b) => (a.at < b.at ? 1 : -1));
    return { list: list.map(x => x.i), groups: [['Completed', list.slice(0, 80).map(x => x.i)]] };
  }
  const todayL = dayInst(td).filter(i => ok(i.t) && i.kind !== 'event');
  const upcoming = D.tasks.filter(t => ok(t) && !isRec(t) && !t.done && t.date && t.date > td).map(t => inst(t, t.date)).sort((a, b) => a.d < b.d ? -1 : a.d > b.d ? 1 : byTime(a, b));
  const nodate = D.tasks.filter(t => ok(t) && !isRec(t) && !t.done && !t.date).map(t => inst(t, '')).sort((a, b) => PR[a.t.priority] - PR[b.t.priority]);
  const reps = D.tasks.filter(t => ok(t) && isRec(t) && t.kind !== 'event').map(t => inst(t, t.date));
  if (status === 'today') return { list: todayL, groups: [['Today', S(todayL.slice().sort(byTime))]] };

  const byDay = {};
  upcoming.forEach(i => { (byDay[i.d] = byDay[i.d] || []).push(i); });
  const dayGroups = Object.keys(byDay).sort().map(d => [relLabel(d) + (diffDays(td, d) > 1 && diffDays(td, d) < 7 ? ' · ' + fmtShort(d) : ''), S(byDay[d])]);

  if (status === 'upcoming') return { list: upcoming.concat(nodate), groups: dayGroups.concat([['No date', S(nodate)], ['Repeating', S(reps)]]) };
  const g = [['Overdue', S(overdue)], ['Today', S(todayL.slice().sort(byTime))]].concat(dayGroups).concat([['No date', S(nodate)], ['Repeating', S(reps)]]);
  return { list: overdue.concat(todayL, upcoming, nodate), groups: g };
}

function viewPlans(){
  const open=D.plans.filter(p=>!p.done), done=D.plans.filter(p=>p.done);
  const row=p=>'<li class="plan-item '+(p.done?'done':'')+'"><button class="chk '+(p.done?'on':'')+'" data-a="plan-toggle" data-id="'+p.id+'" aria-label="'+(p.done?'Mark plan open':'Mark plan complete')+'">'+ico('check')+'</button><button class="plan-name" data-a="plan-edit" data-id="'+p.id+'">'+esc(p.title)+'</button><button class="icon-btn" data-a="plan-edit" data-id="'+p.id+'" aria-label="Edit plan">'+ico('edit')+'</button></li>';
  let body='';
  if(!open.length&&!done.length) body=emptyBox('No plans yet.','Add something you need to do without scheduling it.', '<button class="btn btn-primary" data-a="plan-new">'+ico('plus')+'Add plan</button>',true);
  else {
    if(open.length) body+='<section class="plan-section"><div class="grp-h">Open<span class="n">'+open.length+'</span></div><ul class="plan-items">'+open.map(row).join('')+'</ul></section>';
    if(done.length) body+='<section class="plan-section"><div class="grp-h">Completed<span class="n">'+done.length+'</span></div><ul class="plan-items">'+done.map(row).join('')+'</ul></section>';
    body+='<button class="btn btn-primary" data-a="plan-new">'+ico('plus')+'Add plan</button>';
  }
  return pageHead('Plans','Things you need to do, without a schedule.', '')+body;
}
function noteFolder(id){ return (D.noteFolders || []).find(f => f.id === id) || null; }
function noteFolderChildren(parentId, subjectId){
  return (D.noteFolders || []).filter(f => (f.parentId || null) === (parentId || null) && (f.subjectId || null) === (subjectId || null))
    .slice().sort((a,b) => a.name.localeCompare(b.name));
}
function noteFolderPath(id){
  const out=[]; let f=noteFolder(id), guard=0;
  while(f && guard++<100){ out.unshift(f); f=noteFolder(f.parentId); }
  return out;
}
function noteFolderLabel(id){
  const f=noteFolder(id);
  return f ? noteFolderPath(id).map(x=>x.name).join(' / ') : '';
}
function viewNotes() {
  const q = (U.noteQ || '').trim().toLowerCase();
  const current = U.noteFolder || null;
  const subjectRoot = current && current.indexOf('subject:') === 0 ? current.slice(8) : null;
  const currentFolder = current && !subjectRoot ? noteFolder(current) : null;
  const folderId = subjectRoot ? null : current;
  const subject = subjectRoot
    ? (D.subjects || []).find(s => s.id === subjectRoot)
    : currentFolder && currentFolder.subjectId
      ? (D.subjects || []).find(s => s.id === currentFolder.subjectId)
      : null;
  const folders = noteFolderChildren(folderId, subject ? subject.id : null);
  const notes = (D.notes || []).filter(n => {
    const samePlace = (n.folderId || null) === folderId && (n.subjectId || null) === (subject ? subject.id : null);
    return samePlace && (!q || (n.title || '').toLowerCase().includes(q) || (n.body || '').toLowerCase().includes(q));
  }).slice().sort((a,b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  const title = subject ? subject.name : current ? noteFolder(current)?.name || 'Notes' : 'Notes';
  const crumb = subject
    ? `<button class="note-crumb" data-a="note-root">Notes</button><span>/</span><b>${esc(subject.name)}</b>`
    : current
      ? `<button class="note-crumb" data-a="note-root">Notes</button><span>/</span>${noteFolderPath(current).map((f,i)=>`<button class="note-crumb" data-a="note-open" data-id="${f.id}">${esc(f.name)}</button>`).join('<span>/</span>')}`
      : `<b>Notes</b>`;

  const search = `<div class="search notes-search">${ico('search')}<input class="input" id="note-q" type="search" data-set="note-q" value="${esc(U.noteQ || '')}" placeholder="Search this folder" aria-label="Search notes" autocomplete="off">${q ? `<button class="icon-btn clr" data-a="note-clear" aria-label="Clear search">${ico('x')}</button>` : ''}</div>`;
  const folderCard = f => `<article class="note-folder-card"><button class="note-folder-open" data-a="note-open" data-id="${f.id}"><span class="note-folder-icon">${ico('plans')}</span><span class="note-folder-name">${esc(f.name)}</span><span class="note-folder-arrow">${ico('right')}</span></button><button class="icon-btn note-folder-edit" data-a="note-folder-edit" data-id="${f.id}" aria-label="Rename ${esc(f.name)}">${ico('more')}</button></article>`;
  const subjectCard = sb => `<article class="note-folder-card"><button class="note-folder-open" data-a="note-subject" data-id="${sb.id}"><span class="note-folder-icon">${ico('subjects')}</span><span class="note-folder-name">${esc(sb.name)}</span><span class="note-folder-arrow">${ico('right')}</span></button></article>`;
  const card = n => {
    const text = (n.body || '').trim();
    const preview = text.replace(/\s+/g, ' ').slice(0, 220);
    const when = n.updatedAt ? new Date(n.updatedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '';
    return `<article class="note-card"><button class="note-open" data-a="note-edit" data-id="${n.id}"><div class="note-title">${esc(n.title || 'Untitled note')}</div>${preview ? `<div class="note-preview">${esc(preview)}${text.length > 220 ? '…' : ''}</div>` : '<div class="note-preview muted">No content yet.</div>'}<div class="note-meta">${when ? 'Updated ' + esc(when) : 'New note'}<span>${ico('right')}</span></div></button></article>`;
  };

  const showSubjects = !current;
  const foldersHtml = (showSubjects ? (D.subjects || []).map(subjectCard).join('') : '') + folders.map(folderCard).join('');
  let body = '';
  if (foldersHtml) body += `<div class="notes-grid note-folders">${foldersHtml}</div>`;
  if (notes.length) body += `<div class="notes-grid">${notes.map(card).join('')}</div>`;
  if (!body) body = emptyBox(q ? 'No notes found.' : 'This folder is empty.', q ? 'Try another search term.' : 'Create a folder or note to start organizing your study material.', '', true);

  const newFolder = `<button class="btn" data-a="note-folder-new">${ico('plus')}New folder</button>`;
  const newNote = `<button class="btn btn-primary" data-a="note-new">${ico('plus')}New note</button>`;
  return pageHead(title, subject ? 'Study notes for this subject.' : current ? 'Organize notes inside nested folders.' : 'Organize your notes by subject, topic and nested folders.', newFolder + newNote)
    + `<div class="note-breadcrumb">${crumb}</div><div class="notes-toolbar">${search}</div>${body}`;
}

function viewTasks() {
  const st = U.tf.status, q = U.tf.q || '';
  const counts = {
    all: taskEntriesCount('all'), today: taskEntriesCount('today'), upcoming: taskEntriesCount('upcoming'),
    overdue: taskEntriesCount('overdue'), done: taskEntriesCount('done')
  };
  const chips = [['all', 'All open'], ['today', 'Today'], ['upcoming', 'Upcoming'], ['overdue', 'Overdue'], ['done', 'Completed']]
    .map(([k, l]) => `<button class="chip ${st === k ? 'on' : ''}" data-a="tf-status" data-s="${k}">${l}${counts[k] ? ` <span class="n">${counts[k]}</span>` : ''}</button>`).join('');

  const search = `<div class="search">${ico('search')}<input class="input" id="tq" type="search" data-set="tf-q" value="${esc(q)}" placeholder="Search tasks" aria-label="Search tasks" autocomplete="off">
    ${q ? `<button class="icon-btn clr" data-a="tf-clear" aria-label="Clear search">${ico('x')}</button>` : ''}</div>`;
  const subjSel = `<select class="select" data-set="tf-subject" aria-label="Filter by subject"><option value="">All subjects</option>${D.subjects.map(s => `<option value="${s.id}" ${U.tf.subject === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select>`;
  const prSel = `<select class="select" data-set="tf-priority" aria-label="Filter by priority"><option value="">Any priority</option>${['high', 'medium', 'low'].map(p => `<option value="${p}" ${U.tf.priority === p ? 'selected' : ''}>${cap(p)}</option>`).join('')}</select>`;
  const sortSel = `<select class="select" data-set="tf-sort" aria-label="Sort by">${SORTS.map(([v, l]) => `<option value="${v}" ${(U.tf.sort || 'smart') === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`;

  const { groups } = taskEntries(st);
  const shown = groups.filter(g => g[1].length);
  let body;
  if (!shown.length) {
    body = q
      ? emptyBox('No matches for “' + esc(q) + '”.', 'Try a different word, or clear the filters.', `<button class="btn" data-a="tf-clear">Clear search</button>`, true)
      : st === 'overdue' ? emptyBox('Nothing overdue.', 'You\'re on top of it.', '', true)
      : st === 'done' ? emptyBox('Nothing completed yet.', 'Finished tasks collect here.', '', true)
      : emptyBox('No tasks here.', 'Add one and it shows up in this list.', `<button class="btn btn-primary" data-a="add">${ico('plus')}Add a task</button>`, true);
  } else {
    body = shown.map(([label, list]) => `<section class="grp"><div class="grp-h ${label === 'Overdue' ? 'red' : ''}">${esc(label)}<span class="n">${list.length}</span></div><ul class="tlist">${list.map(i => taskRow(i, { showDate: st === 'done' || label === 'Overdue' || label === 'Repeating', showGoal: true, showDone: st === 'done' })).join('')}</ul></section>`).join('');
  }
  return pageHead('Tasks', 'Everything you need to do, in one list.', addBtn('New task')) +
    `<div class="filters">${search}${subjSel}${prSel}${sortSel}</div><div class="filters">${chips}</div>${body}`;
}

function taskEntriesCount(status) {
  return taskEntries(status).list.length;
}
