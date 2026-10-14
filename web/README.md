# AI at Work Diagnostic — web version

The website version of the diagnostic built first as a Claude artifact (`../prototype/`).
Members take a one-minute questionnaire and a short AI-led interview and get feedback; the organiser
sees the network map and a share-back page. The server holds the Anthropic key, the prompts and the
data; members never see the organiser's coding.

- Spec and API: `docs/contract.md`
- Shared logic (ported from the prototype, lift-out ready): `lib/aiwd/`
- Server: `app/api/`, `lib/llm.ts`, `lib/store.ts`, `middleware.ts`
- Pages: `/` (members), `/organiser`, `/network` (organiser, passcode)

## Put it on Vercel (about ten minutes, no code)

1. **Import the repo.** vercel.com → Add New → Project → import `trgallagher-research/ai-cap-interviewer`.
   - **Root Directory: `web`** (important; the repo root is the original aligned-interviewer copy).
   - Framework is detected as Next.js. Leave build settings as they are.
2. **Add storage.** In the new project: Storage → Marketplace → **Upstash for Redis** → create (free tier
   is plenty) → connect to this project. It adds the `KV_REST_API_*` variables itself.
3. **Add environment variables** (Settings → Environment Variables, Production and Preview):
   - `ANTHROPIC_API_KEY` — a key from console.anthropic.com. Consider a separate workspace with a monthly
     spend limit for this pilot.
   - `ORGANISER_PASSCODE` — a long passphrase for her pages.
   - Optional: `MEMBER_ACCESS_CODE` (members need it; the invite link `https://<site>/?code=<code>`
     fills it in), `GROQ_API_KEY` (turns on voice answers), `MAX_INTERVIEWS` (default 150).
4. **Deploy from this branch.** Vercel deploys the default branch to production. Either merge
   `claude/ai-literacy-diagnostic-prototype-suha28` into `main`, or set Settings → Git → Production Branch
   to that branch, then Redeploy. (Preview deployments are behind Vercel login by default, so members
   cannot open them; use the production URL.)
5. **Smoke test.** Open `/organiser`, sign in with the passcode, check the sample members show and no
   "memory storage" warning appears. Then do one interview yourself at `/` and check it appears.
6. **Domain (optional).** Settings → Domains, e.g. `diagnose.systeeminterventies.nl` with a CNAME at her
   DNS host.

## Cost

Each interview is roughly 8 to 12 model calls (short turns at low effort, one profile at medium effort);
the product read and share-back are one call each. Set a spend limit on the Anthropic workspace; the app
also caps total interviews (`MAX_INTERVIEWS`) and starts per IP address (5 per hour).

## Run locally

```bash
cp .env.local.example .env.local   # add ANTHROPIC_API_KEY and ORGANISER_PASSCODE
npm install
npm run dev                         # http://localhost:3000
```
Without Redis variables the data lives in memory and is lost on restart.
With `AIWD_MOCK_LLM=1` no key is needed: a scripted Claude answers (used by the tests).

## Tests

```bash
npm run typecheck && npm run test:unit
NODE_PATH=/opt/node22/lib/node_modules npm run test:e2e
```
