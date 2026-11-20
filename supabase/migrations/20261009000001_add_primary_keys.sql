ALTER TABLE public.product_feedback ADD PRIMARY KEY (id);
ALTER TABLE public.product_metrics ADD PRIMARY KEY (id);
ALTER TABLE public.monetization_versions ADD PRIMARY KEY (id);
ALTER TABLE public.monetization_feedback ADD PRIMARY KEY (id);
ALTER TABLE public.monetization_metrics ADD PRIMARY KEY (id);
ALTER TABLE public.analytics_data ADD PRIMARY KEY (id);
UPDATE public.ebook_products SET id = gen_random_uuid()::text, created_at = now(), updated_at = now() WHERE id IS NULL;
ALTER TABLE public.ebook_products ADD PRIMARY KEY (id);
DELETE FROM public.product_versions WHERE id IS NULL;
