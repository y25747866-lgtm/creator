CREATE EXTENSION IF NOT EXISTS pgmq;
SELECT pgmq.create('ebook_generation');
SELECT pgmq.create('email_notifications');
SELECT pgmq.create('file_generation');
CREATE INDEX IF NOT EXISTS idx_ebook_jobs_queued ON public.ebook_jobs(status, created_at ASC) WHERE status IN ('queued', 'processing');
