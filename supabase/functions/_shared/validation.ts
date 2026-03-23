import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation for ebook generation
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateEbookInput(topic?: string, title?: string): ValidationResult {
  // Validate topic
  if (!topic || typeof topic !== 'string') {
    return { valid: false, error: 'Topic is required' };
  }
  
  const trimmedTopic = topic.trim();
  if (trimmedTopic.length === 0) {
    return { valid: false, error: 'Topic cannot be empty' };
  }
  
  if (trimmedTopic.length > 500) {
    return { valid: false, error: 'Topic too long (max 500 characters)' };
  }

  // Validate title if provided
  if (title !== undefined && title !== null) {
    if (typeof title !== 'string') {
      return { valid: false, error: 'Title must be a string' };
    }
    
    const trimmedTitle = title.trim();
    if (trimmedTitle.length > 200) {
      return { valid: false, error: 'Title too long (max 200 characters)' };
    }
  }

  // Check for common prompt injection patterns
  const dangerousPatterns = /ignore\s+previous|ignore\s+all|system\s*:|assistant\s*:|<script|javascript:|data:/i;
  
  if (dangerousPatterns.test(topic)) {
    return { valid: false, error: 'Invalid characters in topic' };
  }
  
  if (title && dangerousPatterns.test(title)) {
    return { valid: false, error: 'Invalid characters in title' };
  }

  return { valid: true };
}

// Sanitize input for safe use in prompts
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets
    .substring(0, 500); // Enforce max length
}

// Authentication and subscription verification
export interface AccessResult {
  authorized: boolean;
  userId?: string;
  error?: string;
}

/**
 * Verify if the user has a valid active and unexpired subscription.
 * Strictly enforces: status = 'active' AND (end_date > now OR expires_at > now)
 */
export async function verifyAccess(req: Request): Promise<AccessResult> {
  // Extract JWT from Authorization header
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { authorized: false, error: 'Missing authorization' };
  }

  const token = authHeader.replace('Bearer ', '');
  
  // Get Supabase credentials
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase configuration');
    return { authorized: false, error: 'Server configuration error' };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  // Verify JWT and get user
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  
  if (authError || !user) {
    console.error('Auth error:', authError?.message);
    return { authorized: false, error: 'Invalid or expired token' };
  }

  // Check for valid active + unexpired subscription
  // We check both status='active' and that it hasn't expired yet
  const { data: subscription, error: subError } = await supabase
    .from('subscriptions')
    .select('id, status, expires_at, end_date')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (subError) {
    console.error('Subscription check error:', subError.message);
    return { authorized: false, error: 'Failed to verify subscription' };
  }

  if (!subscription) {
    return { authorized: false, error: 'No active subscription found. Please upgrade your plan.' };
  }

  const now = new Date();
  const endDate = subscription.end_date ? new Date(subscription.end_date) : null;
  const expiresAt = subscription.expires_at ? new Date(subscription.expires_at) : null;

  const isExpired = (endDate && endDate < now) || (expiresAt && expiresAt < now);

  if (isExpired) {
    // Auto-update status to expired in background
    supabase
      .from('subscriptions')
      .update({ status: 'expired' })
      .eq('id', subscription.id)
      .then(({ error }) => {
        if (error) console.error('Failed to auto-update expired status:', error.message);
      });

    return { authorized: false, error: 'Subscription expired. Please renew your plan to continue.' };
  }

  return { authorized: true, userId: user.id };
}

// Create error response with CORS headers
export function errorResponse(message: string, status: number = 400): Response {
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
