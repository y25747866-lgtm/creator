-- NexoraOS recovery + Realtime compatibility patch.
-- Additive/idempotent. Back up the project before applying to production.

-- Keep the task/event fields the server selects present on older installations.
ALTER TABLE IF EXISTS public.agent_tasks
  ADD COLUMN IF NOT EXISTS input jsonb,
  ADD COLUMN IF NOT EXISTS output jsonb,
  ADD COLUMN IF NOT EXISTS parent_task_id uuid,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE IF EXISTS public.agent_events
  ADD COLUMN IF NOT EXISTS task_id uuid,
  ADD COLUMN IF NOT EXISTS type text,
  ADD COLUMN IF NOT EXISTS payload jsonb,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- Ensure the columns expected by the current platform registry exist without
-- dropping or rewriting any legacy api_key_encrypted/last_sync_at columns.
ALTER TABLE IF EXISTS public.platform_connections
  ADD COLUMN IF NOT EXISTS handle text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS scopes text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS credentials jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS auto_approve boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS public.brand_profiles (
  user_id uuid PRIMARY KEY,
  profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  roadmap jsonb,
  progress jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'discovering' CHECK (status IN ('discovering','ready')),
  last_daily_run date,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.brand_profiles
  ADD COLUMN IF NOT EXISTS profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS roadmap jsonb,
  ADD COLUMN IF NOT EXISTS progress jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'discovering',
  ADD COLUMN IF NOT EXISTS last_daily_run date,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS public.approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  platform text NOT NULL,
  action text NOT NULL DEFAULT 'publish',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','denied')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.approvals
  ADD COLUMN IF NOT EXISTS action text NOT NULL DEFAULT 'publish',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS agent_tasks_queued_idx ON public.agent_tasks(agent, status);
CREATE INDEX IF NOT EXISTS agent_tasks_user_idx ON public.agent_tasks(user_id);
CREATE INDEX IF NOT EXISTS approvals_user_status_idx ON public.approvals(user_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS platform_connections_user_platform_uidx
  ON public.platform_connections(user_id, platform);

ALTER TABLE public.agent_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY nexora_own_tasks_select ON public.agent_tasks
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY nexora_own_brand_profiles ON public.brand_profiles
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY nexora_own_connections_select ON public.platform_connections
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY nexora_own_approvals ON public.approvals
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Publication membership is not guaranteed by the initial migration. Add both
-- tables independently so a missing/duplicate membership does not skip the other.
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_tasks;
EXCEPTION WHEN duplicate_object THEN NULL;
WHEN undefined_object THEN RAISE NOTICE 'supabase_realtime is unavailable; enable Realtime for agent_tasks manually';
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_events;
EXCEPTION WHEN duplicate_object THEN NULL;
WHEN undefined_object THEN RAISE NOTICE 'supabase_realtime is unavailable; enable Realtime for agent_events manually';
END $$;

ALTER TABLE public.agent_tasks REPLICA IDENTITY FULL;
