-- Create request_logs table for rate limiting
CREATE TABLE IF NOT EXISTS public.request_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add index for faster rate limit checks
CREATE INDEX IF NOT EXISTS request_logs_user_id_created_at_idx ON public.request_logs(user_id, created_at);

-- Set up RLS (Row Level Security)
ALTER TABLE public.request_logs ENABLE ROW LEVEL SECURITY;

-- Only allow service role to read/write for now as it's an internal table
CREATE POLICY "Service role only" ON public.request_logs
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
