# training-log-ingest

Watches a Google Drive "inbox" folder for strength-training session files,
appends their sets to the **Training Master** Google Sheet's `Log` tab,
refreshes the `Targets` snapshot, then archives the file. Single-user,
metric (kg) throughout, designed to eventually run unattended on an
always-on NUC.

This directory is fully standalone — its own `package.json`, no dependency
on the Next.js app elsewhere in this repo. See the root
[`docs/training-log-deploy.md`](../docs/training-log-deploy.md) for the
deployment-runbook-style secret index once Stage 2 happens.

## How it fits together

```
Drive inbox folder
  └─ session.json  ──┐
                      ▼
              download + hash (dedupe)
                      │
                 parse (zod schema)
                      │
        reconcile exercise names against Library
                      │
              ┌───────┴───────┐
          ok? │               │ no
              ▼               ▼
   append rows to Log    move to _quarantine/
   upsert rows in Targets  + reason on the file
   move to _archive/       + logged
```

Bad input never crashes the loop — it's quarantined with a reason and the
run continues. A local ledger (content-hash keyed) makes re-running always
safe: a file already appended is never appended twice, even if the process
crashes mid-run.

## Stage 1 vs Stage 2

- **Stage 1 (this):** provision the GCP service account, build + test the
  service. Runs fine by hand from any machine (`npm run run`, or
  `npm run watch` to poll continuously) — nothing here requires the NUC.
- **Stage 2 (later, scaffolded but not installed):** deploy as a
  `systemd --user` timer on the NUC. See `deploy/README.md`.

---

## Setup (Stage 1)

### 1. Provision GCP

```bash
cd training-log
./scripts/bootstrap-gcp.sh
```

This is interactive and safe to re-run. It will pause at two points that
need you:

- **(a)** a one-time `gcloud auth login` browser sign-in, so the script can
  provision the project as you.
- **(b)** after creating the service account, it prints the service
  account's email and stops — you then need to, by hand, in the Drive/Sheets
  UI:
  1. Create (or open) the "Training Master" Google Sheet in your own Drive,
     share it with that email as **Editor**, and put its Sheet ID (from the
     URL) into `.env` as `SHEET_ID`.
  2. Create (or choose) a Drive folder to use as the inbox, share it with
     the same email as **Editor**, and put its folder ID into `.env` as
     `INBOX_FOLDER_ID`.

  This can't be automated: the service account has no Drive storage of its
  own, so it can only see what you explicitly share with it.

### 2. Install + verify

```bash
npm install
npm run init-sheet        # creates/validates the Log, Targets, Library tabs
npm run verify-access     # confirms read/write access to both the Sheet and the folder
```

`init-sheet` creates `Log`, `Targets`, `Library` with the right header row
if the tabs don't exist yet, and creates empty `PT_Brief` / `README` tabs if
missing (their content is yours — the service never touches them). If a tab
already exists with a *different* header row, it's reported, not
overwritten — fix it by hand.

### 3. Add exercises to the Library tab

The parser reconciles every exercise name against `Library` — deterministic
exact match (case-insensitive) against the canonical name or a Dutch alias,
never a fuzzy guess. Add rows before ingesting anything:

| Canonical Exercise | Alias (Dutch) | Progression Step (kg) | RPE Ceiling | Category | Notes |
| --- | --- | --- | --- | --- | --- |
| Bench Press | Bankdrukken | 2.5 | 8.5 | Push | |
| Back Squat | Squat, Hurkzit | 2.5 | 8.5 | Legs | |
| Deadlift | Kniebuiging optrekken, Deadlift | 5 | 8 | Legs | |

Multiple Dutch aliases can go in one cell, comma-separated. Blank
`Progression Step` / `RPE Ceiling` fall back to 2.5kg / 8.5.

### 4. Try it without touching Drive at all

```bash
npm run dry-run -- --file test/fixtures/valid-session.json --offline
```

This parses, reconciles (against the bundled sample Library fixture), and
prints exactly what would be written — no Google credentials needed at all.
Once `.env` is set up, drop `--offline` to preview against your real
Library + Targets instead.

```bash
npm run validate -- --file path/to/session.json   # schema-only check, always offline
```

### 5. Run for real

```bash
npm run run      # one pass over the inbox
npm run watch     # loop `run` every POLL_INTERVAL_SECONDS (default 90s)
```

Drop a session file into the shared inbox folder and run `npm run run` — it
should show up appended in `Log` and the file should move into the
folder's `_archive` subfolder (created automatically on first run).

---

## Inbox file schema

**This is the contract a logging assistant (chat, voice, whatever) needs to
target.** One file = one session. JSON was chosen over CSV/plain text
specifically because it's the format an LLM can most reliably emit without
drifting from the schema.

```json
{
  "schema_version": 1,
  "date": "2026-07-06",
  "source": "HYP",
  "block": "Hypertrophy Block 3",
  "session": "Push A",
  "exercises": [
    {
      "order": 1,
      "exercise": "Bench Press",
      "load_kg": 80,
      "scheme": "4x8",
      "reps": [8, 8, 8, 8],
      "rpe": 8,
      "notes": null
    }
  ],
  "session_notes": "Felt strong on bench."
}
```

| Field | Type | Notes |
| --- | --- | --- |
| `schema_version` | `1` | Literal `1`. A future breaking change bumps this; the parser rejects anything else. |
| `date` | `"YYYY-MM-DD"` | |
| `source` | `"HYP"` \| `"PT"` | |
| `block` | string | Free text, e.g. training block/phase name. |
| `session` | string | Free text, e.g. "Push A". |
| `exercises` | array, min 1 | See below. |
| `session_notes` | string \| null, optional | Attached to the first Log row of the session only. |

Each entry in `exercises`:

| Field | Type | Notes |
| --- | --- | --- |
| `order` | positive int | Exercise order within the session. Becomes the Log `Order` column. |
| `exercise` | string | Must resolve against `Library` (canonical name or Dutch alias), case-insensitive exact match. |
| `load_kg` | number ≥ 0 | Metric only. |
| `scheme` | string | e.g. `"4x8"`. Anything matching `\d+x\d+` gets an auto-computed next-session target; anything else (`"AMRAP"`, `"3x8-10"`) still logs fine, it just has no computed target. |
| `reps` | array of ints, min 1 | Actual reps performed, one entry per set. |
| `rpe` | number 0–10, nullable, optional | |
| `notes` | string, nullable, optional | Per-exercise notes. |

File name doesn't matter — content is what's validated — but
`YYYY-MM-DD_session-slug.json` is a sane convention.

### What the service computes for you

- **`Target next`** (Log) / **`Target Load (kg)` + `Target Scheme`** (Targets):
  a simple double-progression heuristic — if every set met or beat the
  scheme's target reps at an RPE at or under the Library's `RPE Ceiling`,
  next session's load goes up by `Progression Step (kg)`; otherwise it
  repeats. This is intentionally simple (v1) — it is **not** the PT
  coach-loop (see Roadmap below), just enough to keep `Targets` from going
  stale between sessions.
- **`Flags`**: `progress` / `repeat-missed` / `repeat-rpe-high` /
  `scheme-unparsed` / `set-count-differs` / `PR` / `alias-match`
  (comma-separated, any combination that applies).

---

## CLI reference

| Command | Needs Google creds? | What it does |
| --- | --- | --- |
| `npm run run` | yes | One pass over the inbox. |
| `npm run watch` | yes | Loops `run` every `POLL_INTERVAL_SECONDS`. |
| `npm run dry-run -- --file <path> [--offline]` | optional | Preview what a local session file would write. Falls back to a bundled sample Library if creds aren't configured or `--offline` is passed. |
| `npm run validate -- --file <path>` | no | Schema-only check, always fully offline. |
| `npm run init-sheet` | yes | Create/validate `Log` / `Targets` / `Library` tabs + headers. |
| `npm run recompute-targets` | yes | Rebuilds `Targets` from scratch by scanning the entire `Log` tab — the recovery path if a per-file Targets refresh ever fails (see below), and a good sanity check after manually editing the Sheet. Idempotent. |
| `npm run verify-access` | yes | Confirms the service account can read/write the configured Sheet + inbox folder. |
| `npm run typecheck` | no | `tsc --noEmit`. |
| `npm test` | no | Offline unit tests (`node:test`), no network calls. |

---

## Idempotency & resilience

- **Dedup key:** SHA-256 of the file's raw content, tracked in a local JSON
  ledger (`data/ledger.json`, gitignored). A file is only ever appended to
  `Log` once per unique content hash.
- **Durability boundary:** the ledger is written to disk immediately after
  the `Log` append succeeds — before `Targets` is touched or the file is
  archived. So a crash right after that point can never cause a
  double-append on retry.
- **Orphan recovery:** if a file is stuck in the inbox because a previous
  run's archive-move failed (but its content was already appended), the
  next run recognizes it by file ID (not just content hash) and retries the
  archive move — no Sheet writes happen again.
- **True duplicates:** if the *same content* shows up in a *different*
  file (re-uploaded by mistake), it's moved to `_duplicates/` without
  touching the Sheet at all.
- **Quarantine:** malformed JSON, schema violations, and unresolved
  exercise names all route to `_quarantine/` with the reason written both
  to the Drive file's description and to the logs. Quarantining never
  touches the Sheet, so it's inherently safe to retry (e.g. after fixing
  the Library) — just move the file back into the inbox.
- **Targets refresh failures:** the `Log` append is the operation that must
  never repeat; the `Targets` upsert is best-effort per run (logged loudly
  on failure) because it's always fully recoverable by scanning `Log` —
  that's exactly what `recompute-targets` does.

## Observability

Structured JSON-lines logs to stdout/stderr (`LOG_LEVEL`, default `info`) —
plays nicely with `journalctl` under systemd, no rotation/file handling
needed. Every run ends with a summary line: files seen, appended,
quarantined, duplicates, orphans recovered, Targets-refresh failures,
unexpected errors.

## Testing locally without a real Drive event

- `npm test` — pure offline unit tests for parsing, reconciliation, the
  progression heuristic, and the ledger.
- `npm run dry-run -- --file test/fixtures/valid-session.json --offline` —
  full pipeline (minus network calls) against the bundled sample fixtures
  in `test/fixtures/`. There's also `invalid-missing-field.json` and
  `invalid-unknown-exercise.json` to see the quarantine paths.

## Roadmap (deliberately not built yet)

- **PT coach-loop briefs** from recent data, populating the `PT_Brief` tab.
- **Pushing structured workouts to Garmin.**
- **Stage 2 NUC deployment** — scaffolded in `deploy/`, not installed.

## Layout

```
training-log/
  scripts/bootstrap-gcp.sh   Stage 1 GCP provisioning (idempotent, interactive)
  src/
    config.ts, logger.ts
    google/                  thin auth/sheets/drive API wrappers
    sheet/                   tab schema, Library index, Log row builder,
                              Targets progression heuristic + recompute
    ingest/                  inbox JSON schema, parser, reconciler, ledger,
                              pipeline orchestration, dry-run
    cli.ts
  test/                      offline unit tests + fixtures
  deploy/                    Stage 2 systemd scaffold (not installed)
```
