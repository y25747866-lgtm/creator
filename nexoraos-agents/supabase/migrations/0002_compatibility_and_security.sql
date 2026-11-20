-- Additive compatibility migration for existing NexoraOS Supabase projects.
-- Review and back up the database before applying. Does not drop or overwrite existing rows.
create extension if not exists vector;

-- Existing installations may have earlier, narrower versions of these tables.
alter table if exists public.agent_tasks add column if not exists parent_task_id uuid;
alter table if exists public.agent_tasks add column if not exists input jsonb;
alter table if exists public.agent_tasks add column if not exists output jsonb;
alter table if exists public.agent_tasks add column if not exists updated_at timestamptz not null default now();
alter table if exists public.agent_events add column if not exists payload jsonb;
alter table if exists public.agent_events add column if not exists type text;
alter table if exists public.agent_events add column if not exists task_id uuid;

create table if not exists public.brand_profiles (
  user_id uuid primary key,
  profile jsonb not null default '{}'::jsonb,
  roadmap jsonb,
  progress jsonb not null default '[]'::jsonb,
  status text not null default 'discovering' check (status in ('discovering','ready')),
  last_daily_run date,
  updated_at timestamptz not null default now()
);

create table if not exists public.approvals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  platform text not null,
  action text not null default 'publish',
  status text not null default 'pending' check (status in ('pending','approved','denied')),
  payload jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.platform_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  platform text not null,
  handle text not null default '',
  status text not null default 'active',
  scopes text[] not null default '{}',
  credentials jsonb not null default '{}'::jsonb,
  auto_approve boolean not null default false,
  connected_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.platform_connections add column if not exists handle text not null default '';
alter table public.platform_connections add column if not exists scopes text[] not null default '{}';
alter table public.platform_connections add column if not exists credentials jsonb not null default '{}'::jsonb;
alter table public.platform_connections add column if not exists auto_approve boolean not null default false;
alter table public.platform_connections add column if not exists updated_at timestamptz not null default now();
create unique index if not exists platform_connections_user_platform_uidx on public.platform_connections(user_id, platform);
create index if not exists agent_tasks_queued_idx on public.agent_tasks(agent, status);
create index if not exists agent_tasks_user_idx on public.agent_tasks(user_id);
create index if not exists approvals_user_status_idx on public.approvals(user_id, status);

-- Ensure Realtime is configured where supported. Ignore duplicate publication membership.
do $$ begin
  alter publication supabase_realtime add table public.agent_tasks;
exception when duplicate_object then null;
when undefined_object then raise notice 'supabase_realtime publication is not present; enable Realtime for agent_tasks manually';
end $$;

alter table public.agent_tasks enable row level security;
alter table public.brand_profiles enable row level security;
alter table public.platform_connections enable row level security;
alter table public.approvals enable row level security;

do $$ begin
  create policy nexora_own_tasks_select on public.agent_tasks for select using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy nexora_own_brand_profiles on public.brand_profiles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy nexora_own_connections_select on public.platform_connections for select using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy nexora_own_approvals on public.approvals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- Important: server-side service-role access bypasses RLS. Never expose that key to a client.
