
-- Saved marketing results
CREATE TABLE public.saved_marketing_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  platform TEXT NOT NULL DEFAULT 'instagram',
  hook TEXT NOT NULL DEFAULT '',
  main_copy TEXT NOT NULL DEFAULT '',
  cta TEXT NOT NULL DEFAULT '',
  hashtags TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_marketing_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own marketing results" ON public.saved_marketing_results FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own marketing results" ON public.saved_marketing_results FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own marketing results" ON public.saved_marketing_results FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Saved sales page results
CREATE TABLE public.saved_sales_page_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  headline TEXT NOT NULL DEFAULT '',
  subheadline TEXT NOT NULL DEFAULT '',
  problem TEXT NOT NULL DEFAULT '',
  solution TEXT NOT NULL DEFAULT '',
  benefits TEXT NOT NULL DEFAULT '',
  cta TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_sales_page_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sales page results" ON public.saved_sales_page_results FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sales page results" ON public.saved_sales_page_results FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own sales page results" ON public.saved_sales_page_results FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Daily usage tracking for free plan limits
CREATE TABLE public.daily_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  feature TEXT NOT NULL,
  used_at DATE NOT NULL DEFAULT CURRENT_DATE,
  count INTEGER NOT NULL DEFAULT 1,
  UNIQUE(user_id, feature, used_at)
);

ALTER TABLE public.daily_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage" ON public.daily_usage FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own usage" ON public.daily_usage FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own usage" ON public.daily_usage FOR UPDATE TO authenticated USING (auth.uid() = user_id);
