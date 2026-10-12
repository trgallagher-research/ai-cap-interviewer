# Scanner integration — deployment runbook

How the landscape-scanner integration is wired across the three places it lives, and —
importantly — **where each secret is kept** so it can always be found again. This file
records *names and locations only*, **never secret values**.

See `docs/scanner-service-contract.md` for the HTTP contract between the two sides.

## Components

- **Engine** — `landscape-scanner` (Python) running as the **`scanner-api` systemd service**
  (`deploy/scanner-api.service` → `scanner serve-api`) on the NUC (`claude-host`), bound to
  `127.0.0.1:8000`, reboot-safe. Provider keys live in its local `~/landscape-scanner/.env`;
  the app bearer token is supplied via the systemd `EnvironmentFile=/etc/landscape-scanner-api.env`
  (root-owned, chmod 600, not in git).
- **Tunnel** — a Cloudflare Tunnel exposes the engine at
  `https://scanner.alignedstudies.org`, fronted by **Cloudflare Access (service token)**
  so only the Vercel app can call it.
- **Website** — `aligned-interviewer` (Next.js) on Vercel: a thin, auth-gated proxy. If
  `SCANNER_SERVICE_URL` is unset the whole feature is simply hidden (fails closed).

## Secrets — where the values live

The actual values are in the **password manager**. This table is the index that maps each
secret to the password-manager entry holding it. (Values are never written here or in git.)

| Password-manager entry | Holds | Used as env var | Set in |
| --- | --- | --- | --- |
| **AlignED — Scanner service token** | one random hex string | `SCANNER_SERVICE_TOKEN` | the NUC engine **and** Vercel (Production + Preview) — the two must be identical |
| **AlignED — Scanner Cloudflare Access service token** | a client id + client secret | `SCANNER_CF_ACCESS_CLIENT_ID` / `SCANNER_CF_ACCESS_CLIENT_SECRET` | Vercel (Production + Preview) |
| **AlignED — Cloudflare API token (admin)** | one Cloudflare API token | — (not used at runtime) | nothing — manual/CLI admin only, for managing the Tunnel / Access / DNS. Scopes: Tunnel·Edit, Access Apps&Policies·Edit, Access Service Tokens·Edit, DNS·Edit, Zone·Read on `alignedstudies.org` |

Scan **provider keys** (Serper, Anthropic) are the *owner's own* keys (BYOK v1), kept only
in the NUC's local `~/landscape-scanner/.env` (gitignored). They are **not** in Vercel.

## Env vars

- **Website (Vercel project `aligned-interviewer`):** `SCANNER_SERVICE_URL`,
  `SCANNER_SERVICE_TOKEN`, `SCANNER_CF_ACCESS_CLIENT_ID`, `SCANNER_CF_ACCESS_CLIENT_SECRET`,
  plus optional `SCAN_BUDGET_DEFAULT` / `SCAN_BUDGET_MAX` / `SCAN_MAX_ACTIVE`.
- **Engine (NUC):** `SCANNER_SERVICE_TOKEN` must be a *real environment variable* (it is
  read from the process env, not from `.env`) — provided by the systemd unit's
  `EnvironmentFile=/etc/landscape-scanner-api.env`. Optional there too:
  `SCANNER_MAX_BUDGET_USD` / `SCANNER_MAX_CONCURRENT_RUNS`. Provider keys come from `.env`.

## Rotating the service token

Regenerate (`openssl rand -hex 32`), update **both** the NUC engine env and the Vercel
vars to the new value, update the **AlignED — Scanner service token** password-manager
entry, then restart the engine and redeploy the website.
