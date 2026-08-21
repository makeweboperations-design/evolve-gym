const { createClient } = require('@supabase/supabase-js');

// This is ONLY used for Storage (file uploads) — all normal data queries
// still go through the raw `pg` pool in config/db.js. Needs the SERVICE
// ROLE key (not the anon key) since the backend uploads on the user's
// behalf without a Supabase Auth session.
//
// Get these from: Supabase dashboard -> Project Settings -> API
//   SUPABASE_URL              = "Project URL"
//   SUPABASE_SERVICE_ROLE_KEY = "service_role" secret key (NOT the anon key)
const supabaseStorage = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const AVATAR_BUCKET = 'avatars';

module.exports = { supabaseStorage, AVATAR_BUCKET };
