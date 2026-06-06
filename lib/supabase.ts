import { createBrowserClient } from "@supabase/ssr";

type SupabaseClient = ReturnType<typeof createBrowserClient>;

export function createClient(): SupabaseClient {
  // During SSR/build the browser client is unavailable — all Supabase calls
  // happen inside useEffect (client-only) so null is never dereferenced.
  if (typeof window === "undefined") return null as unknown as SupabaseClient;
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
