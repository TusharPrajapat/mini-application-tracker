import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.SUPABASE_URL || "https://cyigsgeveyqdkfvifkzl.supabase.co";
const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || "";

if (!supabasePublishableKey) {
  console.warn(
    "Warning: SUPABASE_PUBLISHABLE_KEY environment variable is not set. Supabase Auth API calls will require SUPABASE_PUBLISHABLE_KEY in .env.",
  );
}

export const supabase: SupabaseClient = createClient(
  supabaseUrl,
  supabasePublishableKey,
);
