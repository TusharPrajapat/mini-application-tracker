import { createClient, SupabaseClient } from "@supabase/supabase-js";

export const supabaseUrl =
  process.env.SUPABASE_URL || "https://cyigsgeveyqdkfvifkzl.supabase.co";

export const supabaseAnonKey =
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "";

export const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Prefer service role key if available, otherwise fall back to publishable/anon key
const initialKey = supabaseServiceRoleKey || supabaseAnonKey;

export const supabaseAdmin: SupabaseClient = createClient(
  supabaseUrl,
  initialKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);
