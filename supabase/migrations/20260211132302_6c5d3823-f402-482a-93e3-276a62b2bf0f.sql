
-- Monetization Products table
CREATE TABLE public.monetization_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  topic TEXT NOT NULL,
  description TEXT,
  source_type TEXT NOT NULL DEFAULT 'ebook',
  source_product_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.monetization_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own monetization products"
  ON public.monetization_products FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own monetization products"
  ON public.monetization_products FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own monetization products"
  ON public.monetization_products FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own monetization products"
  ON public.monetization_products FOR DELETE USING (auth.uid() = user_id);

-- Monetization Modules table
CREATE TABLE public.monetization_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.monetization_products(id) ON DELETE CASCADE,
  module_type TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.monetization_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own modules"
  ON public.monetization_modules FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.monetization_products WHERE id = monetization_modules.product_id AND user_id = auth.uid()));
CREATE POLICY "Users can insert their own modules"
  ON public.monetization_modules FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.monetization_products WHERE id = monetization_modules.product_id AND user_id = auth.uid()));
CREATE POLICY "Users can update their own modules"
  ON public.monetization_modules FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.monetization_products WHERE id = monetization_modules.product_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete their own modules"
  ON public.monetization_modules FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.monetization_products WHERE id = monetization_modules.product_id AND user_id = auth.uid()));

-- Monetization Versions table
CREATE TABLE public.monetization_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID NOT NULL REFERENCES public.monetization_modules(id) ON DELETE CASCADE,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  prompt_used TEXT,
  model_used TEXT,
  version_number INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.monetization_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own versions"
  ON public.monetization_versions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.monetization_modules m
    JOIN public.monetization_products p ON p.id = m.product_id
    WHERE m.id = monetization_versions.module_id AND p.user_id = auth.uid()
  ));
CREATE POLICY "Users can insert their own versions"
  ON public.monetization_versions FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.monetization_modules m
    JOIN public.monetization_products p ON p.id = m.product_id
    WHERE m.id = monetization_versions.module_id AND p.user_id = auth.uid()
  ));

-- Monetization Metrics table
CREATE TABLE public.monetization_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID NOT NULL REFERENCES public.monetization_modules(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.monetization_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own metrics"
  ON public.monetization_metrics FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.monetization_modules m
    JOIN public.monetization_products p ON p.id = m.product_id
    WHERE m.id = monetization_metrics.module_id AND p.user_id = auth.uid()
  ));
CREATE POLICY "Users can insert their own metrics"
  ON public.monetization_metrics FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.monetization_modules m
    JOIN public.monetization_products p ON p.id = m.product_id
    WHERE m.id = monetization_metrics.module_id AND p.user_id = auth.uid()
  ));

-- Monetization Feedback table
CREATE TABLE public.monetization_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID NOT NULL REFERENCES public.monetization_modules(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rating INTEGER,
  comment TEXT,
  section TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.monetization_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own feedback"
  ON public.monetization_feedback FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own feedback"
  ON public.monetization_feedback FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own feedback"
  ON public.monetization_feedback FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own feedback"
  ON public.monetization_feedback FOR DELETE USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_monetization_modules_product_id ON public.monetization_modules(product_id);
CREATE INDEX idx_monetization_versions_module_id ON public.monetization_versions(module_id);
CREATE INDEX idx_monetization_metrics_module_id ON public.monetization_metrics(module_id);
CREATE INDEX idx_monetization_feedback_module_id ON public.monetization_feedback(module_id);
