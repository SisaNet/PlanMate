// Setup Supabase Storage bucket for documents
// Run: node scripts/setup-storage.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function setup() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local');
    console.error('Find the service role key in: Supabase Dashboard > Settings > API > service_role key');
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // Create documents bucket
  const { data, error } = await supabase.storage.createBucket('documents', {
    public: false,
    fileSizeLimit: 52428800, // 50MB
    allowedMimeTypes: [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/tiff',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
  });

  if (error) {
    if (error.message?.includes('already exists')) {
      console.log('Storage bucket "documents" already exists.');
    } else {
      console.error('Failed to create bucket:', error.message);
    }
  } else {
    console.log('Storage bucket "documents" created successfully!');
  }
}

setup();
