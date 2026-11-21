-- Keep the creator media bucket private while adding the PDF type used by the File picker.
UPDATE storage.buckets
SET file_size_limit = 52428800,
    allowed_mime_types = ARRAY[
      'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif',
      'video/mp4', 'video/webm', 'video/quicktime', 'video/ogg',
      'application/pdf'
    ]::text[]
WHERE id = 'nexora-user-media';
