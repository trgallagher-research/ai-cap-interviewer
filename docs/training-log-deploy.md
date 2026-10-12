# Training log ingest — deployment runbook

**Status: Stage 1 only (provisioned, not yet deployed to the NUC).** This
file records *names and locations only*, **never secret values** — same
convention as `docs/scanner-deploy.md`.

## Components

- **Service** — `training-log-ingest` (TypeScript/Node, see `training-log/`
  in this repo). Watches a Drive inbox folder, appends parsed sessions to
  the "Training Master" Google Sheet's `Log` tab, refreshes `Targets`.
  Fully standalone — no dependency on the Next.js app or Vercel; it talks
  directly to Google APIs.
- **Auth** — a dedicated GCP service account (`training-log-ingest@<project>.iam.gserviceaccount.com`),
  provisioned via `training-log/scripts/bootstrap-gcp.sh`. Scoped to Sheets
  + Drive only, and only to the specific Sheet + folder shared with it —
  not a project-wide credential.
- **Stage 2 (not yet done):** runs as a `systemd --user` timer on the NUC
  (`claude-host`), see `training-log/deploy/`. No public network exposure —
  it only makes outbound calls to Google APIs, nothing is bound to a port.

## Secrets — where the values live

| Password-manager entry | Holds | Used as | Set in |
| --- | --- | --- | --- |
| **Training Log — service account key** | the full JSON key file | `GOOGLE_APPLICATION_CREDENTIALS` | `training-log/secrets/service-account.json` on whichever machine runs it (gitignored) |
| **Training Log — Sheet + folder IDs** | Sheet ID, inbox folder ID | `SHEET_ID`, `INBOX_FOLDER_ID` | `training-log/.env` (gitignored) |

There is no bearer token / tunnel / Cloudflare Access here (unlike the
scanner) — the service never accepts inbound requests, so there's nothing
to expose or rotate beyond the service account key itself. To rotate the
key: `gcloud iam service-accounts keys create` a new one, update `.env`,
then revoke the old key id (`gcloud iam service-accounts keys list` /
`... keys delete`).

## Stage 2 checklist (do later, not now)

- [ ] Copy `training-log/` + `secrets/service-account.json` + `.env` to the NUC (out of band, not git)
- [ ] `npm install` on the NUC
- [ ] Install `training-log-ingest.timer` / `.service` as a user systemd unit — see `training-log/deploy/README.md`
- [ ] `loginctl enable-linger` so it survives logout
- [ ] Confirm a few real ingest passes in `journalctl --user -u training-log-ingest.service`
