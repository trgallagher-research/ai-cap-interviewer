# Landscape Scanner — service contract (NUC)

The website (Next.js on Vercel) does **not** run the scanner. landscape-scanner is a
Python engine; a long scan takes minutes and can't live in a 60s Vercel function. So it
runs as a **separate service on the always-on NUC**, reached over a **Cloudflare Tunnel**,
and the website is a thin authenticated client + proxy in front of it.

This file is the contract the Next.js side (`lib/scanner.ts` + `app/api/studio/scan/*`)
is written against. **Phase 1 in this repo is built to this stub**; the matching changes
to the landscape-scanner repo (Phase 0) make the engine honour it.

## Where it runs / how it's reached

- Engine: FastAPI + uvicorn on the NUC. Binds `127.0.0.1`; `cloudflared` runs on the same
  box and connects to that local port, so no public interface is ever bound. (`serve-api`
  refuses a non-local `--host` unless `SCANNER_SERVICE_TOKEN` is set.)
- Exposure: **Cloudflare Tunnel** gives it a stable HTTPS hostname. Put **Cloudflare
  Access (service token)** in front so only the Vercel app can call it.
- Defence in depth: the engine also checks an app bearer token. So a request carries
  *both* the Cloudflare Access service-token headers and the app bearer.

Env vars the website reads (set in Vercel):

| Var | Meaning |
| --- | --- |
| `SCANNER_SERVICE_URL` | Base URL of the tunnelled engine, e.g. `https://scanner.alignedstudies.org` |
| `SCANNER_SERVICE_TOKEN` | App bearer token the engine validates |
| `SCANNER_CF_ACCESS_CLIENT_ID` | Cloudflare Access service-token id (optional) |
| `SCANNER_CF_ACCESS_CLIENT_SECRET` | Cloudflare Access service-token secret (optional) |

If `SCANNER_SERVICE_URL` is unset the feature is simply disabled (mirrors how
`lib/email.ts` / `lib/groq.ts` fail closed when their keys are absent).

Limits are enforced on **both** sides:

| Where | Var | Effect |
| --- | --- | --- |
| Engine (NUC) | `SCANNER_MAX_BUDGET_USD` | Server-side ceiling on a scan's budget (default `5`); the engine clamps regardless of what the caller sends. |
| Engine (NUC) | `SCANNER_MAX_CONCURRENT_RUNS` | Hard cap on simultaneous scans (default `3`); over it, `POST /scans` returns `429`. |
| Website (Vercel) | `SCAN_BUDGET_DEFAULT` / `SCAN_BUDGET_MAX` | Default + clamp for the creator-set per-scan budget. |
| Website (Vercel) | `SCAN_MAX_ACTIVE` | Per-creator fair-share: max scans one creator may have in flight (default `3`). |

## Auth headers (every request)

```
Authorization: Bearer <SCANNER_SERVICE_TOKEN>
CF-Access-Client-Id: <SCANNER_CF_ACCESS_CLIENT_ID>        # if set
CF-Access-Client-Secret: <SCANNER_CF_ACCESS_CLIENT_SECRET> # if set
```

## Keys (BYOK)

Each creator brings their own Serper + Anthropic keys.

- **v1 (single creator = the owner):** keys live in the engine's own env on the NUC
  (`ProviderKeys` reads them, `keys.py`). The website sends **no keys** — `keys` is
  omitted from the start-scan body. This contract supports that today.
- **Later (multiple creators):** the start-scan body MAY include a `keys` object (below);
  the engine uses per-request keys instead of its env. Storing/encrypting those keys is a
  future phase; the field is reserved now so the contract doesn't change.

## Endpoints

### `POST /scans` — start a scan (returns immediately)

Request:

```json
{
  "question": "string, the plain-English landscape question",
  "budget_usd": 2.0,
  "model_profile": "default",
  "keys": { "serper": "...", "anthropic": "..." }
}
```

`model_profile` and `keys` are optional. The call must return promptly (well under the
website's 60s ceiling) — it starts the run in the background and does **not** block.

Response `200`:

```json
{ "run_id": "string", "state": "starting" }
```

### `GET /scans/{run_id}` — status snapshot (polled)

Mirrors the engine's `RunStatus` (`src/scanner/app/runner.py`).

```json
{
  "run_id": "string",
  "question": "string",
  "state": "starting | running | done | halted | error",
  "stage": "frame | discover | triage | profile | read",
  "detail": "human-readable progress line",
  "profiled": 0,
  "shortlist_total": 0,
  "spent_usd": 0.0,
  "budget_usd": 2.0,
  "error": "populated when state == error | halted"
}
```

### `GET /scans/{run_id}/report` — finished report

Returns the engine's `Report` as JSON. Valid only once `state == "done"`; otherwise `409`.
The website fetches this once on the `done` transition and caches it in the `scans` row, so
the report is served to the creator from Postgres thereafter (reports are private to the
creator; the owner also has back-end access via Supabase).

## Error shape

Non-2xx responses return `{ "error": "message" }`. The website surfaces the message.
