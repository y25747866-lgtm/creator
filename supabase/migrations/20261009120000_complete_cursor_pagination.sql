-- Support stable per-campaign module pages without scanning/sorting the full child list.
CREATE INDEX IF NOT EXISTS idx_monetization_modules_product_created_id
  ON public.monetization_modules(product_id, created_at DESC, id DESC);

-- Keep the metric summary exact while the detail rows themselves are keyset-paginated.
CREATE OR REPLACE FUNCTION public.get_product_metric_summary(p_product_id uuid)
RETURNS TABLE(metric_type text, total_value bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT pm.metric_type, COALESCE(SUM(pm.value), 0)::bigint
  FROM public.product_metrics AS pm
  WHERE pm.product_id = p_product_id
  GROUP BY pm.metric_type;
$$;

REVOKE ALL ON FUNCTION public.get_product_metric_summary(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_product_metric_summary(uuid) TO service_role;
