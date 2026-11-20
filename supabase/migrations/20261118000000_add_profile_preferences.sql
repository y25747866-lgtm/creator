ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'English',
  ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS appearance TEXT NOT NULL DEFAULT 'dark';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_appearance_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_appearance_check CHECK (appearance IN ('light', 'dark'));
