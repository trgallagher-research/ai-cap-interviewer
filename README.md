# Aligned Interviewer

**Aligned Interviewer** — AI-led interviews for qualitative research, built on
Anthropic's Claude models — three stages, end to end:

1. **Plan** — you give a topic and goals; Claude drafts an editable interview guide.
2. **Interview** — Claude conducts a real-time, adaptive, one-question-at-a-time
   conversation grounded in the guide, in the respondent's own words.
3. **Synthesize** — Claude analyses the transcript against the guide: emergent
   themes, illustrative verbatim quotes, and objective-by-objective coverage.

This is the **demo build**: a single Next.js app, state held in the browser, no
database — enough to run a convincing live interview and show stakeholders the
whole loop. Scale, persistence, consent flows, and a rigorous analysis pipeline
are deliberately out of scope (see `docs`/plan for the roadmap).

> 📄 **First live run:** see [`docs/first-test-run.md`](docs/first-test-run.md) —
> a real end-to-end interview (anonymized) showing the interviewer probing,
> following emergent threads, and producing a full synthesis.

## Stack

- **Next.js** (App Router) + **TypeScript** + **React 19**
- **`@anthropic-ai/sdk`** in server-side API routes
- Models: **Sonnet 4.6** for snappy live interview turns, **Opus 4.8** for the
  plan and synthesis stages

## Models & cost

Models are env-configurable (server-side), defaulting to **Sonnet 4.6** for live
interview turns and **Opus 4.8** for plan + synthesis:

| Env var | Default | Used by |
| --- | --- | --- |
| `MODEL_INTERVIEW` | `claude-sonnet-4-6` | live interview turns |
| `MODEL_REASONING` | `claude-opus-4-8` | plan + synthesis |

Set `MODEL_INTERVIEW=claude-haiku-4-5` for cheap plumbing tests, then switch back
for a real demo. (`effort` is auto-omitted on Haiku/Sonnet-4.5, which don't
support it.) The interview route uses **prompt caching** — the interviewer
system prompt and conversation prefix are cached across turns, so cost stays low
even though each turn resends the growing transcript. A full demo interview costs
roughly $0.20–0.40 on the defaults; pennies on Haiku.

## Run it

```bash
cp .env.local.example .env.local      # then add your ANTHROPIC_API_KEY
npm install
npm run dev                           # http://localhost:3000
```

## Access gate

Set **`APP_PASSCODE`** to require a shared passcode for the whole app — enforced
in `middleware.ts`, so it protects the API routes (the cost surface), not just
the UI. Visitors get a lock screen; the API returns `401` without a valid cookie.
Leave `APP_PASSCODE` unset to disable the gate (it fails open, so you can't lock
yourself out before configuring it). To enable on the deployed demo, add
`APP_PASSCODE` in Vercel → Settings → Environment Variables and redeploy.

## Deploy (shareable URL)

Configured for Vercel via `vercel.json` (Next.js framework, `lhr1` region —
London, close to UK/Europe respondents; change it in `vercel.json` if your
audience is elsewhere).

```bash
npm i -g vercel          # if you don't have the CLI
vercel                   # first run links/creates the project
vercel env add ANTHROPIC_API_KEY     # paste your key (Production + Preview)
vercel --prod            # deploy
```

Or connect the GitHub repo in the Vercel dashboard and add `ANTHROPIC_API_KEY`
under Project → Settings → Environment Variables.

**Plan note:** the API routes set `maxDuration = 60`, which fits the Vercel
**Hobby** plan. Streaming responses work on Vercel's Node runtime. On Pro you can
raise `maxDuration` in the route files if long transcripts ever need it.

## Other services in this repo

`training-log/` is a separate, standalone service (own `package.json`) that
ingests strength-training session files from Google Drive into a Google
Sheet — unrelated to the interviewer app, just hosted alongside it. See
[`training-log/README.md`](training-log/README.md).

## Layout

```
app/
  page.tsx              # stage router: plan → interview → synthesize
  layout.tsx, globals.css
  components/           # PlanStage, InterviewStage, SynthesisStage, chat UI
  api/
    plan/route.ts       # Opus → structured interview guide
    interview/route.ts  # Sonnet → streamed interviewer turns (SSE)
    synthesize/route.ts # Opus → structured analysis
lib/
  anthropic.ts          # SDK client + model constants
  prompts.ts            # interviewer persona + plan/synthesis prompts
  types.ts              # shared Guide / Transcript / Synthesis types
```
