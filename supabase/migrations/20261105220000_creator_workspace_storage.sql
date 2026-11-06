-- Durable, account-scoped conversation history for the chat-first creator workspace.
CREATE TABLE IF NOT EXISTS public.creator_chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'New chat',
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_creator_chat_conversations_user_updated
  ON public.creator_chat_conversations (user_id, updated_at DESC);

ALTER TABLE public.creator_chat_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own creator conversations" ON public.creator_chat_conversations;
CREATE POLICY "Users can manage their own creator conversations"
  ON public.creator_chat_conversations
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.creator_chat_conversations TO authenticated;

-- Private bucket for user-owned images and videos attached to creator chats.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'nexora-user-media',
  'nexora-user-media',
  false,
  52428800,
  ARRAY['image/jpeg','image/png','image/webp','image/gif','image/avif','video/mp4','video/webm','video/quicktime','video/ogg','application/pdf']::text[]
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can read their own creator media" ON storage.objects;
CREATE POLICY "Users can read their own creator media"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'nexora-user-media' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can upload their own creator media" ON storage.objects;
CREATE POLICY "Users can upload their own creator media"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'nexora-user-media' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete their own creator media" ON storage.objects;
CREATE POLICY "Users can delete their own creator media"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'nexora-user-media' AND (storage.foldername(name))[1] = auth.uid()::text);
