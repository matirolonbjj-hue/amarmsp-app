import { createBrowserClient } from "@supabase/ssr";

const SUPABASE_URL = "https://owawmvnxvtilzxheeqpq.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93YXdtdm54dnRpbHp4aGVlcXBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2OTAwNTMsImV4cCI6MjA5NjI2NjA1M30.3O7sDHZOpXmLVN-ZlYNFWDitdnCeAAA9TG26wSJbbkY";

type SupabaseClient = ReturnType<typeof createBrowserClient>;

export function createClient(): SupabaseClient {
  if (typeof window === "undefined") return null as unknown as SupabaseClient;
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
