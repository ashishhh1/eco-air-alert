const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

// Service role key is used here because this is a trusted backend server.
// NEVER expose the service role key to the frontend.
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = supabase;
