-- Create storage buckets for images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('avatars', 'avatars', true, 1048576, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']),
  ('project-banners', 'project-banners', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']),
  ('task-images', 'task-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- RLS policies for storage buckets

-- Avatars bucket policies
CREATE POLICY "Users can upload their own avatar" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND 
    auth.role() = 'authenticated' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view their own avatar" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'avatars' AND 
    auth.role() = 'authenticated' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update their own avatar" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' AND 
    auth.role() = 'authenticated' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own avatar" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars' AND 
    auth.role() = 'authenticated' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Project banners bucket policies
CREATE POLICY "Users can upload project banners" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'project-banners' AND 
    auth.role() = 'authenticated' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Anyone can view project banners" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'project-banners' AND 
    auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update their project banners" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'project-banners' AND 
    auth.role() = 'authenticated' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their project banners" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'project-banners' AND 
    auth.role() = 'authenticated' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Task images bucket policies
CREATE POLICY "Users can upload task images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'task-images' AND 
    auth.role() = 'authenticated' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Anyone can view task images" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'task-images' AND 
    auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update their task images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'task-images' AND 
    auth.role() = 'authenticated' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their task images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'task-images' AND 
    auth.role() = 'authenticated' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );
