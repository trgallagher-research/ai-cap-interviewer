import { createBrowserClient } from "@supabase/ssr";

// Client-side Supabase client (uses the publishable/anon key) for auth in the
// browser — sign-in, sign-out, session reads. Safe to expose.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
