# Stage 2 — NUC deployment (not run yet)

This is a scaffold for later, when you're ready to move the service onto
the always-on NUC (`claude-host`). Nothing here needs to run for Stage 1 —
the ingestion service works fine invoked by hand (`npm run run`) or in
`watch` mode from any machine with the `.env` + service account key.

## When you're ready

1. Clone/copy this repo (or just the `training-log/` directory) onto the
   NUC. `npm install` there.
2. Copy the service account key (`secrets/service-account.json`) and `.env`
   over **out of band** (`scp`, not git — they're gitignored on purpose).
   Adjust `GOOGLE_APPLICATION_CREDENTIALS` in `.env` if the path differs.
3. Edit `training-log-ingest.service`'s `WorkingDirectory` to the real path
   on the NUC.
4. Install as a **user** systemd unit (no root needed — this only touches
   your own Sheet and Drive folder):
   ```bash
   mkdir -p ~/.config/systemd/user
   cp deploy/training-log-ingest.service deploy/training-log-ingest.timer \
     ~/.config/systemd/user/
   systemctl --user daemon-reload
   systemctl --user enable --now training-log-ingest.timer
   loginctl enable-linger $USER    # keeps it running when you're logged out
   ```
5. Check it's alive:
   ```bash
   systemctl --user status training-log-ingest.timer
   journalctl --user -u training-log-ingest.service -f
   ```

## Why a timer instead of `watch`

`npm run watch` (a long-running poll loop) works fine for local testing, but
on the NUC a `oneshot` service triggered by a timer is more resilient:
systemd restarts cleanly on every tick regardless of what happened last run,
there's no long-lived process to leak memory or wedge, and `journalctl`
gives you a clean per-run log boundary for free. Swap to a `watch`-based
`Type=simple` unit later if polling latency ever needs to be tighter than
the timer's granularity — the ledger design (Stage 1) already makes either
safe to run concurrently-adjacent (a run overlapping a slow prior run just
sees fewer files, nothing double-processes).

## Secrets — where the values live (fill in once real, mirrors docs/training-log-deploy.md)

Keep the actual values in a password manager, not here or in git — see
`docs/training-log-deploy.md` in the repo root for the index once this is
live.
