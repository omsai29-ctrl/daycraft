# My Planner

A plain HTML/CSS/JavaScript planner that can be installed as a PWA on your phone and laptop, with optional free cloud sync using Supabase.

## What this version adds

- Installable PWA on Android/Windows/macOS/iOS (browser support varies)
- Offline/localStorage support remains intact
- Optional Supabase email/password authentication
- Optional Google sign-in
- Private per-user cloud backup and cross-device sync
- Automatic sync after changes and periodic pull from the cloud
- Export/import backup remains available

## 1. Create a free Supabase project

Create a project at https://supabase.com/.

In **SQL Editor**, run:

```sql
create table if not exists public.planner_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  updated_at bigint not null default 0,
  payload text not null
);

alter table public.planner_data enable row level security;

drop policy if exists "planner_data_select_own" on public.planner_data;
drop policy if exists "planner_data_insert_own" on public.planner_data;
drop policy if exists "planner_data_update_own" on public.planner_data;
drop policy if exists "planner_data_delete_own" on public.planner_data;

create policy "planner_data_select_own" on public.planner_data
  for select using (auth.uid() = user_id);
create policy "planner_data_insert_own" on public.planner_data
  for insert with check (auth.uid() = user_id);
create policy "planner_data_update_own" on public.planner_data
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "planner_data_delete_own" on public.planner_data
  for delete using (auth.uid() = user_id);
```

For a free personal planner, this single-row-per-user design is intentionally simple.

## 2. Add your Supabase public credentials

Open:

`src/js/00-config.js`

Set:

```js
const SUPABASE_CONFIG = {
  url: 'https://YOUR-PROJECT.supabase.co',
  anonKey: 'YOUR-PUBLISHABLE-OR-ANON-KEY'
};
```

Use the project's **public anon/publishable key**. Never put a `service_role` key in a browser app.

You can find these in Supabase Project Settings → API.

## 3. Authentication

Email/password works with Supabase Auth.

If you want the Google button to work too, enable Google under Supabase → Authentication → Providers and add your deployed app URL to the allowed redirect URLs. If you don't configure Google, email/password still works.

## 4. Build the app

From the project folder:

```bash
python build.py
```

The deployable app is the **whole `dist/` folder**.

## 5. Free hosting

Use any HTTPS static host that has a free tier. GitHub Pages is a straightforward option for a personal project.

After deploying, open the HTTPS site on your laptop and phone and install it as an app.

### Android
Chrome → menu → **Install app** / **Add to Home screen**.

### Windows / desktop Chrome or Edge
Use the browser's **Install** option in the address bar/menu.

### iPhone
Safari → Share → **Add to Home Screen**.

## 6. Cross-device use

1. Open the deployed app on your laptop.
2. Go to Settings → Sync → Sign in.
3. Create/sign into the same account on your phone.
4. Your planner data will sync through Supabase.
5. Changes are cached locally and pushed to the cloud when connected.

If two devices edit at nearly the same time, this version uses a simple last-write-wins timestamp strategy. Export a backup before major changes if the data is important.

## Important

The app works locally without Supabase. Without signing in, each device has its own local copy.

The Supabase free tier is sufficient for a normal personal planner, but it is still subject to Supabase's current free-plan limits.
