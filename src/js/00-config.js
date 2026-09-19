/* ================= cloud configuration =================
   Paste your Supabase Project URL and anon/publishable key here.
   Never put a Supabase service_role key in this file. */
const SUPABASE_CONFIG = {
  url: 'https://rlnozqxzcjxiupuouqth.supabase.co',
  anonKey: 'sb_publishable_4CjD1hT9sfyvAOJQodGS1g_tg8bqsIY'
};
const SUPABASE_READY = !!(SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey && window.supabase && typeof window.supabase.createClient === 'function');
