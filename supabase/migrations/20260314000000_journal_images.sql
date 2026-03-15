-- Add image_urls column to journals table
ALTER TABLE journals ADD COLUMN IF NOT EXISTS image_urls text[] DEFAULT '{}';

-- Create journal-images storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'journal-images',
  'journal-images',
  true,
  10485760, -- 10MB per image
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for journal-images bucket
CREATE POLICY "Users can upload journal images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'journal-images' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view journal images" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'journal-images' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Users can delete their journal images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'journal-images' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
