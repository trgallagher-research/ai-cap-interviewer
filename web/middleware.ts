/* middleware.ts: gate for the organiser area (/organiser, /network, /api/organiser/*).
 * Members (/, /api/interview/*, /api/config, /api/transcribe) are never matched.
 * Every organiser API route checks the cookie again (lib/auth.ts requireOrganiser). */
import { NextResponse, type NextRequest } from "next/server";
import { CLOSED_MESSAGE, organiserAccess } from "@/lib/auth";

const OPEN_PATHS = new Set(["/organiser/login", "/api/organiser/login", "/api/organiser/logout"]);

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname.replace(/\/+$/, "") || "/";
  if (OPEN_PATHS.has(path)) return NextResponse.next();

  const access = await organiserAccess(req);
  if (access === "ok") return NextResponse.next();

  const isApi = path.startsWith("/api/");
  if (access === "closed") {
    if (isApi) return NextResponse.json({ error: CLOSED_MESSAGE, code: "organiser_closed" }, { status: 503 });
    return new NextResponse(
      `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Organiser area closed</title><body style="font-family:system-ui,sans-serif;max-width:36rem;margin:3rem auto;padding:0 1rem;line-height:1.5"><h1>Organiser area closed</h1><p>${CLOSED_MESSAGE}</p></body>`,
      { status: 503, headers: { "content-type": "text/html; charset=utf-8" } },
    );
  }
  if (isApi) return NextResponse.json({ error: "Organiser login required", code: "unauthorised" }, { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = "/organiser/login";
  url.search = "";
  url.searchParams.set("next", path);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/organiser", "/organiser/:path*", "/network", "/network/:path*", "/api/organiser/:path*"],
};
