"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Members see only the wordmark (no organiser links; the organiser goes to /organiser directly).
 * On the organiser pages: Organiser / Share-back / Sign out.
 */
export function TopNav() {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const isLogin = pathname.startsWith("/organiser/login");
  const isOrganiser = !isLogin && (pathname.startsWith("/organiser") || pathname.startsWith("/network"));

  async function signOut() {
    setSigningOut(true);
    try {
      await fetch("/api/organiser/logout", { method: "POST" });
    } catch {
      /* the cookie may already be gone; go to the login page either way */
    }
    router.replace("/organiser/login");
    router.refresh();
    setSigningOut(false);
  }

  return (
    <nav className="topnav" aria-label="Main">
      <div className="topnav-inner">
        <Link className="wordmark" href={isOrganiser ? "/organiser" : "/"}>
          AI at Work Diagnostic <span>· Systeeminterventies</span>
        </Link>
        {isOrganiser && (
          <div className="navlinks" id="navlinks">
            <Link href="/organiser" aria-current={pathname.startsWith("/organiser") ? "page" : undefined}>
              Organiser
            </Link>
            <Link href="/network" aria-current={pathname.startsWith("/network") ? "page" : undefined}>
              Share-back
            </Link>
            <button type="button" id="btn-signout" onClick={signOut} disabled={signingOut}>
              Sign out
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
