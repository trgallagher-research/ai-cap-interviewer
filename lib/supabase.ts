import { createClient } from "@supabase/supabase-js";

// Server-only Supabase client using the service_role key. NEVER import this into
// a client component — the service_role key bypasses RLS. Respondent writes
// (interviews/turns) are funneled through server API routes that use this client,
// so the browser never touches the database directly in Phase 1.
//
// Created lazily so a missing env var fails at request time with a clear message
// rather than crashing the build / unrelated routes.
export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Supabase not configured — set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
    );
  }
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}
