/* ================= free cross-device sync =================
   Uses Supabase Auth + one row per user in planner_data.
   LocalStorage remains the offline/local cache. Cloud sync is optional. */
const AUTH = { client: null, user: null, ready: false };
const SYNC = { state: 'off', lastAt: 0, pushing: false, dirty: false, timer: null, pull: false, poll: null };

function syncLabel() {
  return {
    off: 'Saved on this device only',
    signin: 'Sign in to sync across devices',
    connecting: 'Connecting…',
    synced: 'Synced across your devices',
    syncing: 'Syncing…',
    error: 'Sync paused. Will retry.'
  }[SYNC.state] || 'Saved on this device only';
}
function setSync(s) {
  SYNC.state = s;
  $$('[data-sync]').forEach(el => { el.textContent = syncLabel(); });
  $$('[data-auth-user]').forEach(el => { el.textContent = AUTH.user ? (AUTH.user.email || 'Signed in') : 'Not signed in'; });
}
function authReady() { return !!(AUTH.client && AUTH.user); }

function openAuthModal() {
  if (!AUTH.client) {
    toast('Add your Supabase URL and anon key in src/js/00-config.js first.');
    return;
  }
  U.form = { kind: 'auth' };
  openModal(`<div class="m-head"><h2>Sync your planner</h2><button class="icon-btn" data-a="close-modal" aria-label="Close">${ico('x')}</button></div>
    <div class="m-body auth-body">
      <p class="set-note">Use the same account on your phone and laptop. Your planner data stays private to your account.</p>
      <label class="field"><span>Email</span><input class="input" id="auth-email" type="email" autocomplete="email" placeholder="you@example.com"></label>
      <label class="field"><span>Password</span><input class="input" id="auth-password" type="password" autocomplete="current-password" placeholder="At least 6 characters"></label>
      <div class="chips"><button class="btn btn-primary" data-a="auth-signin">Sign in</button><button class="btn" data-a="auth-signup">Create account</button></div>
      <div class="auth-divider"><span>or</span></div>
      <button class="btn btn-google" data-a="auth-google">Continue with Google</button>
    </div>`, { cls: 'sm', autofocus: false });
  setTimeout(() => $('#auth-email')?.focus(), 30);
}

async function authEmail(kind) {
  const email = ($('#auth-email')?.value || '').trim();
  const password = $('#auth-password')?.value || '';
  if (!email || password.length < 6) { toast('Enter an email and a password of at least 6 characters.'); return; }
  try {
    const res = kind === 'signup'
      ? await AUTH.client.auth.signUp({ email, password })
      : await AUTH.client.auth.signInWithPassword({ email, password });
    if (res.error) throw res.error;
    closeModal();
    if (kind === 'signup' && !res.data.session) toast('Account created. Check your email to confirm, then sign in.');
    else toast('Signed in. Syncing your planner…');
  } catch (e) { toast(e.message || 'Authentication failed.'); }
}

async function signInGoogle() {
  try {
    const { error } = await AUTH.client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.href.split('#')[0] } });
    if (error) throw error;
  } catch (e) { toast(e.message || 'Google sign-in could not start.'); }
}

async function signOutPlanner() {
  if (!AUTH.client) return;
  try { await AUTH.client.auth.signOut(); toast('Signed out. This device still keeps its local copy.'); }
  catch (e) { toast(e.message || 'Could not sign out.'); }
}

async function initSync() {
  if (!SUPABASE_READY) { setSync('off'); return; }
  try {
    setSync('connecting');
    AUTH.client = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    const { data, error } = await AUTH.client.auth.getSession();
    if (error) throw error;
    AUTH.user = data.session?.user || null;
    AUTH.ready = true;
    AUTH.client.auth.onAuthStateChange((_event, session) => {
      AUTH.user = session?.user || null;
      if (AUTH.user) reconcile();
      else { clearInterval(SYNC.poll); SYNC.poll = null; setSync('signin'); if (U.page === 'settings') render(); }
      if (U.page === 'settings') render();
    });
    if (!AUTH.user) { setSync('signin'); return; }
    await reconcile();
    clearInterval(SYNC.poll);
    SYNC.poll = setInterval(() => { if (authReady() && !document.hidden) doPull(); }, 5000);
  } catch (e) {
    console.error(e); AUTH.client = null; AUTH.user = null; setSync('error');
  }
}

async function reconcile() {
  if (!authReady()) { setSync('signin'); return; }
  try {
    setSync('connecting');
    const { data: remote, error } = await AUTH.client.from('planner_data').select('updated_at,payload').eq('user_id', AUTH.user.id).maybeSingle();
    if (error) throw error;
    const remoteAt = remote?.updated_at || 0;
    if (remote && remoteAt > (D.updatedAt || 0)) await pull(remote);
    else if (!remote || remoteAt < (D.updatedAt || 0)) await push();
    else SYNC.lastAt = remoteAt;
    setSync('synced');
  } catch (e) {
    console.error(e); setSync('error');
    toast('Cloud sync is not ready. Check your Supabase setup.');
  }
}

function attendanceHasData(a) {
  return !!(a && typeof a === 'object' && !Array.isArray(a) &&
    Object.values(a).some(x => Number(x?.total || 0) > 0 || Number(x?.present || 0) > 0));
}
async function pull(remote) {
  const o = JSON.parse(remote.payload || '{}');
  if (!o || !Array.isArray(o.tasks)) throw new Error('Invalid cloud data');
  const localAttachments = (D.notes || []).map(n => ({ id: n.id, attachments: clone(n.attachments || []) }));
  const localAttendance = clone(D.attendance || {});
  D = migrate(o);
  /*
   * Older cloud rows may contain an empty 0/0 attendance object from before
   * attendance was restored. Never let that legacy empty object erase real
   * attendance already stored on this device.
   */
  if (!attendanceHasData(D.attendance) && attendanceHasData(localAttendance)) {
    D.attendance = localAttendance;
    save();
  }
  D.notes = (D.notes || []).map(n => { const x = localAttachments.find(a => a.id === n.id); return x && x.attachments.length ? Object.assign({}, n, { attachments: x.attachments }) : n; });
  D.updatedAt = D.updatedAt || remote.updated_at || Date.now();
  SYNC.lastAt = remote.updated_at || D.updatedAt;
  try { store && store.setItem(KEY, JSON.stringify(D)); } catch (e) { /* ignore */ }
  render();
}

async function doPull() {
  if (!authReady() || SYNC.pushing) return;
  try {
    const { data: remote, error } = await AUTH.client.from('planner_data').select('updated_at,payload').eq('user_id', AUTH.user.id).maybeSingle();
    if (error) throw error;
    if (remote && (remote.updated_at || 0) > (D.updatedAt || 0)) { await pull(remote); toast('Updated from another device.'); }
    setSync('synced');
  } catch (e) { console.error(e); setSync('error'); }
}

function cloudSnapshot(){
  const o = clone(D);
  o.notes = (o.notes || []).map(n => {
    const x = Object.assign({}, n);
    delete x.attachments;
    return x;
  });
  return o;
}
function mergeLocalNoteAttachments(remoteNotes){
  const local = {};
  (D.notes || []).forEach(n => { if (n.attachments && n.attachments.length) local[n.id] = clone(n.attachments); });
  return (remoteNotes || []).map(n => local[n.id] ? Object.assign({}, n, { attachments: local[n.id] }) : n);
}

function schedulePush() {
  if (!authReady()) return;
  clearTimeout(SYNC.timer);
  SYNC.timer = setTimeout(push, 1000);
  setSync('syncing');
}

async function push() {
  if (!authReady()) return;
  if (SYNC.pushing) { SYNC.dirty = true; return; }
  SYNC.pushing = true; setSync('syncing');
  try {
    do {
      SYNC.dirty = false;
      const at = Math.max(Date.now(), (D.updatedAt || 0) + 1);
      D.updatedAt = at;
      try { store && store.setItem(KEY, JSON.stringify(D)); } catch (e) { /* ignore */ }
      const { error } = await AUTH.client.from('planner_data').upsert({
        user_id: AUTH.user.id,
        updated_at: at,
        payload: JSON.stringify(cloudSnapshot())
      }, { onConflict: 'user_id' });
      if (error) throw error;
      SYNC.lastAt = at;
    } while (SYNC.dirty);
    setSync('synced');
  } catch (e) {
    console.error(e); setSync('error');
    clearTimeout(SYNC.timer); SYNC.timer = setTimeout(push, 15000);
  } finally { SYNC.pushing = false; }
}
