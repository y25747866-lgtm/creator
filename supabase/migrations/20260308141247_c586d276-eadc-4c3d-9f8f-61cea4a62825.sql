
-- Add unique constraint for platform_connections upsert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'platform_connections_user_platform_unique'
  ) THEN
    ALTER TABLE public.platform_connections ADD CONSTRAINT platform_connections_user_platform_unique UNIQUE (user_id, platform);
  END IF;
END $$;
