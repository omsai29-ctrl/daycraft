/* ================= modal + toast ================= */
const MOD = () => $('#modal');
function openModal(html, o = {}) {
  const m = MOD();
  if (!m.classList.contains('open')) {
    const a = document.activeElement;
    U.lastTrigger = a && a !== document.body ? a : null;
  }
  m.innerHTML = `<div class="scrim" data-a="scrim"></div><div class="sheet ${o.cls || ''}" role="dialog" aria-modal="true" aria-label="${esc(o.label || 'Dialog')}">${html}</div>`;
  m.classList.add('open'); document.body.classList.add('noscroll');
  const f = $(o.focus || 'input:not([type=hidden]):not(.sr),select', m);
  if (f && o.autofocus !== false) setTimeout(() => { try { f.focus(); } catch (e) { /* noop */ } }, 30);
  else setTimeout(() => { const s = $('.sheet', m); if (s) { s.setAttribute('tabindex', '-1'); try { s.focus(); } catch (e) { /* noop */ } } }, 30);
}
function closeModal() {
  const m = MOD();
  /* drop focus and form state first, so a late blur/change can't act on a
     half-removed dialog */
  const a = document.activeElement;
  if (a && m.contains(a)) { try { a.blur(); } catch (e) { /* noop */ } }
  U.form = null;
  m.classList.remove('open'); m.innerHTML = ''; document.body.classList.remove('noscroll');
  const t = U.lastTrigger; U.lastTrigger = null;
  if (t && document.contains(t)) { try { t.focus(); } catch (e) { /* noop */ } }
}
/* keeps Tab inside an open dialog */
function trapFocus(e) {
  const sheet = $('.sheet', MOD()); if (!sheet) return;
  const f = $$('a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),summary,[tabindex]:not([tabindex="-1"])', sheet)
    .filter(el => el.offsetParent !== null || el === document.activeElement);
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}
const modalOpen = () => MOD().classList.contains('open');

function toast(msg, o = {}) {
  const box = $('#toasts');
  const el = document.createElement('div');
  el.className = 'toast ' + (o.cls || ''); el.setAttribute('role', 'status');
  el.innerHTML = `<span class="msg">${esc(msg)}</span>${o.undo ? '<button data-a="toast-undo">Undo</button>' : ''}${o.action ? `<button data-a="toast-act">${esc(o.action.label)}</button>` : ''}`;
  el._undo = o.undo; el._act = o.action;
  box.appendChild(el);
  while (box.children.length > 3) box.removeChild(box.firstChild);
  setTimeout(() => el.remove(), o.ms || 6000);
}

/* Undo restores a whole-store snapshot, so it is only offered for the most
   recent change. A stale toast refuses rather than silently discarding
   everything done since. */
let mutSeq = 0;
function mutate(fn, msg) {
  const snap = JSON.stringify(D);
  fn(); save(); render();
  const at = ++mutSeq;
  if (msg) toast(msg, { undo: () => {
    if (at !== mutSeq) { toast('Too much has changed since then to undo.'); return; }
    D = JSON.parse(snap); mutSeq++; save(); render();
  } });
}

/* ================= quick plans ================= */
function openPlanForm(id){
  const old=id?D.plans.find(p=>p.id===id):null;
  const p=old?clone(old):{id:uid(),title:'',done:false};
  U.form={kind:'plan',id:old?old.id:null};
  openModal('<div class="m-head"><h2>'+ (old?'Edit plan':'Add plan') +'</h2><button class="icon-btn" data-a="close-modal" aria-label="Close">'+ico('x')+'</button></div><div class="m-body"><label class="fld"><span>What do you need to do?</span><input class="input lg" id="plan-title" value="'+esc(p.title)+'" placeholder="e.g. Complete Physics record" autocomplete="off"></label><p class="plan-quick-hint">No date, start time or deadline needed.</p></div><div class="m-foot">'+(old?'<button class="btn btn-danger" data-a="plan-del">Delete</button>':'')+'<span class="grow"></span><button class="btn" data-a="close-modal">Cancel</button><button class="btn btn-primary" data-a="plan-save">'+(old?'Save changes':'Add plan')+'</button></div>',{label:old?'Edit plan':'Add plan',focus:'#plan-title'});
}
/* ================= quick plans ================= */
function openPlanForm(id){
  const old=id?D.plans.find(p=>p.id===id):null;
  const p=old?clone(old):{id:uid(),title:'',done:false};
  U.form={kind:'plan',id:old?old.id:null};
  openModal('<div class="m-head"><h2>'+ (old?'Edit plan':'Add plan') +'</h2><button class="icon-btn" data-a="close-modal" aria-label="Close">'+ico('x')+'</button></div><div class="m-body"><label class="fld"><span>What do you need to do?</span><input class="input lg" id="plan-title" value="'+esc(p.title)+'" placeholder="e.g. Complete Physics record" autocomplete="off"></label><p class="plan-quick-hint">No date, start time or deadline needed.</p></div><div class="m-foot">'+(old?'<button class="btn btn-danger" data-a="plan-del">Delete</button>':'')+'<span class="grow"></span><button class="btn" data-a="close-modal">Cancel</button><button class="btn btn-primary" data-a="plan-save">'+(old?'Save changes':'Add plan')+'</button></div>',{label:old?'Edit plan':'Add plan',focus:'#plan-title'});
}
/* ================= task form ================= */
function newTaskDefaults(o) {
  const s = D.settings, kind = o.kind || 'task';
  return blankTask({
    kind, subjectId: o.subjectId || null, goalId: o.goalId || null, examId: o.examId || null, priority: o.priority || 'medium',
    date: 'date' in o ? o.date : today(), start: o.start != null ? o.start : null,
    duration: o.duration || (kind === 'event' ? 60 : s.defaultDuration), title: o.title || ''
  });
}
function openTaskForm(o = {}) {
  const editing = o.id ? taskOf(o.id) : null;
  const f = editing ? clone(editing) : newTaskDefaults(o);
  if (editing && isRec(editing) && o.d) f._instDate = o.d;
  U.form = {
    f, editing: !!editing, dirty: false, touched: {}, allowOverlap: false, tab: f.kind, raw: f.title, noSplit: false,
    init: { date: f.date, start: f.start, duration: f.duration, priority: f.priority, subjectId: f.subjectId, kind: f.kind, due: f.due, goalId: f.goalId }
  };
  drawTaskForm();
  if (!editing && f.subjectId) autoGoal();
  refreshForm();
}

const DUR_OPTS = [5, 10, 15, 20, 30, 45, 60, 75, 90, 120, 150, 180, 240];
function durSelect(v) {
  const opts = DUR_OPTS.includes(v) ? DUR_OPTS : DUR_OPTS.concat([v]).sort((a, b) => a - b);
  return opts.map(x => `<option value="${x}" ${x === v ? 'selected' : ''}>${fmtDur(x)}</option>`).join('');
}
function drawTaskForm() {
  const F = U.form, f = F.f;
  const kinds = F.editing ? [['task', 'Task'], ['study', 'Study'], ['event', 'Event']] : [['task', 'Task'], ['study', 'Study'], ['event', 'Event'], ['habit', 'Habit'], ['goal', 'Goal']];
  const tabs = `<div class="seg" role="tablist">${kinds.map(([k, l]) => `<button class="${F.tab === k ? 'on' : ''}" data-a="add-tab" data-k="${k}" role="tab">${l}</button>`).join('')}</div>`;
  const ph = f.kind === 'event' ? 'Lunch, Lab session, Meeting…' : f.kind === 'study' ? 'Study Physics tomorrow from 5 to 6 PM' : 'Finish C assignment by Monday';
  const st = toMin(f.start), en = st != null ? fromMin(st + f.duration) : '';
  const hasMore = F.editing && (f.due || isRec(f) || f.notes || (f.subtasks || []).length || f.reminder !== 'default');
  const rec = f.recur || { type: 'none', days: [] };
  const remVal = f.reminder === 'default' ? 'default' : (f.reminder === 'off' ? 'off' : (['10', '30', '60'].includes(String(f.reminder)) ? String(f.reminder) : 'custom'));
  const html = `
    <div class="m-head"><h2>${F.editing ? 'Edit' : 'Add'}</h2>${tabs}<button class="icon-btn" data-a="close-modal" aria-label="Close">${ico('x')}</button></div>
    <div class="m-body">
      <div class="m-title-wrap">
        <input id="f-title" class="input lg" data-f="title" placeholder="${ph}" value="${esc(F.raw)}" autocomplete="off" aria-label="Title">
        <div class="prev" id="f-prev" aria-live="polite"></div>
      </div>
      ${F.editing && isRec(f) ? `<div class="notice" style="margin:0">This repeats. Changes apply to every repeat.</div>` : ''}
      <div class="fgrid">
        <label class="fld"><span>Date</span><input class="input" type="date" data-f="date" value="${f.date || ''}"></label>
        <label class="fld"><span>Start</span><input class="input" type="time" data-f="start" value="${f.start || ''}"></label>
        <label class="fld"><span>End</span><input class="input" type="time" data-f="end" value="${en}" ${st == null ? 'disabled' : ''}></label>
        <label class="fld"><span>Duration</span><select class="select" data-f="duration">${durSelect(f.duration)}</select></label>
      </div>
      <div id="f-conf"></div>
      <div class="fgrid" style="grid-template-columns:repeat(3,minmax(0,1fr))">
        <label class="fld"><span>Subject</span><select class="select" data-f="subject"><option value="">None</option>${D.subjects.map(s => `<option value="${s.id}" ${f.subjectId === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></label>
        <div class="fld"><span>Priority</span><div class="seg">${['high', 'medium', 'low'].map(p => `<button class="${f.priority === p ? 'on' : ''}" data-a="f-prio" data-v="${p}" title="${cap(p)} priority">${cap(p).slice(0, 3)}</button>`).join('')}</div></div>
        <label class="fld"><span>Goal</span><select class="select" data-f="goal" id="f-goal"><option value="">None</option>${D.goals.map(g => `<option value="${g.id}" ${f.goalId === g.id ? 'selected' : ''}>${esc(g.title)}</option>`).join('')}</select></label>
      </div>
      <div id="f-suggest"></div>
      <details class="more" ${hasMore ? 'open' : ''}><summary>More options</summary><div class="inner">
        <div class="frow">
          <label class="fld"><span>Due date</span><input class="input" type="date" data-f="due" value="${f.due || ''}"></label>
          <label class="fld"><span>Repeat</span><select class="select" data-f="repeat">${[['none', 'Does not repeat'], ['daily', 'Daily'], ['weekly', 'Weekly'], ['custom', 'Custom days']].map(([v, l]) => `<option value="${v}" ${rec.type === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        </div>
        <div id="f-days">${daysHtml(rec)}</div>
        <div class="frow">
          <label class="fld"><span>Remind me</span><select class="select" data-f="reminder">${[['default', 'Default (' + (D.settings.reminder === 'off' ? 'none' : D.settings.reminder + ' min') + ')'], ['off', 'No reminder'], ['10', '10 minutes before'], ['30', '30 minutes before'], ['60', '1 hour before'], ['custom', 'Custom…']].map(([v, l]) => `<option value="${v}" ${remVal === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
          <label class="fld" id="f-remc" style="${remVal === 'custom' ? '' : 'display:none'}"><span>Minutes before</span><input class="input" type="number" min="1" max="1440" data-f="remcustom" value="${remVal === 'custom' ? f.reminder : 15}"></label>
        </div>
        <label class="fld"><span>Notes</span><textarea class="textarea" data-f="notes" placeholder="Anything you want to remember">${esc(f.notes)}</textarea></label>
        <div class="fld"><span>Steps</span><div id="f-subs">${subsHtml(f)}</div></div>
      </div></details>
    </div>
    <div class="m-foot">
      ${F.editing ? (isRec(f) && f._instDate ? `<button class="btn btn-danger" data-a="f-skip">Skip this day</button><button class="btn btn-danger" data-a="f-del">Delete series</button>` : `<button class="btn btn-danger" data-a="f-del">Delete</button>`) : ''}
      <span class="grow"></span><button class="btn" data-a="close-modal">Cancel</button><button class="btn btn-primary" data-a="f-save">${F.editing ? 'Save changes' : 'Add'}</button>
    </div>`;
  openModal(html, { label: F.editing ? 'Edit task' : 'Add', focus: '#f-title', autofocus: !F.editing || true });
}
function daysHtml(rec) {
  if (rec.type !== 'custom') return '';
  return `<div class="fld"><span>Repeat on</span><div class="daychips">${DAYS.map((d, i) => `<button class="${(rec.days || []).includes(i) ? 'on' : ''}" data-a="f-day" data-v="${i}" aria-pressed="${(rec.days || []).includes(i)}" aria-label="${d}">${d[0]}</button>`).join('')}</div></div>`;
}
function subsHtml(f) {
  return (f.subtasks || []).map(s => `<div class="sub-edit"><input class="input" data-f="sub" data-sid="${s.id}" value="${esc(s.text)}" aria-label="Step"><button class="icon-btn" data-a="f-subdel" data-sid="${s.id}" aria-label="Remove step">${ico('x')}</button></div>`).join('') +
    `<div class="sub-edit"><input class="input" id="f-subnew" data-enter="f-subadd" placeholder="Add a step and press Enter" aria-label="New step"></div>`;
}

function syncTimeInputs() {
  const F = U.form; if (!F) return;
  const f = F.f, m = MOD();
  const set = (sel, v) => { const el = $(sel, m); if (el && el.value !== v) el.value = v; };
  set('[data-f=date]', f.date || '');
  set('[data-f=start]', f.start || '');
  const st = toMin(f.start);
  const end = $('[data-f=end]', m);
  if (end) { end.disabled = st == null; end.value = st != null ? fromMin(st + f.duration) : ''; }
  const du = $('[data-f=duration]', m);
  if (du) { du.innerHTML = durSelect(f.duration); du.value = String(f.duration); }
  set('[data-f=due]', f.due || '');
  const sb = $('[data-f=subject]', m); if (sb) sb.value = f.subjectId || '';
  const gl = $('[data-f=goal]', m); if (gl) gl.value = f.goalId || '';
  $$('[data-a=f-prio]', m).forEach(b => b.classList.toggle('on', b.dataset.v === f.priority));
  $$('[data-a=add-tab]', m).forEach(b => b.classList.toggle('on', b.dataset.k === F.tab));
}

function refreshForm() {
  const F = U.form; if (!F || !$('#f-conf')) return;
  const f = F.f;
  /* preview */
  const pv = $('#f-prev');
  if (!F.editing && F.parsed && F.parsed.found && (f.title || F.raw)) {
    const st = toMin(f.start), p = F.parsed, chips = [];
    const chip = (cls, text, extra = '') => `<span class="pc ${cls}" ${extra}>${esc(text)}</span>`;
    if (p.date || p.start != null) chips.push(chip('date', relLabel(f.date)));
    if (st != null) chips.push(chip('time', fmtRange(st, st + f.duration)));
    else if (p.duration) chips.push(chip('time', fmtDur(p.duration)));
    if (p.due) chips.push(chip('due', dueLabel(p.due)));
    if (p.subjectId) {
      const sb = subjOf(p.subjectId);
      if (sb) chips.push(`<span class="pc subj"><i class="dot" style="background:${sb.color}"></i>${esc(sb.name)}</span>`);
    }
    if (p.priority && p.priority !== 'medium') chips.push(chip('prio', cap(p.priority) + ' priority'));
    pv.innerHTML = chips.join('');
  } else pv.innerHTML = '';
  /* conflict */
  const box = $('#f-conf');
  const st = toMin(f.start);
  const c = f.date && st != null && !(F.allowOverlap) && f.kind !== 'habit' ? conflictFor(f.date, st, f.duration, F.editing ? f.id : null) : null;
  F.conflict = c;
  if (c) {
    const slot = freeSlot(f.date, f.duration, st, F.editing ? f.id : null);
    F.slot = slot;
    box.innerHTML = `<div class="warn" role="alert">${ico('alert')}<div><b>You already have ${esc(c.t.title)} from ${fmtRange(c.start, c.end)}.</b><div class="wa">${slot != null ? `<button class="btn btn-sm" data-a="f-resched">Reschedule to ${fmtT(slot)}</button>` : ''}<button class="link" data-a="f-overlap">Keep both</button></div></div></div>`;
  } else box.innerHTML = '';
  /* smart suggestion */
  const sg = $('#f-suggest');
  if (!F.noSplit && needsBreakdown(f, F.editing)) {
    const steps = stepsFor(f);
    sg.innerHTML = `<div class="suggest"><b>Break this into smaller steps?</b><ul>${steps.map(x => `<li>${esc(x)}</li>`).join('')}</ul><div class="wa"><button class="btn btn-sm" data-a="f-split">Add as steps</button><button class="link" data-a="f-nosplit">Not now</button></div></div>`;
  } else sg.innerHTML = '';
  /* goal hint */
  const gl = $('#f-goal'); if (gl) gl.value = f.goalId || '';
}

function autoGoal() {
  const F = U.form; if (!F || F.touched.goal) return;
  const f = F.f;
  if (F.editing && f.goalId) return;
  const open = D.goals.filter(g => goalStats(g).pct < 100);
  const words = (f.title || '').toLowerCase().match(/[a-z]{4,}/g) || [];
  let pick = open.find(g => words.some(w => g.title.toLowerCase().includes(w)) && (!f.subjectId || g.subjectId === f.subjectId));
  if (!pick && f.subjectId) { const same = open.filter(g => g.subjectId === f.subjectId); if (same.length === 1) pick = same[0]; }
  f.goalId = pick ? pick.id : (F.init.goalId || null);
}

function applyParse() {
  const F = U.form, f = F.f, tc = F.touched;
  const p = parseQuick(F.raw);
  F.parsed = p;
  if (!tc.date) f.date = p.date || F.init.date;
  if (!tc.due) f.due = p.due || F.init.due;
  if (!tc.start) f.start = p.start != null ? fromMin(p.start) : F.init.start;
  if (!tc.duration) f.duration = p.duration || (f.kind === 'event' ? 60 : F.init.duration);
  if (!tc.priority) f.priority = p.priority || F.init.priority;
  if (!tc.subject) f.subjectId = p.subjectId || F.init.subjectId;
  if (!tc.kind) { const k = p.kind || F.init.kind; f.kind = k; F.tab = k; }
  f.title = p.title || F.raw;
  autoGoal();
  syncTimeInputs();
  const ti = $('#f-title'); if (ti) ti.placeholder = f.kind === 'event' ? 'Lunch, Lab session, Meeting…' : f.kind === 'study' ? 'Study Physics tomorrow from 5 to 6 PM' : 'Finish C assignment by Monday';
}

function onFormField(name, el) {
  const F = U.form; if (!F || F.tab === 'habit' || F.tab === 'goal') return;
  const f = F.f; F.dirty = true; F.allowOverlap = false;
  switch (name) {
    case 'title':
      F.raw = el.value; f.title = el.value;
      if (!F.editing) applyParse(); else { autoGoal(); }
      break;
    case 'date': F.touched.date = true; f.date = el.value || null; if (!f.date) f.start = null; if (f.recur && f.recur.type === 'weekly') f.recur.days = []; break;
    case 'start':
      F.touched.start = true; f.start = el.value || null; if (f.start && !f.date) f.date = today();
      break;
    case 'end': {
      const st = toMin(f.start), en = toMin(el.value);
      if (st != null && en != null && en > st) { f.duration = en - st; F.touched.duration = true; }
      break;
    }
    case 'duration': F.touched.duration = true; f.duration = +el.value || f.duration; break;
    case 'due': F.touched.due = true; f.due = el.value || null; break;
    case 'subject': F.touched.subject = true; f.subjectId = el.value || null; autoGoal(); break;
    case 'goal': F.touched.goal = true; f.goalId = el.value || null; break;
    case 'repeat':
      f.recur = { type: el.value, days: el.value === 'custom' ? [f.date ? wdOf(f.date) : 0] : [] };
      $('#f-days').innerHTML = daysHtml(f.recur); break;
    case 'reminder': {
      $('#f-remc').style.display = el.value === 'custom' ? '' : 'none';
      f.reminder = el.value === 'custom' ? (+($('[data-f=remcustom]').value) || 15) : (el.value === 'default' || el.value === 'off' ? el.value : +el.value);
      break;
    }
    case 'remcustom': f.reminder = Math.max(1, +el.value || 15); break;
    case 'notes': f.notes = el.value; break;
    case 'sub': { const s = f.subtasks.find(x => x.id === el.dataset.sid); if (s) s.text = el.value; return; }
  }
  if (name !== 'title') syncTimeInputs();
  refreshForm();
}

function saveTaskForm() {
  const F = U.form, f = F.f;
  const title = (f.title || F.raw || '').trim();
  if (!title) {
    const ti = $('#f-title'); ti.focus(); ti.style.outline = '2px solid var(--red)';
    toast('Give it a name first.'); return;
  }
  f.title = title;
  if (f.subtasks) f.subtasks = f.subtasks.filter(s => s.text.trim());
  const c = f.date && f.start && !F.allowOverlap ? conflictFor(f.date, toMin(f.start), f.duration, F.editing ? f.id : null) : null;
  if (c) { const w = $('.warn'); if (w) { w.classList.remove('flash'); void w.offsetWidth; w.classList.add('flash'); } return; }
  if (!f.date) f.start = null;
  const clean = clone(f); delete clean._instDate;
  const editing = F.editing;
  closeModal();
  if (editing) mutate(() => { const t = taskOf(clean.id); if (t) Object.assign(t, clean); });
  else mutate(() => { D.tasks.push(clean); }, 'Added "' + clean.title + '"' + (clean.date ? ' — ' + relLabel(clean.date) + (clean.start ? ', ' + fmtT(toMin(clean.start)) : '') : ''));
}

/* ================= other forms ================= */
function openAdd(o = {}) {
  const kind = o.kind || 'task';
  if (kind === 'habit') return openHabitForm();
  if (kind === 'goal') return openGoalForm({});
  openTaskForm(o);
}
function switchAddTab(k) {
  const F = U.form;
  if (k === 'habit' || k === 'goal') {
    const carry = F ? F.raw : '';
    if (k === 'habit') openHabitForm({ name: carry }, true); else openGoalForm({ title: carry }, true);
    return;
  }
  if (!F || !F.f) { openTaskForm({ kind: k }); return; }
  F.tab = k; F.touched.kind = true; F.f.kind = k; F.init.kind = k;
  if (k === 'event' && !F.touched.duration) { F.f.duration = 60; F.init.duration = 60; }
  syncTimeInputs(); refreshForm();
  const ti = $('#f-title'); if (ti) ti.placeholder = k === 'event' ? 'Lunch, Lab session, Meeting…' : k === 'study' ? 'Study Physics tomorrow from 5 to 6 PM' : 'Finish C assignment by Monday';
}
function miniTabs(cur) {
  return `<div class="seg" role="tablist">${[['task', 'Task'], ['study', 'Study'], ['event', 'Event'], ['habit', 'Habit'], ['goal', 'Goal']].map(([k, l]) => `<button class="${cur === k ? 'on' : ''}" data-a="add-tab" data-k="${k}">${l}</button>`).join('')}</div>`;
}

function openHabitForm(o = {}, fromTab) {
  const editing = o.id ? D.habits.find(h => h.id === o.id) : null;
  U.form = { kind: 'habit', tab: 'habit', id: editing ? editing.id : null };
  openModal(`<div class="m-head"><h2>${editing ? 'Edit habit' : 'Add'}</h2>${editing ? '' : miniTabs('habit')}<button class="icon-btn" data-a="close-modal" aria-label="Close">${ico('x')}</button></div>
    <div class="m-body"><label class="fld"><span>Habit</span><input class="input lg" id="hb-name" data-enter="hb-save" placeholder="Exercise, Read, Sleep on time…" value="${esc(editing ? editing.name : (o.name || ''))}"></label>
    <p class="muted">Each habit gets a simple daily check-off. No streak pressure, just a record.</p></div>
    <div class="m-foot">${editing ? `<button class="btn btn-danger" data-a="hb-del">Delete</button>` : ''}<span class="grow"></span><button class="btn" data-a="close-modal">Cancel</button><button class="btn btn-primary" data-a="hb-save">${editing ? 'Save' : 'Add habit'}</button></div>`, { label: 'Habit', focus: '#hb-name' });
}
function openGoalForm(o = {}, fromTab) {
  const editing = o.id ? goalOf(o.id) : null;
  const g = editing ? clone(editing) : { id: uid(), title: o.title || '', deadline: '', subjectId: null, milestones: [] };
  U.form = { kind: 'goal', tab: 'goal', g, editing: !!editing };
  openModal(`<div class="m-head"><h2>${editing ? 'Edit goal' : 'Add'}</h2>${editing ? '' : miniTabs('goal')}<button class="icon-btn" data-a="close-modal" aria-label="Close">${ico('x')}</button></div>
    <div class="m-body">
      <label class="fld"><span>Goal</span><input class="input lg" id="g-title" data-gf="title" placeholder="Finish C programming unit" value="${esc(g.title)}"></label>
      <div class="frow"><label class="fld"><span>Deadline</span><input class="input" type="date" data-gf="deadline" value="${g.deadline || ''}"></label>
      <label class="fld"><span>Subject</span><select class="select" data-gf="subjectId"><option value="">None</option>${D.subjects.map(s => `<option value="${s.id}" ${g.subjectId === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></label></div>
      <div class="fld"><span>Milestones</span><div id="g-ms">${msEditHtml(g)}</div></div>
      <p class="muted">Tasks you link to this goal count toward its progress automatically.</p>
    </div>
    <div class="m-foot">${editing ? `<button class="btn btn-danger" data-a="g-del">Delete</button>` : ''}<span class="grow"></span><button class="btn" data-a="close-modal">Cancel</button><button class="btn btn-primary" data-a="g-save">${editing ? 'Save' : 'Add goal'}</button></div>`, { label: 'Goal', focus: '#g-title' });
}
function msEditHtml(g) {
  return g.milestones.map(m => `<div class="sub-edit"><input class="input" data-gf="ms" data-mid="${m.id}" value="${esc(m.text)}" aria-label="Milestone"><button class="icon-btn" data-a="g-msdel" data-mid="${m.id}" aria-label="Remove">${ico('x')}</button></div>`).join('') +
    `<div class="sub-edit"><input class="input" id="g-msnew" data-enter="g-msadd" placeholder="Add a milestone and press Enter" aria-label="New milestone"></div>`;
}
function openSubjectForm(id) {
  const s = id ? subjOf(id) : null;
  U.form = { kind: 'subject', id, color: s ? s.color : SUBJECT_COLORS[D.subjects.length % SUBJECT_COLORS.length] };
  openModal(`<div class="m-head"><h2>${s ? 'Edit subject' : 'New subject'}</h2><button class="icon-btn" data-a="close-modal" aria-label="Close">${ico('x')}</button></div>
    <div class="m-body"><label class="fld"><span>Name</span><input class="input lg" id="sb-name" data-enter="sb-save" value="${esc(s ? s.name : '')}" placeholder="Physics"></label>
    <div class="fld"><span>Colour</span><div class="swatches" id="sb-sw">${SUBJECT_COLORS.map(c => `<button style="background:${c}" class="${c === U.form.color ? 'on' : ''}" data-a="sb-color" data-c="${c}" aria-label="Colour ${c}"></button>`).join('')}</div></div></div>
    <div class="m-foot">${s ? `<button class="btn btn-danger" data-a="sb-del">Delete</button>` : ''}<span class="grow"></span><button class="btn" data-a="close-modal">Cancel</button><button class="btn btn-primary" data-a="sb-save">${s ? 'Save' : 'Add subject'}</button></div>`, { cls: 'sm', label: 'Subject', focus: '#sb-name' });
}
function openExamForm(id) {
  const e = id ? D.exams.find(x => x.id === id) : null;
  U.form = { kind: 'exam', id };
  openModal(`<div class="m-head"><h2>${e ? 'Edit exam' : 'New exam'}</h2><button class="icon-btn" data-a="close-modal" aria-label="Close">${ico('x')}</button></div>
    <div class="m-body"><label class="fld"><span>Exam</span><input class="input lg" id="ex-title" placeholder="Physics Mid-Sem" value="${esc(e ? e.title : '')}"></label>
    <div class="frow"><label class="fld"><span>Date</span><input class="input" type="date" id="ex-date" value="${e ? e.date : ''}"></label>
    <label class="fld"><span>Subject</span><select class="select" id="ex-subj"><option value="">None</option>${D.subjects.map(s => `<option value="${s.id}" ${e && e.subjectId === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></label></div>
    ${e ? '' : `<label class="fld"><span>Topics (one per line)</span><textarea class="textarea" id="ex-topics" placeholder="Units&#10;Waves&#10;Optics"></textarea></label>`}</div>
    <div class="m-foot">${e ? `<button class="btn btn-danger" data-a="ex-del">Delete</button>` : ''}<span class="grow"></span><button class="btn" data-a="close-modal">Cancel</button><button class="btn btn-primary" data-a="ex-save">${e ? 'Save' : 'Add exam'}</button></div>`, { label: 'Exam', focus: '#ex-title' });
}

/* ================= reschedule + pickers ================= */
function itemLabel(items) {
  if (items.length !== 1) return items.length + ' tasks';
  const t = taskOf(items[0].id); return t ? t.title : '';
}
function openReschedule(items) {
  const td = today(), one = items.length === 1 ? taskOf(items[0].id) : null;
  const st = one ? toMin(one.start) : null, dur = one ? (one.duration || D.settings.defaultDuration) : 0;
  const later = one ? freeSlot(td, dur, Math.max(nowMin() + 5, st != null && one.date === td ? nowMin() + 5 : 0), one.id) : null;
  U.form = { kind: 'resched', items };
  openModal(`<div class="m-head"><h2>Reschedule</h2><button class="icon-btn" data-a="close-modal" aria-label="Close">${ico('x')}</button></div>
    <div class="m-body"><p class="muted">${esc(itemLabel(items))}</p><div class="opts">
      ${one && later != null ? `<button class="opt" data-a="rs" data-w="later">Later today <small>${fmtT(later)}</small></button>` : ''}
      <button class="opt" data-a="rs" data-w="tomorrow">Tomorrow <small>${one && st != null ? 'around ' + fmtT(st) : 'no set time'}</small></button>
      <div class="frow" style="align-items:end"><label class="fld"><span>Another day</span><input class="input" type="date" id="rs-date" value="${addDays(td, 2)}" min="${td}"></label>
        <label class="fld"><span>Time (optional)</span><input class="input" type="time" id="rs-time" value="${one && st != null ? one.start : ''}"></label></div>
      <button class="btn" data-a="rs" data-w="pick">Move to that day</button>
      <button class="opt" data-a="rs" data-w="none">Keep unscheduled <small>Take it off the calendar</small></button>
    </div></div>`, { cls: 'sm', label: 'Reschedule', autofocus: false });
}
function openDatePick(items) {
  U.form = { kind: 'resched', items };
  openModal(`<div class="m-head"><h2>Choose another date</h2><button class="icon-btn" data-a="close-modal" aria-label="Close">${ico('x')}</button></div>
    <div class="m-body"><p class="muted">${esc(itemLabel(items))}</p><label class="fld"><span>Move to</span><input class="input" type="date" id="rs-date" value="${addDays(today(), 1)}" min="${today()}"></label></div>
    <div class="m-foot"><span class="grow"></span><button class="btn" data-a="close-modal">Cancel</button><button class="btn btn-primary" data-a="rs" data-w="pickdate">Move</button></div>`, { cls: 'sm', label: 'Choose date', focus: '#rs-date' });
}
function doReschedule(w) {
  const F = U.form; if (!F || F.kind !== 'resched') return;
  const items = F.items, td = today();
  const dateEl = $('#rs-date'), timeEl = $('#rs-time');
  closeModal();
  if (w === 'later') { const t = taskOf(items[0].id); const slot = freeSlot(td, t.duration || D.settings.defaultDuration, nowMin() + 5, t.id); mutate(() => moveItems(items, td, slot), 'Moved to ' + fmtT(slot)); }
  else if (w === 'tomorrow') mutate(() => moveItems(items, addDays(td, 1)), 'Moved to tomorrow');
  else if (w === 'none') mutate(() => moveItems(items, null), 'Taken off the calendar');
  else if (w === 'pick' || w === 'pickdate') {
    const d = dateEl && dateEl.value; if (!d) return;
    const tm = timeEl && timeEl.value ? toMin(timeEl.value) : (w === 'pickdate' ? undefined : null);
    mutate(() => moveItems(items, d, tm), 'Moved to ' + relLabel(d));
  }
}
function carry(scope, to) {
  const td = today();
  const items = scope === 'overdue' ? overdueList().map(i => ({ id: i.id, d: i.d })) : dayInst(td).filter(i => i.kind !== 'event' && !i.done).map(i => ({ id: i.id, d: i.d }));
  if (!items.length) return;
  if (to === 'pick') return openDatePick(items);
  const n = items.length, word = n === 1 ? 'task' : 'tasks';
  if (to === 'today') mutate(() => moveItems(items, td, null), n + ' ' + word + ' moved to today');
  else if (to === 'tomorrow') mutate(() => moveItems(items, addDays(td, 1)), n + ' ' + word + ' moved to tomorrow');
  else mutate(() => moveItems(items, null), n + ' ' + word + ' kept unscheduled');
}

function openPlanDay() {
  const plan = planMyDay();
  U.form = { kind: 'plan', plan };
  if (!plan.length) {
    openModal(`<div class="m-head"><h2>Plan my day</h2><button class="icon-btn" data-a="close-modal" aria-label="Close">${ico('x')}</button></div>
      <div class="m-body"><p>Nothing is waiting to be scheduled, and the rest of today is open.</p></div>
      <div class="m-foot"><span class="grow"></span><button class="btn" data-a="close-modal">Close</button><button class="btn btn-primary" data-a="add">Add a task</button></div>`, { cls: 'sm', autofocus: false });
    return;
  }
  openModal(`<div class="m-head"><h2>Plan my day</h2><button class="icon-btn" data-a="close-modal" aria-label="Close">${ico('x')}</button></div>
    <div class="m-body"><p class="muted">A light plan for the rest of today. Short gaps are left between blocks.</p>
    <ul class="plan-list">${plan.map(p => `<li><span class="pt">${fmtRange(p.start, p.start + p.dur)}</span><span>${esc(p.title)}</span></li>`).join('')}</ul></div>
    <div class="m-foot"><span class="grow"></span><button class="btn" data-a="close-modal">Not now</button><button class="btn btn-primary" data-a="plan-apply">Apply plan</button></div>`, { cls: 'sm', autofocus: false });
}

function openMore() {
  U.form = { kind: 'more' };
  const items = [['plans', 'Plans'], ['timetable', 'Timetable'], ['focus', 'Focus'], ['subjects', 'Subjects'], ['goals', 'Goals'], ['habits', 'Habits'], ['exams', 'Exams'], ['review', 'Review'], ['settings', 'Settings']];
  openModal(`<div class="m-head"><h2>More</h2><button class="icon-btn" data-a="close-modal" aria-label="Close">${ico('x')}</button></div>
    <div class="m-body more-list">${items.map(([p, l]) => `<button data-a="nav" data-p="${p}">${ico(p)}${l}</button>`).join('')}</div>`, { cls: 'sm', autofocus: false });
}
