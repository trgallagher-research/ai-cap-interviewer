import { createClient } from "@/lib/supabase/server";
import { isCreator } from "@/lib/creators";
import type { SupabaseClient, User } from "@supabase/supabase-js";

// Resolve the current request's creator. Returns null if not logged in or the
// email isn't on the allowlist. Use in protected pages and /api/studio routes —
// never trust the middleware alone for authorization.
export async function getCreator(): Promise<{
  user: User;
  supabase: SupabaseClient;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isCreator(user.email)) return null;
  return { user, supabase };
}
