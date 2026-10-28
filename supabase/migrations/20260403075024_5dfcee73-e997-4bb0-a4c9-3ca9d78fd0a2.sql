ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS plan TEXT,
ADD COLUMN IF NOT EXISTS start_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS end_date TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.subscriptions
DROP CONSTRAINT IF EXISTS subscriptions_plan_type_check;

ALTER TABLE public.subscriptions
ADD CONSTRAINT subscriptions_plan_type_check
CHECK (plan_type = ANY (ARRAY['free'::text, 'creator'::text, 'pro'::text, 'monthly'::text, 'annual'::text]));

ALTER TABLE public.subscriptions
DROP CONSTRAINT IF EXISTS subscriptions_plan_check;

ALTER TABLE public.subscriptions
ADD CONSTRAINT subscriptions_plan_check
CHECK (plan IS NULL OR plan = ANY (ARRAY['free'::text, 'creator'::text, 'pro'::text]));

CREATE OR REPLACE FUNCTION public.sync_subscription_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.plan IS NULL AND NEW.plan_type IS NOT NULL THEN
    NEW.plan := CASE lower(NEW.plan_type)
      WHEN 'pro' THEN 'pro'
      WHEN 'creator' THEN 'creator'
      WHEN 'monthly' THEN 'creator'
      WHEN 'annual' THEN 'creator'
      ELSE 'free'
    END;
  END IF;

  IF NEW.plan_type IS NULL AND NEW.plan IS NOT NULL THEN
    NEW.plan_type := CASE lower(NEW.plan)
      WHEN 'pro' THEN 'pro'
      WHEN 'creator' THEN 'creator'
      ELSE 'free'
    END;
  END IF;

  IF NEW.start_date IS NULL THEN
    NEW.start_date := COALESCE(NEW.started_at, now());
  END IF;

  IF NEW.started_at IS NULL THEN
    NEW.started_at := COALESCE(NEW.start_date, now());
  END IF;

  IF NEW.end_date IS NULL THEN
    NEW.end_date := NEW.expires_at;
  END IF;

  IF NEW.expires_at IS NULL THEN
    NEW.expires_at := NEW.end_date;
  END IF;

  IF NEW.status IS NULL THEN
    NEW.status := 'active';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_subscription_columns_trigger ON public.subscriptions;

CREATE TRIGGER sync_subscription_columns_trigger
BEFORE INSERT OR UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.sync_subscription_columns();

UPDATE public.subscriptions
SET
  plan = COALESCE(
    plan,
    CASE lower(coalesce(plan_type, 'free'))
      WHEN 'pro' THEN 'pro'
      WHEN 'creator' THEN 'creator'
      WHEN 'monthly' THEN 'creator'
      WHEN 'annual' THEN 'creator'
      ELSE 'free'
    END
  ),
  start_date = COALESCE(start_date, started_at),
  end_date = COALESCE(end_date, expires_at),
  plan_type = CASE
    WHEN lower(coalesce(plan_type, '')) IN ('free', 'creator', 'pro') THEN lower(plan_type)
    WHEN lower(coalesce(plan_type, '')) IN ('monthly', 'annual') THEN 'creator'
    ELSE 'free'
  END;

CREATE OR REPLACE FUNCTION public.auto_assign_free_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, plan_type, plan, status, started_at, start_date)
  VALUES (NEW.user_id, 'free', 'free', 'active', now(), now())
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_auto_assign_free_subscription ON public.profiles;

CREATE TRIGGER profiles_auto_assign_free_subscription
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.auto_assign_free_subscription();

INSERT INTO public.profiles (user_id, email)
SELECT u.id, u.email
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.user_id IS NULL;

INSERT INTO public.subscriptions (user_id, plan_type, plan, status, started_at, start_date)
SELECT p.user_id, 'free', 'free', 'active', now(), now()
FROM public.profiles p
LEFT JOIN public.subscriptions s ON s.user_id = p.user_id
WHERE s.user_id IS NULL;

CREATE OR REPLACE FUNCTION public.ensure_account_records()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  current_email TEXT;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT u.email INTO current_email
  FROM auth.users u
  WHERE u.id = current_user_id;

  INSERT INTO public.profiles (user_id, email)
  VALUES (current_user_id, current_email)
  ON CONFLICT (user_id) DO UPDATE
  SET email = COALESCE(public.profiles.email, EXCLUDED.email);

  INSERT INTO public.subscriptions (user_id, plan_type, plan, status, started_at, start_date)
  VALUES (current_user_id, 'free', 'free', 'active', now(), now())
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_account_records() TO authenticated;

CREATE OR REPLACE FUNCTION public.has_active_subscription(user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.subscriptions
    WHERE user_id = user_uuid
      AND status = 'active'
      AND (
        (end_date IS NOT NULL AND end_date > now())
        OR (expires_at IS NOT NULL AND expires_at > now())
        OR (end_date IS NULL AND expires_at IS NULL)
      )
  )
$$;