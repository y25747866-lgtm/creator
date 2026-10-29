-- NexoraOS initial schema. Apply in Supabase SQL editor. Service-role key bypasses RLS.
create extension if not exists vector;

create table if not exists agent_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  goal text not null,
  agent text not null check (agent in ('nexus','scout','flux','apex','forge')),
  status text not null default 'queued',
  input jsonb, output jsonb,
  parent_task_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists agent_tasks_queued_idx on agent_tasks (agent, status);
create index if not exists agent_tasks_user_idx on agent_tasks (user_id);

create table if not exists agent_events (
  event_id uuid primary key, agent_id text not null, task_id uuid not null,
  type text not null, payload jsonb, created_at timestamptz not null default now()
);
create index if not exists agent_events_task_idx on agent_events (task_id);

create table if not exists agent_sessions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null, agent_id text not null,
  messages jsonb not null default '[]', status text not null default 'active',
  idle_expires_at timestamptz not null, created_at timestamptz not null default now(),
  end_reason text, ended_at timestamptz, updated_at timestamptz default now()
);
create index if not exists agent_sessions_user_idx on agent_sessions (user_id, agent_id, status);

create table if not exists whatsapp_bindings (phone_number text primary key, user_id uuid not null);
create table if not exists telegram_bindings (telegram_id bigint primary key, user_id uuid not null);

create table if not exists brand_profiles (
  user_id uuid primary key, profile jsonb not null default '{}',
  roadmap jsonb, progress jsonb not null default '[]',
  status text not null default 'discovering' check (status in ('discovering','ready')),
  last_daily_run date, updated_at timestamptz not null default now()
);

create table if not exists platform_connections (
  id uuid primary key default gen_random_uuid(), user_id uuid not null,
  platform text not null check (platform in ('x','facebook','instagram')),
  handle text not null, status text not null default 'active',
  scopes text[] not null default '{}', credentials jsonb not null default '{}',
  auto_approve boolean not null default false,
  connected_at timestamptz, updated_at timestamptz not null default now(),
  unique (user_id, platform)
);

create table if not exists approvals (
  id uuid primary key default gen_random_uuid(), user_id uuid not null,
  platform text not null, action text not null default 'publish',
  status text not null default 'pending' check (status in ('pending','approved','denied')),
  payload jsonb, created_at timestamptz not null default now()
);

create table if not exists semantic_cache (
  id uuid primary key default gen_random_uuid(), query text not null, response text not null,
  agent_id text not null, scope_key text not null, embedding vector,
  hit_count int not null default 0, created_at timestamptz not null default now()
);
create index if not exists semantic_cache_vec_idx on semantic_cache using ivfflat (embedding vector_cosine_ops);

create table if not exists document_chunks (
  id uuid primary key default gen_random_uuid(), content text not null, source text not null,
  agent_id text not null, embedding vector, created_at timestamptz not null default now(),
  search_vector tsvector generated always as (to_tsvector('english', content)) stored
);
create index if not exists document_chunks_fts_idx on document_chunks using gin (search_vector);
create index if not exists document_chunks_vec_idx on document_chunks using ivfflat (embedding vector_cosine_ops);

create or replace function semantic_cache_lookup(query_embedding vector, scope_key text, similarity_threshold float, match_count int)
returns setof semantic_cache language sql stable as $$
  select * from semantic_cache
  where scope_key = $2 and embedding is not null and 1 - (embedding <=> $1) > $3
  order by embedding <=> $1 limit $4
$$;

create or replace function rag_search(query_embedding vector, agent_id text, match_count int, similarity_threshold float)
returns table(id uuid, content text, source text, agent_id text, similarity float) language sql stable as $$
  select c.id, c.content, c.source, c.agent_id, 1 - (c.embedding <=> $1) as similarity
  from document_chunks c
  where c.agent_id = $2 and c.embedding is not null and 1 - (c.embedding <=> $1) > $4
  order by c.embedding <=> $1 limit $3
$$;

create or replace function append_session_message(p_session_id uuid, p_message jsonb, p_idle_minutes int)
returns void language plpgsql security definer as $$
begin
  update agent_sessions set
    messages = messages || p_message,
    idle_expires_at = now() + make_interval(mins => p_idle_minutes),
    updated_at = now()
  where id = p_session_id;
end $$;

alter publication supabase_realtime add table agent_tasks;
alter table agent_tasks replica identity full;

alter table agent_tasks enable row level security;
alter table agent_sessions enable row level security;
alter table brand_profiles enable row level security;
alter table platform_connections enable row level security;
alter table approvals enable row level security;
create policy own_tasks on agent_tasks for select using (auth.jwt() ->> 'sub' = user_id::text);
create policy own_sessions on agent_sessions for all using (auth.jwt() ->> 'sub' = user_id::text) with check (auth.jwt() ->> 'sub' = user_id::text);
create policy own_profile on brand_profiles for all using (auth.jwt() ->> 'sub' = user_id::text) with check (auth.jwt() ->> 'sub' = user_id::text);
create policy own_connections on platform_connections for select using (auth.jwt() ->> 'sub' = user_id::text);
create policy own_approvals on approvals for all using (auth.jwt() ->> 'sub' = user_id::text) with check (auth.jwt() ->> 'sub' = user_id::text);
