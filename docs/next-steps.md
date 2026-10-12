# Session state & next steps — 2026-06-30

Pick-up notes after a working session. Everything below is **merged to `main` and
deployed** unless marked otherwise.

## 2026-06-30 — Landscape Scanner integration: BUILT, DEPLOYED, LIVE

The `landscape-scanner` (Python desk-research engine) is now a feature of this app.
Architecture: the engine can't run in a Vercel function (a scan takes minutes), so it
runs as a **separate service on the NUC `claude-host`** behind a **Cloudflare Tunnel +
Access**, and the website is a thin, **creator-auth-gated proxy** (`lib/scanner.ts`,
`app/api/studio/scan/*`, `app/scans/*`). Studio → **Landscape scans**.

- **Merged:** engine PR `landscape-scanner#1` + website PR `aligned-interviewer#17`
  (one change, merged together). Migration `supabase/migrations/0003_scans.sql` run
  (a per-creator `scans` table, RLS-scoped). Native report renderer mirrors the engine's
  pydantic models field-for-field; **HTML + Word (.docx) downloads** (`lib/scanExport.ts`,
  `app/api/studio/scan/[runId]/export`).
- **Hardening (post-review):** engine requires the bearer off-localhost, clamps `budget_usd`,
  recovers runs orphaned by a restart, and caps concurrency (`SCANNER_MAX_CONCURRENT_RUNS`);
  website caps per-creator in-flight scans (`SCAN_MAX_ACTIVE`) and bounds poll retries.
- **Deployed & reboot-safe:** engine = `scanner-api` systemd service
  (`landscape-scanner` `deploy/scanner-api.service` → `scanner serve-api`, localhost:8000),
  exposed at `scanner.alignedstudies.org` via a Cloudflare Tunnel (`cloudflared` service) +
  Access service token. Website `SCANNER_*` env vars set in Vercel. All four provider keys
  (Serper, Brave, Anthropic, OpenRouter) live in the NUC's `~/landscape-scanner/.env`, so
  scans run two-index (cross-index agreement active).
- **Verified:** a real end-to-end scan succeeded (~$0.18) with working HTML/DOCX export.
- **Docs:** `docs/scanner-deploy.md` (the secret-location index + runbook),
  `docs/scanner-service-contract.md` (HTTP contract), and in the engine repo
  `docs/how-it-works.md` (Mermaid diagrams for a non-technical audience).
- **Secrets** live in 1Password (names only here): *AlignED — Scanner service token*,
  *AlignED — Scanner Cloudflare Access service token*, *AlignED — Cloudflare API token (admin)*.
  Values are also in Vercel env / the NUC `.env` / `/etc/landscape-scanner-api.env`.
- **Deferred:** rebooting the NUC (it wants a kernel update) — held off because it would
  kill 3 running Claude tmux sessions + a `:3000` dev server; both scanner services are
  `enabled` so they auto-restart, so a future reboot is safe to do at a quiet moment.
- **Login note:** magic-link to a corporate inbox (`@ibo.org`) is blocked by the gateway —
  use personal emails on the `CREATOR_EMAILS` allowlist; OAuth was considered, not pursued.

## Where it stands (live)

- **Product name: "Aligned Interviewer"** (package `aligned-interviewer`), tagline
  "AI-led interviews for qualitative research" (shown on the login + studio screens).
  Renamed 2026-06-27 to "AI Interviewer for Qualitative Research", then 2026-06-29 to
  "Aligned Interviewer". Deliberately kept as-is for now: the GitHub repo slug
  (`claude-interviewer`), the Vercel project, and the `claude-interviewer.vercel.app`
  URL — rename/move those as a deliberate step (see custom-domain item). `claude-*` model ids +
  Anthropic attribution stay.
- **Migrations 0001–0004 run** in Supabase (0001 experience columns; 0002 reports/email
  columns + `syntheses.kind`; 0003 `scans`; 0004 framework-analysis columns + the
  `respondent_analysis` kind). Note: **0002 was actually applied on 2026-07-11**, together
  with 0004 — earlier notes here wrongly stated it had already run.
- **Voice** (Groq Whisper) live; mic hidden unless `GROQ_API_KEY` is set.
- **Respondent reports + opt-in email** (PR #5): on completion, an auto-generated,
  respondent-facing summary of their *own* interview shows on-screen (its own schema —
  **no objectives/coverage**, the research agenda never leaks). Two opt-in checkboxes:
  email me a copy (sent immediately) + email me the overall findings later (creator
  triggers "Send aggregate report" in the studio; idempotent). Email via Resend behind a
  gate (`lib/email.ts`); unset key ⇒ on-screen still works, sending disabled.
- **Consent/privacy copy**: controller **Timothy Gallagher**, contact
  **aligned.benchmark@gmail.com**, retention ≤12 months, "Groq (not xAI's Grok)", Resend
  added as processor. `CONSENT_VERSION = 2026-06-27-reports`.
- **Infra fix**: git commit identity set to `trgallagher20@gmail.com` (the IBO email was
  blocking Vercel Hobby deploys). Merging PRs via the GitHub UI deploys cleanly.

## Email feature — DONE (2026-06-28)

Fully working end-to-end:
- Report generation verified (real summary, no agenda leak); the ~37s on-screen wait was
  trimmed by skipping extended thinking on that one call (`thinking: false`).
- **Domain `alignedstudies.org` registered (Cloudflare) and verified in Resend**
  (eu-west-1) — SPF/DKIM/DMARC all live. Confirmed a real email from
  `noreply@alignedstudies.org` lands in the **inbox, not spam**.
- `EMAIL_FROM = "AlignED Studies <noreply@alignedstudies.org>"` (sender display name).
  Set in `.env.local` and in Vercel (Production + Preview); redeployed.
- Real respondents now receive emails, in the inbox.

**Done 2026-06-28:** `alignedstudies.com` and `www` now **301-redirect to
`https://alignedstudies.org`** (two Cloudflare Page Rules — one `*alignedstudies.com/*`
for www, one `alignedstudies.com/*` for the apex; path + query preserved; backed by
proxied placeholder A records at `@` and `www` → `192.0.2.1`). `RESEND_API_KEY` is a
send-only key.

**Done 2026-06-29:** the GitHub Pages reports site now lives at
**`https://reports.alignedstudies.org`** (HTTPS enforced). Set up via: a `reports` CNAME →
`trgallagher-research.github.io` in the **`.org`** zone, **DNS-only / grey-cloud** (orange
proxy breaks GitHub's cert provisioning); custom domain set on the
`trgallagher-research/AlignED-research-reports` repo (`gh api PUT …/pages cname=…`); cert
auto-provisioned, then `https_enforced=true`. The old
`trgallagher-research.github.io/AlignED-research-reports/` URL now redirects there.

**Done 2026-06-29:** the **root `https://alignedstudies.org`** now serves a simple AlignED
Studies **landing page** (HTTPS enforced) — links to the reports + contact. Hosted on
GitHub Pages from a dedicated repo **`trgallagher-research/alignedstudies-site`** (static
`index.html`); apex pointed via **four A records `@` → 185.199.108–111.153 in the `.org`
zone, grey-cloud**. This also gives the `.com → .org` redirect a real destination.
Gotcha hit along the way: setting the custom domain before DNS was correct stalled the
cert at `none`; a remove/re-add of the custom domain re-triggered issuance. Edit page copy
via the contents API on that repo.

## Backlog / when ready

- **Rotate the Resend API key** — it was shared in plaintext chat. 30-sec job once
  testing is done.
- **Groq ZDR**: DONE — "Inference APIs ZDR" enabled in the Groq console, so transcription
  inputs/outputs are no longer stored (matches the consent promise).
- **Done 2026-06-29 — app moved onto the domain:** the app now serves at
  **`https://interviewer.alignedstudies.org`** (Vercel custom domain; Cloudflare CNAME
  `interviewer` → `cname.vercel-dns.com`, grey-cloud; Vercel-issued cert). Supabase
  **Site URL** set to it + **Redirect URLs** include `https://interviewer.alignedstudies.org/**`
  (kept the vercel.app entry too). Creator login verified working. No code change (auth
  URLs are request-derived). `claude-interviewer.vercel.app` still serves, so old respondent
  links keep working. **Auth emails branded:** custom SMTP via Resend
  (`smtp.resend.com:465`, user `resend`) sending from "Aligned Interviewer
  <noreply@alignedstudies.org>", with a customised Magic Link template.
  - Note: magic-link sign-in must be requested + opened in the *same* browser (PKCE) — only
    affects the creator's own login, not respondents.
  - **GitHub repo renamed** `claude-interviewer` → **`aligned-interviewer`** (2026-06-29;
    GitHub auto-redirects old URLs/clones; Vercel follows by repo ID). The **Vercel project
    rename + the vercel.app→interviewer redirect were intentionally skipped** — renaming the
    Vercel project would change the `*.vercel.app` URL and break already-shared respondent
    links, and the redirect is just optional polish (both domains already work).
- **Consent wording reviewed (2026-06-29):** completeness pass done — added IP/technical-data
  disclosure + a no-AI-training statement, tidied phrasing, dropped the /privacy draft
  disclaimer. NOT a legal sign-off; a lawyer review is still advisable before commercial /
  broad EU use.
- **Pre-existing**: no per-respondent rate limiting on public/cost routes
  (`/api/transcribe`, `/api/interview/*`). A real limiter needs a shared store
  (Vercel KV / Upstash).

## Key references

- Repo: `trgallagher-research/claude-interviewer`, branch `main`. Prod:
  `claude-interviewer.vercel.app`.
- Migrations: `supabase/migrations/0001_experience.sql`, `0002_reports_email.sql`,
  `0003_scans.sql`, `0004_framework_analysis.sql` (all run; 0002 + 0004 applied 2026-07-11).
  Schema mirror: `supabase/schema.sql`.
- This session's approved feature plan (home dir, not in repo):
  `~/.claude/plans/dynamic-conjuring-tarjan.md`.
- GDPR operations: `docs/gdpr-compliance.md` + GitHub issue #1.
- Controller / data-rights contact: Timothy Gallagher / aligned.benchmark@gmail.com.
- Email seam: `lib/email.ts`, `lib/emailTemplates.ts`. Report route:
  `app/api/interview/report/route.ts`. Aggregate send:
  `app/api/studio/[studyId]/report/send/route.ts`.
