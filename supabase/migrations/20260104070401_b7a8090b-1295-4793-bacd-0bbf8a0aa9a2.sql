-- Add whop_user_id column for Whop user identification
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS whop_user_id text;

-- Create index for faster lookups by whop_user_id
CREATE INDEX IF NOT EXISTS idx_subscriptions_whop_user_id 
ON public.subscriptions(whop_user_id);