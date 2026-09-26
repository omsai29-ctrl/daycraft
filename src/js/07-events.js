/* ================= shell + render ================= */
const NAV = [['today', 'Today'], ['planner', 'Planner'], ['timetable', 'Timetable'], ['tasks', 'Tasks'], ['plans', 'Plans'], ['notes', 'Notes'], ['focus', 'Focus'], ['subjects', 'Subjects'], ['goals', 'Goals'], ['habits', 'Habits'], ['exams', 'Exams'], ['review', 'Review']];
const NAV_GROUPS = [
  ['Plan', ['today', 'planner', 'timetable', 'tasks', 'plans', 'focus', 'attendance']],
  ['Track', ['notes', 'subjects', 'goals', 'habits', 'exams']],
  ['Reflect', ['review']]
];
const NAV_LABEL = NAV.reduce((o, [p, l]) => (o[p] = l, o), {});
const PAGES = { today: viewToday, planner: viewPlanner, timetable: viewTimetable, tasks: viewTasks, plans: viewPlans, notes: viewNotes, focus: viewFocus, attendance: viewAttendance, subjects: viewSubjects, goals: viewGoals, habits: viewHabits, exams: viewExams, review: viewReview, settings: viewSettings };

function shell(content) {
  const td = today();
  const od = overdueList().length;
  const openToday = dayInst(td).filter(i => i.kind !== 'event' && !i.done).length;
  const cnt = p => p === 'today' && openToday ? `<span class="cnt">${openToday}</span>` : (p === 'tasks' && od ? `<span class="cnt red">${od}</span>` : '');
  const item = p => `<button class="${U.page === p ? 'on' : ''}" data-a="nav" data-p="${p}" ${U.page === p ? 'aria-current="page"' : ''}>${ico(p)}${NAV_LABEL[p]}${cnt(p)}</button>`;
  const nav = NAV_GROUPS.map(([label, pages], k) =>
    `${k ? `<div class="nav-label">${label}</div>` : ''}<nav class="nav" aria-label="${label}">${pages.map(item).join('')}</nav>`
  ).join('');
  const moreOn = ['timetable','plans','focus','attendance','notes', 'subjects', 'goals', 'habits', 'exams', 'review', 'settings'].includes(U.page);
  return `<div class="shell">
    <aside class="side"><div class="brand">My Planner</div>
      <button class="btn btn-primary" data-a="add">${ico('plus')}Add task</button>
      ${nav}<div class="grow"></div>
      <nav class="nav"><button class="${U.page === 'settings' ? 'on' : ''}" data-a="nav" data-p="settings">${ico('settings')}Settings</button></nav>
      <div class="sync-line"><i class="dot"></i><span data-sync>${syncLabel()}</span></div>
    </aside>
    <main class="main" id="main">${content}</main>
    <nav class="tabbar" aria-label="Main">
      <button class="${U.page === 'today' ? 'on' : ''}" data-a="nav" data-p="today">${ico('today')}Today</button>
      <button class="${U.page === 'planner' ? 'on' : ''}" data-a="nav" data-p="planner">${ico('planner')}Planner</button>
      <button class="plus" data-a="add" aria-label="Add task"><span class="c">${ico('plus')}</span></button>
      <button class="${U.page === 'tasks' ? 'on' : ''}" data-a="nav" data-p="tasks">${ico('tasks')}Tasks</button>
      <button class="${moreOn ? 'on' : ''}" data-a="more">${ico('more')}More</button>
    </nav></div>`;
}

/* Replacing the DOM blurs whatever was focused, and a blur can fire `change`,
   which can ask for another render mid-flight. One render at a time. */
let rendering = false;
function render() {
  if (rendering) return;
  rendering = true;
  try { renderNow(); } finally { rendering = false; }
}
function renderNow() {
  const root = $('#app');
  const scrollY = window.scrollY;
  const wk = $('#wkscroll');
  const wkTop = wk ? wk.scrollTop : null, wkLeft = wk ? wk.scrollLeft : null;
  let html;
  try { html = (PAGES[U.page] || viewToday)(); } catch (e) { console.error(e); html = '<p>Something went wrong showing this page.</p>'; }
  root.innerHTML = shell(html);
  applyTheme();
  const nw = $('#wkscroll');
  if (nw) {
    if (wkTop != null && U.plannerScrolled) { nw.scrollTop = wkTop; nw.scrollLeft = wkLeft; }
    else { const gs = +nw.dataset.gs; nw.scrollTop = Math.max(0, (nowMin() - gs) / 60 * HH - 140); U.plannerScrolled = true; }
  } else window.scrollTo(0, scrollY);
  if (U.focus) {
    const el = document.getElementById(U.focus);
    if (el) {
      el.focus();
      if (U.focusEnd && el.setSelectionRange) { const n = el.value.length; try { el.setSelectionRange(n, n); } catch (e) { /* noop */ } }
    }
    U.focus = null; U.focusEnd = false;
  }
  if (U.pulse) setTimeout(() => { U.pulse = null; }, 420);
}
function go(p) { U.page = p; if (p !== 'planner') U.plannerScrolled = false; if (p !== 'subjects') U.subj = null; render(); window.scrollTo(0, 0); }

let initialTheme = document.documentElement.getAttribute('data-theme');
function applyTheme() {
  const t = D.settings.theme, h = document.documentElement;
  if (t === 'light' || t === 'dark') h.setAttribute('data-theme', t);
  else if (initialTheme) h.setAttribute('data-theme', initialTheme); else h.removeAttribute('data-theme');
  /* match the browser/status bar to the theme actually showing */
  try {
    const dark = t === 'dark' || (t !== 'light' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const m = document.querySelector('meta[name=theme-color]');
    if (m) m.setAttribute('content', dark ? '#0E0E10' : '#F7F6F4');
  } catch (e) { /* noop */ }
}

/* ================= events ================= */
const ds = el => el.dataset;
function onClick(e) {
  if (dragJustEnded) { dragJustEnded = false; e.preventDefault(); e.stopPropagation(); return; }
  const el = e.target.closest('[data-a]');
  if (!el) return;
  const a = ds(el).a, d = ds(el);
  /* nested interactive elements inside a data-a container: the innermost wins (closest already does that) */
  switch (a) {
    case 'nav': if (modalOpen()) closeModal(); go(d.p); break;
    case 'glance': go(d.p); break;
    case 'more': openMore(); break;
    case 'att-present': {
      const a=D.attendance&&D.attendance[d.id]; if(a) mutate(()=>{a.present++;a.total++;},'Attendance marked present'); break;
    }
    case 'att-absent': {
      const a=D.attendance&&D.attendance[d.id]; if(a) mutate(()=>{a.total++;},'Attendance marked absent'); break;
    }
    case 'att-undo': {
      const a=D.attendance&&D.attendance[d.id]; if(a&&a.total>0) mutate(()=>{a.total--; if(a.present>a.total)a.present=a.total;},'Attendance entry undone'); break;
    }
    case 'focus-length': {
      if (U.focusTimer && U.focusTimer.running) break;
      const m = Math.max(1, +d.m || 25);
      U.focusTimer = { remaining: m * 60, elapsed: 0, total: m * 60, running: false, paused: false, startedAt: null };
      render();
      break;
    }
    case 'focus-start': startFocusTimer(); break;
    case 'focus-pause': pauseFocusTimer(); break;
    case 'focus-resume': resumeFocusTimer(); break;
    case 'focus-stop': stopFocusTimer(true); break;
    case 'plan-new': openPlanForm(); break;
    case 'plan-edit': openPlanForm(d.id); break;
    case 'plan-save': { const title=$('#plan-title').value.trim(); if(!title){$('#plan-title').focus();break;} const F=U.form, old=F&&F.id; closeModal(); mutate(()=>{if(old){const p=D.plans.find(x=>x.id===old); if(p)p.title=title;}else D.plans.unshift({id:uid(),title,done:false});},old?'Plan updated':'Plan added'); break; }
    case 'plan-toggle': { const p=D.plans.find(x=>x.id===d.id); if(p) mutate(()=>{p.done=!p.done;}, p.done?'Plan reopened':'Plan completed'); break; }
    case 'plan-del': { const id=U.form&&U.form.id; closeModal(); mutate(()=>{D.plans=D.plans.filter(x=>x.id!==id);},'Plan deleted'); break; }
    case 'plan-new': openPlanForm(); break;
    case 'plan-edit': openPlanForm(d.id); break;
    case 'plan-save': { const title=$('#plan-title').value.trim(); if(!title){$('#plan-title').focus();break;} const F=U.form, old=F&&F.id; closeModal(); mutate(()=>{if(old){const p=D.plans.find(x=>x.id===old); if(p)p.title=title;}else D.plans.unshift({id:uid(),title,done:false});},old?'Plan updated':'Plan added'); break; }
    case 'plan-toggle': { const p=D.plans.find(x=>x.id===d.id); if(p) mutate(()=>{p.done=!p.done;}, p.done?'Plan reopened':'Plan completed'); break; }
    case 'plan-del': { const id=U.form&&U.form.id; closeModal(); mutate(()=>{D.plans=D.plans.filter(x=>x.id!==id);},'Plan deleted'); break; }
    case 'add': {
      const o = {};
      if (d.date) o.date = d.date;
      if (d.start) o.start = +d.start;
      if (d.subject) o.subjectId = d.subject;
      if (d.goal) o.goalId = d.goal;
      if (modalOpen()) closeModal();
      openAdd(o); break;
    }
    case 'toggle': {
      e.stopPropagation();
      const t = taskOf(d.id); if (!t) break;
      const day = d.d || t.date || today();
      const willDone = !isDoneOn(t, day);
      U.pulse = willDone ? d.id + '@' + (d.d || '') : null;
      mutate(() => toggleDone(d.id, day), willDone ? 'Completed “' + t.title + '”' : null);
      break;
    }
    case 'edit': {
      if (e.target.closest('[data-a=toggle],[data-a=sub],[data-a=expand]')) break;
      openTaskForm({ id: d.id, d: d.d }); break;
    }
    case 'sub': { e.stopPropagation(); mutate(() => { const t = taskOf(d.id); const s = t && t.subtasks.find(x => x.id === d.sid); if (s) s.done = !s.done; }); break; }
    case 'expand': e.stopPropagation(); U.expanded[d.k] = !U.expanded[d.k]; render(); break;
    case 'resched': openReschedule([{ id: d.id, d: d.d || (taskOf(d.id) || {}).date || today() }]); break;
    case 'carry': carry(d.scope, d.to); break;
    case 'wrap': U.wrap = true; render(); break;
    case 'wrap-off': U.wrap = false; render(); break;
    case 'import-yes': { const o = U.form && U.form.pending; closeModal(); if (o) applyImport(o); break; }
    case 'plan-day': if (modalOpen()) closeModal(); openPlanDay(); break;
    case 'plan-apply': {
      const plan = U.form && U.form.plan; closeModal(); if (!plan) break;
      mutate(() => plan.forEach(p => { const t = taskOf(p.id); if (t) { const prev = t.date; t.date = today(); t.start = fromMin(p.start); if (prev && prev < today()) t.moves.push({ on: today(), from: prev, to: today() }); } }), plan.length + ' ' + (plan.length === 1 ? 'task' : 'tasks') + ' scheduled');
      break;
    }
    case 'rs': doReschedule(d.w); break;
    case 'tf': U.tf.status = d.s; go('tasks'); break;
    case 'tf-status': U.tf.status = d.s; render(); break;
    case 'tf-clear': U.tf.q = ''; U.tf.subject = ''; U.tf.priority = ''; U.focus = 'tq'; render(); break;
    /* planner */
    case 'pl': {
      const n = +d.n;
      if (U.pv === 'month') { const x = pd(U.pd); x.setDate(1); x.setMonth(x.getMonth() + n); U.pd = ymd(x); }
      else U.pd = addDays(U.pd, U.pv === 'week' ? 7 * n : n);
      render(); break;
    }
    case 'tt-theme': openTimetableTheme(); break;
    case 'tt-theme-color': {
      const k=d.kind, v=d.color; if(!D.timetable.appearance) ensureTimetable();
      D.timetable.appearance[k]=v; save(); render(); openTimetableTheme(); break;
    }
    case 'tt-border-toggle': {
      ensureTimetable(); D.timetable.appearance.showBorder=!D.timetable.appearance.showBorder; save(); render(); openTimetableTheme(); break;
    }
    case 'tt-text-color': {
      if(U.form&&U.form.kind==='timetable'){ U.form.text=d.color; $('#tt-text-sw button').forEach(b=>b.classList.toggle('on',b.dataset.color===d.color)); }
      break;
    }
    case 'tt-day-prev': { const i=TT_DAYS.indexOf(U.ttDay||TT_DAYS[0]); U.ttDay=TT_DAYS[(i+TT_DAYS.length-1)%TT_DAYS.length]; render(); break; }
    case 'tt-day-next': { const i=TT_DAYS.indexOf(U.ttDay||TT_DAYS[0]); U.ttDay=TT_DAYS[(i+1)%TT_DAYS.length]; render(); break; }
    case 'tt-new': openTimetableForm(null, null); break;
    case 'tt-new-slot': openTimetableForm(null, { day: d.day, start: +d.start }); break;
    case 'tt-edit': openTimetableForm(d.id, null); break;
    case 'tt-task': {
      const id=U.form&&U.form.id, e=D.timetable&&D.timetable.entries.find(x=>x.id===id);
      if(!e) break;
      closeModal();
      const dayIndex=TT_DAYS.indexOf(e.day), todayIndex=(new Date().getDay()+6)%7;
      const date=addDays(today(), (dayIndex-todayIndex+7)%7);
      const base=(e.course||'Class').replace(/-LAB$/,'');
      const subjectId=(D.subjects||[]).find(s=>s.id===base||s.name.toLowerCase().startsWith(base.toLowerCase()))?.id||null;
      openAdd({title:'Prepare for '+e.course,date,start:ttEndMin(e.end)!=null?fromMin(ttEndMin(e.end)):'',duration:30,subjectId});
      break;
    }
    case 'tt-save': { const course=$('#tt-course').value.trim(); const day=$('#tt-day').value; const start=+$('#tt-start').value; const end=+$('#tt-end').value; const room=$('#tt-room').value.trim(); const color=$('#tt-color').value; if(!course){$('#tt-course').focus();break;} if(end<start){toast('End slot must be after start slot.');break;} const id=U.form&&U.form.id, text=(U.form&&U.form.text)||null; closeModal(); mutate(()=>{const e={id:id||uid(),day,start,end,course,room,color,text}; if(id){const i=D.timetable.entries.findIndex(x=>x.id===id);if(i>=0)D.timetable.entries[i]=e;}else D.timetable.entries.push(e);}, id?'Timetable class updated':'Timetable class added'); break; }
    case 'tt-del': { const id=U.form&&U.form.id; closeModal(); mutate(()=>{D.timetable.entries=D.timetable.entries.filter(e=>e.id!==id);},'Timetable class deleted'); break; }
    case 'pl-today': U.pd = today(); U.plannerScrolled = false; render(); break;
    case 'pl-view': U.pv = d.v; U.plannerScrolled = false; render(); break;
    case 'pl-goto': e.stopPropagation(); U.pd = d.d; U.pv = 'day'; U.plannerScrolled = false; if (U.page !== 'planner') U.page = 'planner'; render(); break;
    /* subjects */
    case 'subj-open': U.subj = d.id; render(); window.scrollTo(0, 0); break;
    case 'subj-back': U.subj = null; render(); break;
    case 'subj-new': openSubjectForm(); break;
    case 'subj-edit': openSubjectForm(d.id); break;
    case 'sb-color': U.form.color = d.c; $$('#sb-sw button').forEach(b => b.classList.toggle('on', b.dataset.c === d.c)); break;
    case 'sb-save': {
      const name = $('#sb-name').value.trim(); if (!name) { $('#sb-name').focus(); break; }
      const F = U.form; closeModal();
      mutate(() => { if (F.id) { const s = subjOf(F.id); s.name = name; s.color = F.color; } else { const s = { id: 's_' + uid(), name, color: F.color }; D.subjects.push(s); } });
      break;
    }
    case 'sb-del': {
      const id = U.form.id; closeModal();
      mutate(() => { D.subjects = D.subjects.filter(s => s.id !== id); D.tasks.forEach(t => { if (t.subjectId === id) t.subjectId = null; }); D.goals.forEach(g => { if (g.subjectId === id) g.subjectId = null; }); D.exams.forEach(x => { if (x.subjectId === id) x.subjectId = null; }); U.subj = null; }, 'Subject deleted');
      break;
    }
    /* goals */
    case 'goal-new': openGoalForm({}); break;
    case 'goal-edit': openGoalForm({ id: d.id }); break;
    case 'ms': mutate(() => { const g = goalOf(d.id); const m = g.milestones.find(x => x.id === d.mid); m.done = !m.done; m.doneOn = m.done ? today() : null; }); break;
    case 'ms-del': mutate(() => { const g = goalOf(d.id); g.milestones = g.milestones.filter(x => x.id !== d.mid); }); break;
    case 'ms-add': addMilestone(d.id); break;
    case 'g-msdel': { const g = U.form.g; g.milestones = g.milestones.filter(m => m.id !== d.mid); $('#g-ms').innerHTML = msEditHtml(g); break; }
    case 'g-msadd': break;
    case 'g-save': {
      const g = U.form.g; if (!g.title.trim()) { $('#g-title').focus(); break; }
      g.title = g.title.trim(); g.deadline = g.deadline || null; g.milestones = g.milestones.filter(m => m.text.trim());
      const editing = U.form.editing; closeModal();
      mutate(() => { if (editing) Object.assign(goalOf(g.id), g); else D.goals.push(g); }, editing ? null : 'Goal added');
      break;
    }
    case 'g-del': { const id = U.form.g.id; closeModal(); mutate(() => { D.goals = D.goals.filter(g => g.id !== id); D.tasks.forEach(t => { if (t.goalId === id) t.goalId = null; }); }, 'Goal deleted'); break; }
    /* habits */
    case 'habit': mutate(() => { const h = D.habits.find(x => x.id === d.id); if (h.log[d.d]) delete h.log[d.d]; else h.log[d.d] = 1; }); break;
    case 'habit-new': openHabitForm(); break;
    case 'habit-manage': openMore(); MOD().querySelector('.sheet').innerHTML = `<div class="m-head"><h2>Habits</h2><button class="icon-btn" data-a="close-modal" aria-label="Close">${ico('x')}</button></div><div class="m-body more-list">${D.habits.map(h => `<button data-a="habit-edit" data-id="${h.id}">${esc(h.name)}</button>`).join('')}</div>`; break;
    case 'habit-edit': closeModal(); openHabitForm({ id: d.id }); break;
    case 'hb-save': {
      const name = $('#hb-name').value.trim(); if (!name) { $('#hb-name').focus(); break; }
      const id = U.form.id; closeModal();
      mutate(() => { if (id) D.habits.find(h => h.id === id).name = name; else D.habits.push({ id: 'h_' + uid(), name, log: {} }); });
      break;
    }
    case 'hb-del': { const id = U.form.id; closeModal(); mutate(() => { D.habits = D.habits.filter(h => h.id !== id); }, 'Habit deleted'); break; }
    case 'hab-view': U.hv = d.v; render(); break;
    case 'hab-sel': U.hSel = d.id; render(); break;
    case 'hab-month': { const x = pd(U.hMonth || today().slice(0, 7) + '-01'); x.setMonth(x.getMonth() + (+d.n)); U.hMonth = ymd(x); render(); break; }
    /* exams */
    case 'exam-new': openExamForm(); break;
    case 'exam-edit': openExamForm(d.id); break;
    case 'topic': mutate(() => { const x = D.exams.find(e => e.id === d.id); const t = x.topics.find(y => y.id === d.tid); t.done = !t.done; }); break;
    case 'topic-add': addTopic(d.id); break;
    case 'exam-session': {
      const x = D.exams.find(e => e.id === d.id); const sb = subjOf(x.subjectId);
      const open = x.topics.find(t => !t.done);
      openTaskForm({ kind: 'study', examId: x.id, subjectId: x.subjectId, date: addDays(today(), 1), title: d.t + ' ' + (open ? open.text : (sb ? sb.name : x.title)) });
      U.form.raw = U.form.f.title; $('#f-title').value = U.form.raw; U.form.parsed = null;
      break;
    }
    case 'ex-save': {
      const title = $('#ex-title').value.trim(), date = $('#ex-date').value;
      if (!title || !date) { toast('An exam needs a name and a date.'); break; }
      const F = U.form, subj = $('#ex-subj').value || null, tp = $('#ex-topics');
      const topics = tp ? tp.value.split('\n').map(s => s.trim()).filter(Boolean).map(text => ({ id: uid(), text, done: false })) : null;
      closeModal();
      mutate(() => { if (F.id) { const x = D.exams.find(e => e.id === F.id); Object.assign(x, { title, date, subjectId: subj }); } else D.exams.push({ id: uid(), title, date, subjectId: subj, topics: topics || [] }); });
      break;
    }
    case 'ex-del': { const id = U.form.id; closeModal(); mutate(() => { D.exams = D.exams.filter(x => x.id !== id); D.tasks.forEach(t => { if (t.examId === id) t.examId = null; }); }, 'Exam deleted'); break; }
    case 'rv': U.rv = addDays(U.rv, +d.n); render(); break;
    /* settings */
    case 'theme': D.settings.theme = d.v; save(); render(); break;
    case 'notify': {
      if (!notificationsSupported()) { toast('This browser does not support notifications. In-page reminders still work.'); break; }
      if (Notification.permission === 'granted') {
        sendPlannerNotification('Daycraft', 'Notifications are working. Your task reminders can appear here.');
        toast('Test notification sent.');
        break;
      }
      try {
        Notification.requestPermission().then(p => {
          if (p === 'granted') {
            sendPlannerNotification('Daycraft', 'Notifications are now enabled.');
            toast('Notifications enabled.');
          } else if (p === 'denied') toast('Notifications are blocked. Allow them in your browser settings.');
          else toast('Notification permission was not granted.');
          render();
        });
      } catch (err) { toast('Notifications aren\'t available here. In-page reminders still work.'); }
      break;
    }
    case 'sync-now': if (AUTH.user) push(); else openAuthModal(); break;
    case 'auth-open': openAuthModal(); break;
    case 'auth-signin': authEmail('signin'); break;
    case 'auth-signup': authEmail('signup'); break;
    case 'auth-google': signInGoogle(); break;
    case 'auth-signout': signOutPlanner(); break;
    case 'export': exportData(); break;
    case 'import': $('#imp').click(); break;
    case 'clear-sample': mutate(() => { D.tasks = []; D.goals = []; D.exams = []; D.habits.forEach(h => { h.log = {}; }); D.sample = false; }, 'Sample data cleared'); break;
    case 'reset': U.form = { kind: 'confirm' }; openModal(`<div class="m-head"><h2>Erase everything?</h2></div><div class="m-body"><p>All tasks, goals, exams, habits and settings on this device will be removed. Export a backup first if you might want them back.</p></div><div class="m-foot"><span class="grow"></span><button class="btn" data-a="close-modal">Cancel</button><button class="btn btn-danger" data-a="reset-yes">Erase everything</button></div>`, { cls: 'sm', autofocus: false }); break;
    case 'reset-yes': closeModal(); D = seed(); D.sample = false; D.tasks = []; D.plans = []; D.notes = []; D.noteFolders = []; D.goals = []; D.exams = []; D.habits = defaultHabits(); D.settings = clone(DEFAULT_SETTINGS); save(); render(); toast('Everything erased.'); break;
    /* modal + forms */
    case 'scrim': if (!(U.form && U.form.dirty)) closeModal(); break;
    case 'close-modal': closeModal(); break;
    case 'note-new': openNoteForm(); break;
    case 'note-edit': openNoteForm(d.id); break;
    case 'note-open': U.noteFolder = d.id; U.noteQ = ''; render(); break;
    case 'note-root': U.noteFolder = null; U.noteQ = ''; render(); break;
    case 'note-subject': U.noteFolder = 'subject:' + d.id; U.noteQ = ''; render(); break;
    case 'note-clear': U.noteQ = ''; U.focus = 'note-q'; render(); break;
    case 'note-folder-new': openNoteFolderForm(); break;
    case 'note-folder-edit': openNoteFolderForm(d.id); break;
    case 'note-folder-save': {
      const name = $('#note-folder-name').value.trim();
      if (!name) { $('#note-folder-name').focus(); break; }
      const F = U.form, oldFolder = F && F.id;
      closeModal();
      mutate(() => {
        if (oldFolder) {
          const f = noteFolder(oldFolder);
          if (f) f.name = name;
        } else {
          const parent = U.noteFolder && U.noteFolder.indexOf('subject:') !== 0 ? noteFolder(U.noteFolder) : null;
          const subjectId = parent ? parent.subjectId : (U.noteFolder && U.noteFolder.indexOf('subject:') === 0 ? U.noteFolder.slice(8) : null);
          D.noteFolders.push({ id: uid(), name, parentId: parent ? parent.id : null, subjectId: subjectId || null, createdAt: Date.now() });
        }
      }, oldFolder ? 'Folder renamed' : 'Folder created');
      break;
    }
    case 'note-folder-del': {
      const id = U.form && U.form.id, f = noteFolder(id);
      if (!f) { closeModal(); break; }
      const hasChildren = (D.noteFolders || []).some(x => x.parentId === id);
      const hasNotes = (D.notes || []).some(n => n.folderId === id);
      if (hasChildren || hasNotes) { toast('Empty the folder before deleting it.'); break; }
      closeModal();
      mutate(() => { D.noteFolders = D.noteFolders.filter(x => x.id !== id); }, 'Folder deleted');
      break;
    }
    case 'note-save': {
      const title = $('#note-title').value.trim(), body = $('#note-body').value.trim();
      if (!title && !body) { $('#note-title').focus(); break; }
      const subjectId = $('#note-subject').value || null, folderId = $('#note-folder').value || null;
      const F = U.form, old = F && F.id;
      closeModal();
      mutate(() => {
        if (old) {
          const n = D.notes.find(x => x.id === old);
          if (n) { n.title = title || 'Untitled note'; n.body = body; n.subjectId = subjectId; n.folderId = folderId; n.updatedAt = Date.now(); }
        } else {
          D.notes.unshift({ id: uid(), title: title || 'Untitled note', body, subjectId, folderId, createdAt: Date.now(), updatedAt: Date.now() });
        }
      }, old ? 'Note updated' : 'Note saved');
      break;
    }
    case 'note-del': {
      const id = U.form && U.form.id;
      closeModal();
      mutate(() => { D.notes = D.notes.filter(n => n.id !== id); }, 'Note deleted');
      break;
    }
    case 'add-tab': switchAddTab(d.k); break;
    case 'f-prio': U.form.touched.priority = true; U.form.f.priority = d.v; U.form.dirty = true; syncTimeInputs(); break;
    case 'f-day': {
      const r = U.form.f.recur; const n = +d.v; r.days = r.days.includes(n) ? r.days.filter(x => x !== n) : r.days.concat(n);
      $('#f-days').innerHTML = daysHtml(r); break;
    }
    case 'f-resched': { const F = U.form; if (F.slot != null) { F.f.start = fromMin(F.slot); F.touched.start = true; syncTimeInputs(); refreshForm(); } break; }
    case 'f-overlap': U.form.allowOverlap = true; refreshForm(); break;
    case 'f-split': { const F = U.form; F.f.subtasks = stepsFor(F.f).map(text => ({ id: uid(), text, done: false })); $('#f-subs').innerHTML = subsHtml(F.f); $('details.more').open = true; refreshForm(); break; }
    case 'f-nosplit': U.form.noSplit = true; refreshForm(); break;
    case 'f-subdel': { const f = U.form.f; f.subtasks = f.subtasks.filter(s => s.id !== d.sid); $('#f-subs').innerHTML = subsHtml(f); refreshForm(); break; }
    case 'f-save': saveTaskForm(); break;
    case 'f-del': { const id = U.form.f.id, t = U.form.f.title; closeModal(); mutate(() => { D.tasks = D.tasks.filter(x => x.id !== id); }, 'Deleted "' + t + '"'); break; }
    case 'f-skip': { const F = U.form; const id = F.f.id, day = F.f._instDate; closeModal(); mutate(() => { const t = taskOf(id); t.skips = (t.skips || []).concat(day); }, 'Skipped ' + relLabel(day)); break; }
    case 'toast-undo': { const t = el.closest('.toast'); if (t && t._undo) t._undo(); if (t) t.remove(); break; }
    case 'toast-act': { const t = el.closest('.toast'); if (t && t._act) t._act.fn(); if (t) t.remove(); break; }
  }
}
function addMilestone(gid) {
  const inp = document.getElementById('ms-' + gid); const v = inp && inp.value.trim(); if (!v) return;
  U.focus = 'ms-' + gid;
  mutate(() => goalOf(gid).milestones.push({ id: uid(), text: v, done: false }));
}
function addTopic(eid) {
  const inp = document.getElementById('tp-' + eid); const v = inp && inp.value.trim(); if (!v) return;
  U.focus = 'tp-' + eid;
  mutate(() => D.exams.find(e => e.id === eid).topics.push({ id: uid(), text: v, done: false }));
}

function onInput(e) {
  const el = e.target;
  if (el.dataset.set === 'tf-q') { U.tf.q = el.value; U.focus = 'tq'; U.focusEnd = true; render(); return; }
  if (el.dataset.set === 'note-q') { U.noteQ = el.value; U.focus = 'note-q'; U.focusEnd = true; render(); return; }
  if (el.dataset.f && U.form && U.form.f) onFormField(el.dataset.f, el);
  else if (el.dataset.gf && U.form && U.form.g) {
    const g = U.form.g, k = el.dataset.gf;
    if (k === 'ms') { const m = g.milestones.find(x => x.id === el.dataset.mid); if (m) m.text = el.value; }
    else g[k] = el.value || (k === 'deadline' ? null : '');
    U.form.dirty = true;
  }
}
function onChange(e) {
  const el = e.target;
  if (el.dataset.f) { if (U.form && U.form.f && el.tagName === 'SELECT') onFormField(el.dataset.f, el); return; }
  if (el.dataset.gf) { if (U.form && U.form.g && el.tagName === 'SELECT') U.form.g[el.dataset.gf] = el.value || null; return; }
  const k = el.dataset.set;
  if (!k) { if (el.id === 'imp') importData(el.files[0]); return; }
  if (k === 'tf-subject') { U.tf.subject = el.value; render(); return; }
  if (k === 'tf-priority') { U.tf.priority = el.value; render(); return; }
  if (k === 'tf-sort') { U.tf.sort = el.value; render(); return; }
  if (k === 'tf-q') { U.tf.q = el.value; return; } /* already handled on input */
  let v = el.value;
  if (['defaultDuration', 'weekStart'].includes(k)) v = +v;
  if (k === 'reminder') v = v === 'off' ? 'off' : +v;
  D.settings[k] = v; save();
  if (k === 'view') U.pv = v;
  render();
}
function onKey(e) {
  const el = e.target;
  if (e.key === 'Escape') { if (drag && drag.active) { cancelDrag(); return; } if (modalOpen()) { closeModal(); e.preventDefault(); } return; }
  if (e.key === 'Tab' && modalOpen()) { trapFocus(e); return; }
  const typing = /INPUT|TEXTAREA|SELECT/.test(el.tagName);
  /* rows that look and act like buttons should answer to the keyboard too */
  if ((e.key === 'Enter' || e.key === ' ') && !typing && el.getAttribute && el.getAttribute('role') === 'button' && el.dataset && el.dataset.a) {
    e.preventDefault(); el.click(); return;
  }
  if (e.key === '/' && !typing && !modalOpen() && !e.metaKey && !e.ctrlKey) {
    e.preventDefault();
    if (U.page !== 'tasks') { U.focus = 'tq'; go('tasks'); } else { const s = document.getElementById('tq'); if (s) s.focus(); }
    return;
  }
  if (e.key === 'Enter' && el.dataset && el.dataset.enter) {
    e.preventDefault();
    const a = el.dataset.enter;
    if (a === 'ms-add') addMilestone(el.dataset.id);
    else if (a === 'topic-add') addTopic(el.dataset.id);
    else if (a === 'f-subadd') { const v = el.value.trim(); if (v) { const f = U.form.f; f.subtasks.push({ id: uid(), text: v, done: false }); $('#f-subs').innerHTML = subsHtml(f); $('#f-subnew').focus(); refreshForm(); } }
    else if (a === 'g-msadd') { const v = el.value.trim(); if (v) { const g = U.form.g; g.milestones.push({ id: uid(), text: v, done: false }); $('#g-ms').innerHTML = msEditHtml(g); $('#g-msnew').focus(); } }
    else if (a === 'hb-save') { document.querySelector('[data-a=hb-save]').click(); }
    else if (a === 'sb-save') { document.querySelector('[data-a=sb-save]').click(); }
    return;
  }
  if (e.key === 'Enter' && el.id === 'f-title' && U.form && U.form.f) { e.preventDefault(); saveTaskForm(); return; }
  if (e.key === 'Enter' && el.dataset && el.dataset.a === 'edit' && el.classList.contains('blk')) { el.click(); return; }
  if (!modalOpen() && !/INPUT|TEXTAREA|SELECT/.test(el.tagName) && (e.key === 'n' || e.key === 'N') && !e.metaKey && !e.ctrlKey) { e.preventDefault(); openAdd({}); }
}

/* ================= export / import ================= */
async function exportData() {
  const json = JSON.stringify(D, null, 2);
  try {
    const dl = window.claude && await window.claude.use('downloads');
    if (dl) { await dl.save({ filename: 'planner-backup-' + today() + '.json', data: json }); toast('Backup ready.'); return; }
  } catch (err) { if (err && err.code === 'declined') return; }
  try {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    a.download = 'planner-backup-' + today() + '.json'; document.body.appendChild(a); a.click(); a.remove();
  } catch (err) { toast('Couldn\'t export from here.'); }
}
function importData(file) {
  if (!file) return;
  const r = new FileReader();
  r.onload = () => {
    let o;
    try { o = JSON.parse(r.result); if (!o || !Array.isArray(o.tasks)) throw new Error('bad'); }
    catch (err) { toast('That file doesn\'t look like a planner backup.'); return; }
    const hasOwn = !D.sample && (D.tasks.length || D.goals.length || D.exams.length);
    if (!hasOwn) { applyImport(o); return; }
    U.form = { kind: 'confirm', pending: o };
    openModal(`<div class="m-head"><h2>Replace your data?</h2><button class="icon-btn" data-a="close-modal" aria-label="Close">${ico('x')}</button></div>
      <div class="m-body"><p>This backup holds <b>${o.tasks.length}</b> ${o.tasks.length === 1 ? 'task' : 'tasks'}. Importing replaces everything currently on this device — tasks, goals, exams, habits and settings.</p>
      <p class="muted">Export a backup of what you have now if you might want it back.</p></div>
      <div class="m-foot"><span class="grow"></span><button class="btn" data-a="close-modal">Cancel</button><button class="btn btn-danger" data-a="import-yes">Replace everything</button></div>`,
      { cls: 'sm', autofocus: false, label: 'Confirm import' });
  };
  r.readAsText(file);
}
function applyImport(o) {
  D = migrate(o); D.sample = false; save(); render(); toast('Backup imported.');
}

/* ================= drag & drop (planner) ================= */
let drag = null, dragJustEnded = false;
const snap15 = m => Math.round(m / 15) * 15;

function elAtPoint(x, y) { return (document.elementsFromPoint ? document.elementsFromPoint(x, y) : [document.elementFromPoint(x, y)]).filter(Boolean); }

function startFocusTimer() {
  const t = U.focusTimer || { remaining: 25 * 60, elapsed: 0, total: 25 * 60 };
  t.running = true; t.paused = false; t.startedAt = t.startedAt || Date.now();
  U.focusTimer = t; render();
}
function pauseFocusTimer() {
  if (!U.focusTimer || !U.focusTimer.running) return;
  U.focusTimer.paused = true; render();
}
function resumeFocusTimer() {
  if (!U.focusTimer || !U.focusTimer.running) return;
  U.focusTimer.paused = false; render();
}
function stopFocusTimer(saveSession) {
  const t = U.focusTimer;
  if (!t) return;
  if (saveSession && t.elapsed >= 60) {
    D.focusSessions.push({ id: uid(), date: today(), seconds: t.elapsed, endedAt: new Date().toISOString(), label: 'Focus session' });
    save();
  }
  U.focusTimer = null; render();
}
function tickFocusTimer() {
  const t = U.focusTimer;
  if (!t || !t.running || t.paused) return;
  t.elapsed += 1; t.remaining = Math.max(0, t.total - t.elapsed);
  const el = document.getElementById('focus-clock');
  if (el) el.textContent = focusClockText(t.remaining);
  if (t.remaining <= 0) {
    stopFocusTimer(true);
    try { sendPlannerNotification('Daycraft', 'Focus session complete.'); } catch (e) {}
  }
}

function onPointerDown(e) {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  if (e.target.closest('[data-a=toggle]')) return;
  const blk = e.target.closest('[data-blk]'), chip = e.target.closest('[data-chip]');
  const node = blk || chip; if (!node) return;
  const rz = !!e.target.closest('[data-rz]');
  const rect = node.getBoundingClientRect();
  const id = node.dataset.blk || node.dataset.chip, d = node.dataset.d;
  const t = taskOf(id); if (!t) return;
  const i = inst(t, d);
  drag = { node, id, d, isRz: rz && !!blk, isChip: !!chip, x0: e.clientX, y0: e.clientY, pid: e.pointerId, ptype: e.pointerType, active: false, grab: e.clientY - rect.top, i, cur: null, ind: null, timer: null };
  if (drag.isRz && e.pointerType !== 'mouse') { activateDrag(); return; }
  if (e.pointerType === 'touch' || e.pointerType === 'pen') drag.timer = setTimeout(() => { if (drag) { activateDrag(); } }, 380);
}
function activateDrag() {
  if (!drag || drag.active) return;
  drag.active = true; document.body.classList.add('is-dragging'); drag.node.classList.add('dim');
  try { drag.node.setPointerCapture(drag.pid); } catch (e) { /* noop */ }
  if (navigator.vibrate && drag.ptype === 'touch') try { navigator.vibrate(10); } catch (e) { /* noop */ }
}
function onPointerMove(e) {
  if (!drag || e.pointerId !== drag.pid) return;
  const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
  if (!drag.active) {
    const dist = Math.hypot(dx, dy);
    if (drag.ptype === 'touch') { if (dist > 8) { clearTimeout(drag.timer); drag = null; } return; }
    if (dist < 5) return;
    activateDrag();
  }
  e.preventDefault();
  updateDrag(e);
}
function clearIndicators() { $$('.drop-ind').forEach(x => x.remove()); $$('.lane.over').forEach(x => x.classList.remove('over')); }
function updateDrag(e) {
  const gs = gridMeta.gs, i = drag.i;
  clearIndicators();
  if (drag.isRz) {
    const dm = snap15((e.clientY - drag.y0) / HH * 60);
    const nd = Math.max(15, i.dur + dm);
    drag.cur = { date: drag.d, start: i.start, dur: nd };
    drag.node.style.height = Math.max(22, nd / 60 * HH - 2) + 'px';
    const mt = drag.node.querySelector('.b-m'); if (mt) mt.textContent = fmtRange(i.start, i.start + nd);
    return;
  }
  const stack = elAtPoint(e.clientX, e.clientY);
  const col = stack.find(x => x.dataset && x.dataset.col), lane = stack.find(x => x.dataset && x.dataset.lane);
  if (col) {
    const r = col.getBoundingClientRect();
    let s = gs + snap15(((e.clientY - r.top - (drag.isChip ? 12 : drag.grab)) / HH) * 60);
    const dur = i.dur || D.settings.defaultDuration;
    s = Math.max(gs, Math.min(s, gridMeta.ge - Math.min(dur, 60)));
    drag.cur = { date: col.dataset.col, start: s, dur };
    const ind = document.createElement('div'); ind.className = 'drop-ind';
    ind.style.top = (s - gs) / 60 * HH + 'px'; ind.style.height = Math.max(22, dur / 60 * HH - 2) + 'px'; ind.textContent = fmtRange(s, s + dur);
    col.appendChild(ind);
  } else if (lane) {
    lane.classList.add('over'); drag.cur = { date: lane.dataset.lane, start: null, dur: i.dur };
  } else drag.cur = null;
}
function onPointerUp(e) {
  const glance = e.target.closest && e.target.closest('[data-a="glance"]');
  if (glance) {
    e.preventDefault();
    e.stopPropagation();
    const p = glance.dataset.p;
    drag = null;
    dragJustEnded = false;
    go(p);
    return;
  }
  if (!drag || e.pointerId !== drag.pid) return;
  clearTimeout(drag.timer);
  if (!drag.active) { drag = null; return; }
  const c = drag.cur, i = drag.i, isRz = drag.isRz;
  clearIndicators(); document.body.classList.remove('is-dragging'); drag.node.classList.remove('dim');
  drag = null; dragJustEnded = true; setTimeout(() => { dragJustEnded = false; }, 60);
  if (!c) { render(); return; }
  commitDrag(i, c, isRz);
}
function cancelDrag() {
  if (!drag) return; clearTimeout(drag.timer); clearIndicators(); document.body.classList.remove('is-dragging'); drag = null; render();
}
function commitDrag(i, c, isRz) {
  const t = taskOf(i.id); if (!t) return;
  const dur = c.dur;
  if (c.date === i.d && c.start === i.start && dur === i.dur) { render(); return; }
  if (c.start != null) {
    const clash = conflictFor(c.date, c.start, dur, i.id);
    if (clash) {
      const slot = freeSlot(c.date, dur, c.start, i.id);
      render();
      if (isRz) { toast('That would overlap ' + clash.t.title + '.'); return; }
      toast('You already have ' + clash.t.title + ' from ' + fmtRange(clash.start, clash.end) + '.', slot != null ? { ms: 8000, action: { label: 'Move to ' + fmtT(slot), fn: () => mutate(() => applyMove(i, { date: c.date, start: slot, dur }, isRz)) } } : {});
      return;
    }
  }
  mutate(() => applyMove(i, c, isRz));
}
function applyMove(i, c, isRz) {
  let t = taskOf(i.id); if (!t) return;
  if (isRec(t)) t = detach(t, i.d);
  const prev = t.date;
  t.duration = c.dur;
  t.date = c.date; t.start = c.start != null ? fromMin(c.start) : null;
  if (prev && c.date > prev) t.moves.push({ on: today(), from: prev, to: c.date });
}

/* Month view: native drag & drop */
function onDragStart(e) {
  const ch = e.target.closest && e.target.closest('[data-mchip]');
  const row = e.target.closest && e.target.closest('[data-reorder]');
  if (ch) { e.dataTransfer.setData('text/plain', ch.dataset.mchip + '|' + ch.dataset.d); e.dataTransfer.effectAllowed = 'move'; return; }
  if (row) { e.dataTransfer.setData('text/plain', 'reorder|' + row.dataset.reorder); e.dataTransfer.effectAllowed = 'move'; U.reorderId = row.dataset.reorder; }
}
function onDragOver(e) {
  const cell = e.target.closest && e.target.closest('[data-mcell]');
  const row = e.target.closest && e.target.closest('[data-reorder]');
  if (cell) { e.preventDefault(); $$('.mcell.over').forEach(x => { if (x !== cell) x.classList.remove('over'); }); cell.classList.add('over'); }
  else if (row && U.reorderId && row.dataset.reorder !== U.reorderId) {
    e.preventDefault(); $$('.drop-above,.drop-below').forEach(x => x.classList.remove('drop-above', 'drop-below'));
    const r = row.getBoundingClientRect(); row.classList.add(e.clientY < r.top + r.height / 2 ? 'drop-above' : 'drop-below');
  }
}
function onDrop(e) {
  const cell = e.target.closest && e.target.closest('[data-mcell]');
  const row = e.target.closest && e.target.closest('[data-reorder]');
  const data = (e.dataTransfer && e.dataTransfer.getData('text/plain')) || '';
  $$('.mcell.over').forEach(x => x.classList.remove('over'));
  if (cell && data && !data.startsWith('reorder|')) {
    e.preventDefault(); const [id, from] = data.split('|'), to = cell.dataset.mcell;
    if (to === from) return;
    const t = taskOf(id); if (!t) return;
    mutate(() => moveItems([{ id, d: from }], to), 'Moved to ' + relLabel(to));
  } else if (row && data.startsWith('reorder|')) {
    e.preventDefault();
    const id = data.split('|')[1], target = row.dataset.reorder; if (id === target) return;
    const after = row.classList.contains('drop-below');
    mutate(() => {
      const list = dayInst(today()).filter(i => i.kind !== 'event' && !i.done && i.start == null).sort((a, b) => (a.t.order || 0) - (b.t.order || 0) || PR[a.t.priority] - PR[b.t.priority]).map(i => i.id);
      const from = list.indexOf(id); if (from < 0) return; list.splice(from, 1);
      let idx = list.indexOf(target); if (after) idx++; list.splice(idx, 0, id);
      list.forEach((tid, n) => { const t = taskOf(tid); if (t) t.order = n + 1; });
    });
  }
  U.reorderId = null;
}
function onDragEnd() { U.reorderId = null; $$('.drop-above,.drop-below,.mcell.over').forEach(x => x.classList.remove('drop-above', 'drop-below', 'over')); }

/* click on empty planner slot */
function onColClick(e) {
  const col = e.target.closest('[data-col]');
  if (!col || e.target.closest('[data-blk]') || dragJustEnded) return;
  const r = col.getBoundingClientRect();
  const s = gridMeta.gs + snap15(((e.clientY - r.top) / HH) * 60 - 7);
  e.stopPropagation();
  openAdd({ date: col.dataset.col, start: Math.max(0, s) });
}
function onLaneClick(e) {
  const lane = e.target.closest('[data-lane]');
  if (!lane || e.target.closest('[data-chip]')) return;
  openAdd({ date: lane.dataset.lane });
}

/* ================= clock, reminders ================= */
const fired = new Set();
let lastMin = -1;
function tick() {
  const n = nowMin();
  const c = document.getElementById('clock'); if (c) c.textContent = fmtT(n);
  const nl = document.getElementById('nowline'); if (nl) nl.style.top = ((n - gridMeta.gs) / 60 * HH) + 'px';
  checkReminders(n);
  if (SYNC.pull && !modalOpen() && !(drag && drag.active)) doPull();
  if (n !== lastMin) {
    lastMin = n;
    if (U.page === 'today' && !modalOpen() && !drag && !/INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || '')) render();
  }
}
function checkReminders(n) {
  const td = today(), def = D.settings.reminder;
  dayInst(td).forEach(i => {
    if (i.start == null || i.done || i.kind === 'event') return;
    let rem = i.t.reminder === undefined || i.t.reminder === 'default' ? def : i.t.reminder;
    if (rem === 'off' || rem == null) return;
    rem = +rem;
    const key = i.key + '#' + rem;
    if (n >= i.start - rem && n < i.start && !fired.has(key)) {
      fired.add(key);
      const left = i.start - n;
      toast(i.t.title + ' starts in ' + minsLabel(left) + ' (' + fmtT(i.start) + ')', { cls: 'remind', ms: 12000 });
      try { sendPlannerNotification(i.t.title, 'Starts in ' + minsLabel(left) + ' (' + fmtT(i.start) + ')'); } catch (e) { /* noop */ }
    }
  });
}

/* ================= boot ================= */
function boot() {
  document.addEventListener('click', onClick, true);
  document.addEventListener('click', e => { if (e.target.closest && e.target.closest('[data-col]')) onColClick(e); else if (e.target.closest && e.target.closest('[data-lane]')) onLaneClick(e); });
  document.addEventListener('input', onInput);
  document.addEventListener('change', onChange);
  document.addEventListener('keydown', onKey);
  document.addEventListener('pointerdown', onPointerDown);
  document.addEventListener('pointermove', onPointerMove, { passive: false });
  document.addEventListener('pointerup', onPointerUp);
  document.addEventListener('pointercancel', () => { if (drag && drag.active) cancelDrag(); else if (drag) { clearTimeout(drag.timer); drag = null; } });
  document.addEventListener('touchmove', e => { if (drag && drag.active) e.preventDefault(); }, { passive: false });
  document.addEventListener('dragstart', onDragStart);
  document.addEventListener('dragover', onDragOver);
  document.addEventListener('drop', onDrop);
  document.addEventListener('dragend', onDragEnd);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && U.page === 'today') render(); });
  render();
  initSync();
  setInterval(tick, 15000);
  setInterval(tickFocusTimer, 1000);
  tick();
}
