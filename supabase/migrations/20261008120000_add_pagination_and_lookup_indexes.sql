-- Indexes aligned to the owner/product lookups and stable page ordering
-- (created_at DESC, id DESC) used by the paginated screens.

-- Product analytics: list pages are ordered by created_at then id per user.
CREATE INDEX IF NOT EXISTS idx_ebook_products_user_created_id
  ON public.ebook_products(user_id, created_at DESC, id DESC);

-- Product detail collections: metrics page on (recorded_at, id), feedback and versions on (created_at, id).
CREATE INDEX IF NOT EXISTS idx_product_metrics_product_recorded_id
  ON public.product_metrics(product_id, recorded_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_product_feedback_product_created_id
  ON public.product_feedback(product_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_product_versions_product_created_id
  ON public.product_versions(product_id, created_at DESC, id DESC);

-- Saved marketing and sales-page results: newest-first pages per user.
CREATE INDEX IF NOT EXISTS idx_saved_marketing_results_user_created_id
  ON public.saved_marketing_results(user_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_saved_sales_page_results_user_created_id
  ON public.saved_sales_page_results(user_id, created_at DESC, id DESC);

-- Analytics chat history: latest 20 messages plus older pages per user.
CREATE INDEX IF NOT EXISTS idx_analytics_chat_messages_user_created_id
  ON public.analytics_chat_messages(user_id, created_at DESC, id DESC);

-- Monetization campaigns and their module version history.
CREATE INDEX IF NOT EXISTS idx_monetization_products_user_created_id
  ON public.monetization_products(user_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_monetization_versions_module_created_id
  ON public.monetization_versions(module_id, created_at DESC, id DESC);
