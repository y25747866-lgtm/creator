ALTER TABLE public.analytics_chat_messages ALTER COLUMN created_at TYPE timestamptz USING created_at::timestamptz;
ALTER TABLE public.ebook_products ALTER COLUMN created_at TYPE timestamptz USING created_at::timestamptz, ALTER COLUMN updated_at TYPE timestamptz USING updated_at::timestamptz;
ALTER TABLE public.monetization_feedback ALTER COLUMN created_at TYPE timestamptz USING created_at::timestamptz;
ALTER TABLE public.monetization_metrics ALTER COLUMN created_at TYPE timestamptz USING created_at::timestamptz;
ALTER TABLE public.product_feedback ALTER COLUMN created_at TYPE timestamptz USING created_at::timestamptz;
ALTER TABLE public.product_versions ALTER COLUMN created_at TYPE timestamptz USING created_at::timestamptz;
ALTER TABLE public.saved_marketing_results ALTER COLUMN created_at TYPE timestamptz USING created_at::timestamptz;
ALTER TABLE public.saved_sales_page_results ALTER COLUMN created_at TYPE timestamptz USING created_at::timestamptz;
