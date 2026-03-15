-- ============================================
-- STORAGE POLICIES FOR DOCUMENTS BUCKET
-- ============================================
-- Run this AFTER creating the "documents" bucket in the Supabase Dashboard

-- Allow authenticated users to upload files to their own folder
CREATE POLICY "users_upload_own_documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to read their own documents
CREATE POLICY "users_read_own_documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own documents
CREATE POLICY "users_delete_own_documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow practice members to read documents from shared projects
CREATE POLICY "practice_read_documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] IN (
    SELECT p.id::text FROM profiles p
    WHERE p.practice_id = (
      SELECT practice_id FROM profiles WHERE id = auth.uid() AND practice_id IS NOT NULL
    )
  )
);
