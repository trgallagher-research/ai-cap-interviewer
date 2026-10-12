#!/usr/bin/env bash
# Stage 1 bootstrap: provisions the GCP project + service account this
# service authenticates as. Safe to re-run — every step checks current
# state first and skips what's already done.
#
# Run this from your own machine (not the NUC — Stage 2 deploy is separate
# and comes later). Requires a browser for the one-time `gcloud auth login`.
#
# Override any default by exporting the var before running, e.g.:
#   GCP_PROJECT_ID=my-training-log ./scripts/bootstrap-gcp.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TRAINING_LOG_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SECRETS_DIR="$TRAINING_LOG_DIR/secrets"
KEY_PATH="$SECRETS_DIR/service-account.json"
ENV_PATH="$TRAINING_LOG_DIR/.env"

SA_NAME="${SA_NAME:-training-log-ingest}"
DEFAULT_PROJECT_ID="training-log-ingest-$(date +%s | tail -c 6)"

say()   { printf '\n\033[1;36m==>\033[0m %s\n' "$1"; }
warn()  { printf '\033[1;33m!!\033[0m %s\n' "$1"; }
pause() { printf '\n\033[1;35m--- ACTION NEEDED ---\033[0m\n%s\n\033[1;35m---------------------\033[0m\n' "$1"; }

# ---------------------------------------------------------------------------
say "Checking for gcloud CLI"
if ! command -v gcloud >/dev/null 2>&1; then
  echo "gcloud is not installed."
  echo "Install it first: https://cloud.google.com/sdk/docs/install"
  exit 1
fi
echo "Found: $(gcloud --version | head -1)"

# ---------------------------------------------------------------------------
say "Checking gcloud authentication"
ACTIVE_ACCOUNT="$(gcloud auth list --filter=status:ACTIVE --format='value(account)' 2>/dev/null || true)"
if [[ -z "$ACTIVE_ACCOUNT" ]]; then
  pause "Touchpoint (a): browser sign-in required.
gcloud needs to authenticate as YOU (not the service account) to provision
the project. A browser window/tab will open — sign in with the Google
account that should own this project, then return here."
  read -rp "Press Enter to run 'gcloud auth login'..." _
  gcloud auth login
  ACTIVE_ACCOUNT="$(gcloud auth list --filter=status:ACTIVE --format='value(account)')"
fi
echo "Authenticated as: $ACTIVE_ACCOUNT"

# ---------------------------------------------------------------------------
say "Choosing a GCP project"
if [[ -z "${GCP_PROJECT_ID:-}" ]]; then
  read -rp "GCP project id to create/use [$DEFAULT_PROJECT_ID]: " GCP_PROJECT_ID
  GCP_PROJECT_ID="${GCP_PROJECT_ID:-$DEFAULT_PROJECT_ID}"
fi

if gcloud projects describe "$GCP_PROJECT_ID" >/dev/null 2>&1; then
  echo "Project '$GCP_PROJECT_ID' already exists — reusing it."
else
  echo "Creating project '$GCP_PROJECT_ID'..."
  gcloud projects create "$GCP_PROJECT_ID" --name="Training Log Ingest"
fi
gcloud config set project "$GCP_PROJECT_ID" >/dev/null

# ---------------------------------------------------------------------------
say "Enabling required APIs (Sheets, Drive, IAM)"
gcloud services enable \
  sheets.googleapis.com \
  drive.googleapis.com \
  iam.googleapis.com \
  --project="$GCP_PROJECT_ID"

# ---------------------------------------------------------------------------
say "Creating service account"
SA_EMAIL="${SA_NAME}@${GCP_PROJECT_ID}.iam.gserviceaccount.com"
if gcloud iam service-accounts describe "$SA_EMAIL" --project="$GCP_PROJECT_ID" >/dev/null 2>&1; then
  echo "Service account '$SA_EMAIL' already exists — reusing it."
else
  gcloud iam service-accounts create "$SA_NAME" \
    --display-name="Training Log Ingest" \
    --project="$GCP_PROJECT_ID"
fi

# ---------------------------------------------------------------------------
say "Generating service account key"
mkdir -p "$SECRETS_DIR"
if [[ -f "$KEY_PATH" ]]; then
  warn "Key already exists at $KEY_PATH — not regenerating (an old key would"
  warn "still work; delete the file first if you actually want a fresh one,"
  warn "and revoke the old key's id via 'gcloud iam service-accounts keys list')."
else
  gcloud iam service-accounts keys create "$KEY_PATH" \
    --iam-account="$SA_EMAIL" \
    --project="$GCP_PROJECT_ID"
  chmod 600 "$KEY_PATH"
  echo "Key written to $KEY_PATH (chmod 600, gitignored — never commit this file)."
fi

# ---------------------------------------------------------------------------
say "Writing .env"
if [[ -f "$ENV_PATH" ]]; then
  warn ".env already exists at $ENV_PATH — leaving it alone."
  warn "Make sure it has GOOGLE_APPLICATION_CREDENTIALS and GCP_PROJECT_ID set correctly:"
  echo "  GOOGLE_APPLICATION_CREDENTIALS=$KEY_PATH"
  echo "  GCP_PROJECT_ID=$GCP_PROJECT_ID"
else
  cp "$TRAINING_LOG_DIR/.env.example" "$ENV_PATH"
  # Fill in what this script already knows; leave SHEET_ID / INBOX_FOLDER_ID
  # blank until the sharing step below is done.
  sed -i.bak \
    -e "s#^GOOGLE_APPLICATION_CREDENTIALS=.*#GOOGLE_APPLICATION_CREDENTIALS=$KEY_PATH#" \
    -e "s#^GCP_PROJECT_ID=.*#GCP_PROJECT_ID=$GCP_PROJECT_ID#" \
    "$ENV_PATH"
  rm -f "$ENV_PATH.bak"
  echo "Created $ENV_PATH"
fi

# ---------------------------------------------------------------------------
pause "Touchpoint (b): share your Sheet + Drive folder with the service account.

Service account email:

    $SA_EMAIL

Do this now, in the Google Drive/Sheets UI (as yourself, in your own browser):

  1. Create (or open) the 'Training Master' Google Sheet in your own Drive.
     Click Share -> add: $SA_EMAIL -> role: Editor.
     Copy its Sheet ID from the URL:
       https://docs.google.com/spreadsheets/d/<SHEET_ID>/edit
     Put it in $ENV_PATH as SHEET_ID=<that id>

  2. Create (or choose) a Drive folder to use as the inbox.
     Click Share -> add: $SA_EMAIL -> role: Editor.
     Copy its folder ID from the URL:
       https://drive.google.com/drive/folders/<FOLDER_ID>
     Put it in $ENV_PATH as INBOX_FOLDER_ID=<that id>

The service account has no Drive storage of its own and can't create files
you can see unless you share something with it first — this step is required,
there's no way to automate it from here.
"

say "Bootstrap done"
cat <<EOF
Next steps, once you've filled in SHEET_ID and INBOX_FOLDER_ID in .env:

  cd $TRAINING_LOG_DIR
  npm install
  npm run init-sheet       # creates/validates the Log, Targets, Library tabs
  npm run verify-access    # confirms the service account can read/write both
  npm run dry-run -- --file test/fixtures/valid-session.json   # no network writes
EOF
