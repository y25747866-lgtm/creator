
-- Create a trigger to auto-assign a free subscription when a new profile is created
CREATE OR REPLACE FUNCTION public.auto_assign_free_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, plan_type, status, started_at)
  VALUES (NEW.user_id, 'free', 'active', now())
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Add unique constraint on user_id for upsert support
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_user_id_key'
  ) THEN
    ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- Create trigger on profiles table
DROP TRIGGER IF EXISTS on_profile_created_assign_free ON public.profiles;
CREATE TRIGGER on_profile_created_assign_free
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_free_subscription();
