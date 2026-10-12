import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isCreator } from "@/lib/creators";

// Magic-link lands here with a `code`. Exchange it for a session, then enforce the
// creator allowlist — a valid login from a non-allowlisted email is signed back out.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!isCreator(user?.email)) {
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/login?error=not_allowed`);
      }
      return NextResponse.redirect(`${origin}/studio`);
    }
  }
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
