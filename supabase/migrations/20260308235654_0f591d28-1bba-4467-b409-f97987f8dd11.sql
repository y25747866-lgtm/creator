-- Enable UUID generation extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Temporarily drop RLS policies that depend on user_id column
DROP POLICY IF EXISTS "Users can view their own subscription" ON subscriptions;
DROP POLICY IF EXISTS "Users can insert their own subscription" ON subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscription" ON subscriptions;

-- Fix the column types for subscriptions table
ALTER TABLE subscriptions
  ALTER COLUMN id TYPE uuid USING id::uuid,
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Fix user_id to proper UUID type
ALTER TABLE subscriptions
  ALTER COLUMN user_id TYPE uuid USING user_id::uuid;

-- Fix timestamp columns
ALTER TABLE subscriptions
  ALTER COLUMN started_at TYPE timestamptz USING started_at::timestamptz,
  ALTER COLUMN expires_at TYPE timestamptz USING expires_at::timestamptz,
  ALTER COLUMN created_at TYPE timestamptz USING created_at::timestamptz,
  ALTER COLUMN updated_at TYPE timestamptz USING updated_at::timestamptz;

-- Set proper defaults for timestamp columns
ALTER TABLE subscriptions
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now(),
  ALTER COLUMN started_at SET DEFAULT now();

-- Recreate the RLS policies with proper types
CREATE POLICY "Users can view their own subscription" 
ON subscriptions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscription" 
ON subscriptions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription" 
ON subscriptions 
FOR UPDATE 
USING (auth.uid() = user_id);