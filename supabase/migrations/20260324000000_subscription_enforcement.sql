-- Function to check user access server-side
-- This can be used in RLS or called directly via RPC
CREATE OR REPLACE FUNCTION public.check_user_access(user_uuid UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    sub_record RECORD;
    now_ts TIMESTAMPTZ := now();
    is_expired BOOLEAN := FALSE;
BEGIN
    -- Get the latest active subscription
    SELECT * INTO sub_record
    FROM public.subscriptions
    WHERE user_id = user_uuid
      AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1;

    -- If no active subscription found
    IF sub_record IS NULL THEN
        RETURN jsonb_build_object(
            'has_access', FALSE,
            'plan_type', 'free',
            'reason', 'No active subscription found'
        );
    END IF;

    -- Check for expiration
    IF (sub_record.end_date IS NOT NULL AND sub_record.end_date < now_ts) OR 
       (sub_record.expires_at IS NOT NULL AND sub_record.expires_at < now_ts) THEN
        is_expired := TRUE;
    END IF;

    -- Handle expired status
    IF is_expired THEN
        -- Update the status to expired in the background
        UPDATE public.subscriptions
        SET status = 'expired'
        WHERE id = sub_record.id;

        RETURN jsonb_build_object(
            'has_access', FALSE,
            'plan_type', 'free',
            'reason', 'Subscription has expired'
        );
    END IF;

    -- Return success with plan details
    RETURN jsonb_build_object(
        'has_access', TRUE,
        'plan_type', COALESCE(sub_record.plan, sub_record.plan_type, 'free'),
        'subscription_id', sub_record.id
    );
END;
$$;

-- Add a comment to the function
COMMENT ON FUNCTION public.check_user_access(UUID) IS 'Strictly verifies user subscription status and handles auto-expiration.';
