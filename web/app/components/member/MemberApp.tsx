"use client";

/* The member's screens: landing → quick questions → interview → ratings → feedback.
 * Port of prototype/src/member.js onto the server API (web/docs/contract.md). The server owns the
 * prompts, the interview state and the profile; this component only renders and sends answers. */

import { useCallback, useEffect, useRef, useState } from "react";
import { formatRatingsTurn } from "@/lib/aiwd/prompts";
import { VoiceButton } from "@/app/components/VoiceButton";
import * as api from "./api";
import type { AppConfig, FinishResponse, RateItem, Turn } from "./api";
import { PhaseHint } from "./PhaseHint";
import { Questionnaire, type Answers } from "./Questionnaire";
import { RateCard } from "./RateCard";

const LS_ID = "aiwd.interviewId";
const LS_DRAFT = "aiwd.draft";
const SS_CODE = "aiwd.accessCode";

type Screen = "landing" | "questionnaire" | "interview" | "preparing" | "feedback" | "finishError";
type Member = { name: string; role: string };
type UITurn = Turn & { ratings?: boolean };
type DraftCard =
  | { kind: "questionnaire"; member: Member; answers: Answers }
  | { kind: "interview"; member: Member; n: number; id: string; finished: boolean };

// --- storage helpers (every access wrapped: private mode, blocked storage) ---
function lsGet(k: string): string | null {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}
function lsSet(k: string, v: string) {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* ignore */
  }
}
function lsDel(k: string) {
  try {
    localStorage.removeItem(k);
  } catch {
    /* ignore */
  }
}
function ssGet(k: string): string | null {
  try {
    return sessionStorage.getItem(k);
  } catch {
    return null;
  }
}
function ssSet(k: string, v: string) {
  try {
    sessionStorage.setItem(k, v);
  } catch {
    /* ignore */
  }
}

/** Never show a marker, even if one slipped through a stream. */
function visible(text: string): string {
  const i = text.indexOf("<<");
  return (i === -1 ? text : text.slice(0, i)).replace(/\s+$/, "");
}
const isRatingsText = (t: Turn) => t.role === "member" && /^My confidence ratings/.test(t.text);
const isOpenChip = (t: string) => /^something else\b|^other\b/i.test(t.trim());

function errorMessage(e: unknown): { message: string; label: string } {
  const err = e as api.ApiError;
  const code = err && err.code;
  switch (code) {
    case "busy":
      return { message: "Your previous answer is still being handled. Wait a moment, then try again.", label: "Try again" };
    case "rate_limited":
      return { message: "Too many interviews were started from this connection in the last hour. Please try again later.", label: "Try again" };
    case "overloaded":
      return { message: "Claude is busy right now. Wait a moment, then try again.", label: "Try again" };
    case "full":
      return { message: "This pilot has reached its maximum number of interviews. Please let the organiser know.", label: "Try again" };
    case "access_code":
      return { message: "That access code was not accepted. Check the code in your invitation and try again.", label: "Try again" };
    case "refusal":
      return { message: err.message || "Claude declined to answer this one. Please rephrase your last answer, or stop here.", label: "Try again" };
    case "limit":
      return { message: "This interview has reached its length limit. Please choose \u201cI'd like to stop here\u201d below to get your feedback.", label: "Try again" };
    case "failed":
      return { message: "Something went wrong while Claude was answering. Your answer is saved; try again.", label: "Retry" };
    default:
      return {
        message: "Something went wrong while Claude was answering: " + (err && err.message ? err.message : String(e)) + ".",
        label: "Retry",
      };
  }
}

export function MemberApp() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [screen, setScreen] = useState<Screen>("landing");
  const [ready, setReady] = useState(false);
  const [draftCard, setDraftCard] = useState<DraftCard | null>(null);

  // landing
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [landingError, setLandingError] = useState<{ field: "name" | "role" | "code"; text: string } | null>(null);

  // questionnaire
  const [member, setMember] = useState<Member | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<{ message: string; code?: string } | null>(null);

  // interview
  const [interviewId, setInterviewId] = useState<string | null>(null);
  const [turns, setTurns] = useState<UITurn[]>([]);
  const [streaming, setStreaming] = useState<string | null>(null);
  const [phase, setPhase] = useState("orient");
  const [status, setStatus] = useState("in_progress");
  const [chips, setChips] = useState<string[] | null>(null);
  const [rateItems, setRateItems] = useState<RateItem[] | null>(null);
  const [rateSubmitted, setRateSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [turnError, setTurnError] = useState<{ message: string; label: string } | null>(null);
  const [stopConfirm, setStopConfirm] = useState(false);
  const [composer, setComposer] = useState("");

  // completion
  const [finish, setFinish] = useState<FinishResponse | null>(null);
  const [finishError, setFinishError] = useState<string | null>(null);

  const busyRef = useRef(false);
  const idRef = useRef<string | null>(null);
  const streamRef = useRef("");
  const lastEndNowRef = useRef(false);
  const chatRef = useRef<HTMLDivElement | null>(null);
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const nameRef = useRef<HTMLInputElement | null>(null);
  const roleRef = useRef<HTMLInputElement | null>(null);
  const codeRef = useRef<HTMLInputElement | null>(null);

  // ---------------------------------------------------------------------------
  // Boot: invite code from the URL, config, and any unfinished interview on this device
  // ---------------------------------------------------------------------------
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      if (code) {
        ssSet(SS_CODE, code);
        url.searchParams.delete("code");
        window.history.replaceState(null, "", url.pathname + (url.search ? url.search : "") + url.hash);
      }
    } catch {
      /* ignore */
    }
    setAccessCode(ssGet(SS_CODE) || "");
    api
      .getConfig()
      .then(setConfig)
      .catch(() => setConfig({ voice: false, memberCodeRequired: false, storage: "redis" }));

    (async () => {
      const id = lsGet(LS_ID);
      if (id) {
        try {
          const st = await api.getState(id);
          setDraftCard({
            kind: "interview",
            id,
            member: st.member,
            n: st.turns.filter((t) => t.role === "member").length,
            finished: st.finished || st.status === "complete" || st.status === "ended_early",
          });
        } catch (e) {
          if ((e as api.ApiError).status === 404) lsDel(LS_ID);
        }
      } else {
        const raw = lsGet(LS_DRAFT);
        if (raw) {
          try {
            const d = JSON.parse(raw) as { member?: Member; answers?: Answers };
            if (d && d.member && d.member.name) setDraftCard({ kind: "questionnaire", member: d.member, answers: d.answers || {} });
          } catch {
            lsDel(LS_DRAFT);
          }
        }
      }
      setReady(true);
    })();
  }, []);

  // Keep the newest message in view.
  useEffect(() => {
    const last = chatRef.current?.lastElementChild;
    if (last && last.scrollIntoView) last.scrollIntoView({ block: "end", behavior: "auto" });
  }, [turns.length, streaming, chips, rateItems, turnError]);

  // Focus the answer box whenever it becomes usable again.
  useEffect(() => {
    if (screen === "interview" && !busy && taRef.current && !rateItems) {
      try {
        taRef.current.focus({ preventScroll: true });
      } catch {
        /* ignore */
      }
    }
  }, [busy, screen, rateItems]);

  const resetAll = useCallback(() => {
    lsDel(LS_ID);
    lsDel(LS_DRAFT);
    idRef.current = null;
    busyRef.current = false;
    setInterviewId(null);
    setMember(null);
    setAnswers({});
    setTurns([]);
    setStreaming(null);
    setPhase("orient");
    setStatus("in_progress");
    setChips(null);
    setRateItems(null);
    setRateSubmitted(false);
    setBusy(false);
    setTurnError(null);
    setStopConfirm(false);
    setComposer("");
    setFinish(null);
    setFinishError(null);
    setStartError(null);
    setDraftCard(null);
    setName("");
    setRole("");
    setScreen("landing");
    if (typeof window !== "undefined") window.scrollTo(0, 0);
  }, []);

  // ---------------------------------------------------------------------------
  // Landing
  // ---------------------------------------------------------------------------
  function onLandingSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nm = name.trim();
    const rl = role.trim();
    if (!nm) {
      setLandingError({ field: "name", text: "Please give a first name." });
      nameRef.current?.focus();
      return;
    }
    if (!rl) {
      setLandingError({ field: "role", text: "Please describe your role in one line." });
      roleRef.current?.focus();
      return;
    }
    if (config?.memberCodeRequired && !accessCode.trim()) {
      setLandingError({ field: "code", text: "Please enter the access code from your invitation." });
      codeRef.current?.focus();
      return;
    }
    setLandingError(null);
    if (accessCode.trim()) ssSet(SS_CODE, accessCode.trim());
    lsDel(LS_ID);
    const m = { name: nm, role: rl };
    setMember(m);
    setAnswers({});
    setStartError(null);
    lsSet(LS_DRAFT, JSON.stringify({ stage: "questionnaire", member: m, answers: {} }));
    setDraftCard(null);
    setScreen("questionnaire");
    window.scrollTo(0, 0);
  }

  function onQuestionnaireChange(a: Answers) {
    setAnswers(a);
    if (member) lsSet(LS_DRAFT, JSON.stringify({ stage: "questionnaire", member, answers: a }));
  }

  async function onQuestionnaireSubmit(a: Answers) {
    if (!member || starting) return;
    setStarting(true);
    setStartError(null);
    try {
      const code = accessCode.trim() || undefined;
      const { interviewId: id } = await api.startInterview({ name: member.name, role: member.role, answers: a, accessCode: code });
      lsSet(LS_ID, id);
      lsDel(LS_DRAFT);
      idRef.current = id;
      setInterviewId(id);
      setTurns([]);
      setPhase("orient");
      setStatus("in_progress");
      setChips(null);
      setRateItems(null);
      setRateSubmitted(false);
      setScreen("interview");
      window.scrollTo(0, 0);
      void runTurn({});
    } catch (e) {
      const err = e as api.ApiError;
      setStartError({ message: errorMessage(err).message, code: err.code });
    } finally {
      setStarting(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Interview
  // ---------------------------------------------------------------------------
  function applyState(st: api.InterviewStateResponse) {
    setTurns(st.turns.filter((t) => !(t.role === "member" && /^\[.*\]$/.test(t.text.trim()))).map((t) => ({ ...t, ratings: isRatingsText(t) })));
    setPhase(st.phase || "orient");
    setStatus(st.status);
    setRateSubmitted(!!st.ratingsSubmitted);
    const rating = st.status === "rating" && !!st.rateItems && !st.ratingsSubmitted;
    setRateItems(rating ? st.rateItems : null);
    setChips(!rating && st.status === "in_progress" && st.chips && st.chips.length ? st.chips : null);
  }

  /** One interviewer turn. Extra fields go with {interviewId}; a retry sends {interviewId} only. */
  async function runTurn(extra: { answer?: string; tapped?: boolean; ratings?: Record<string, number>; endNow?: boolean }) {
    const id = idRef.current;
    if (!id || busyRef.current) return;
    busyRef.current = true;
    lastEndNowRef.current = !!extra.endNow;
    setBusy(true);
    setTurnError(null);
    setChips(null);
    streamRef.current = "";
    setStreaming("");
    let done: api.TurnDone;
    try {
      done = await api.runTurn({ interviewId: id, ...extra }, (t) => {
        streamRef.current += t;
        setStreaming(streamRef.current);
      });
    } catch (e) {
      busyRef.current = false;
      setStreaming(null);
      setBusy(false);
      const err = e as api.ApiError;
      if (err.code === "nothing_to_answer" || err.code === "finished" || err.code === "awaiting_ratings" || err.code === "not_rating") {
        await resync();
        return;
      }
      // During a turn, a rate limit is Claude's, not the per-connection start limit.
      setTurnError(errorMessage(err.code === "rate_limited" ? Object.assign(err, { code: "overloaded" }) : err));
      return;
    }
    const text = visible(typeof done.text === "string" && done.text ? done.text : streamRef.current);
    streamRef.current = "";
    lastEndNowRef.current = false;
    if (text) setTurns((p) => [...p, { role: "interviewer", text }]);
    setStreaming(null);
    if (done.phase) setPhase(done.phase);
    busyRef.current = false;
    setBusy(false);
    if (done.complete) {
      setChips(null);
      setRateItems(null);
      setStatus("complete");
      void complete();
      return;
    }
    if (done.rateItems && done.rateItems.length && !rateSubmittedRef.current) {
      setChips(null);
      setStatus("rating");
      setRateItems(done.rateItems);
      return;
    }
    setStatus("in_progress");
    setChips(done.chips && done.chips.length ? done.chips : null);
  }
  const rateSubmittedRef = useRef(false);
  rateSubmittedRef.current = rateSubmitted;

  /** Bring the page in line with the server, then do whatever the interview is waiting for. */
  async function resync(): Promise<void> {
    const id = idRef.current;
    if (!id) return;
    let st: api.InterviewStateResponse;
    setBusy(true); // the composer stays locked while the page catches up with the server
    try {
      st = await api.getState(id);
    } catch (e) {
      setBusy(false);
      setTurnError(errorMessage(e));
      return;
    } finally {
      if (!busyRef.current) setBusy(false);
    }
    // An answer the server never recorded (e.g. a "busy" refusal) goes back into the box.
    const lastLocal = [...turnsRef.current].reverse().find((t) => t.role === "member" && !t.ratings);
    const serverHas = lastLocal && st.turns.some((t) => t.role === "member" && t.text === lastLocal.text);
    if (lastLocal && !serverHas && !composerRef.current.trim()) setComposer(lastLocal.text);
    applyState(st);
    rateSubmittedRef.current = !!st.ratingsSubmitted;
    if (st.finished || st.status === "complete" || st.status === "ended_early") {
      void complete();
      return;
    }
    if (st.status === "rating" && st.rateItems && !st.ratingsSubmitted) return;
    const last = st.turns[st.turns.length - 1];
    if (!last || last.role === "member") {
      void runTurn({});
      return;
    }
    if (lastEndNowRef.current) void runTurn({ endNow: true });
  }
  const turnsRef = useRef<UITurn[]>([]);
  turnsRef.current = turns;
  const composerRef = useRef("");
  composerRef.current = composer;

  function retry() {
    setTurnError(null);
    void resync();
  }

  /** The one path for a member answer: typed or tapped chip. */
  function sendText(raw: string, opts: { tapped?: boolean } = {}): boolean {
    if (busyRef.current) return false;
    const text = String(raw || "").trim();
    if (!text) return false;
    setChips(null);
    setTurnError(null);
    setStopConfirm(false);
    setTurns((p) => [...p, { role: "member", text, ...(opts.tapped ? { tapped: true } : {}) }]);
    void runTurn(opts.tapped ? { answer: text, tapped: true } : { answer: text });
    return true;
  }

  function send() {
    if (sendText(composer)) setComposer("");
  }

  function onChip(t: string) {
    if (isOpenChip(t)) {
      // An open option: let the member type their own answer.
      setChips(null);
      taRef.current?.focus();
      return;
    }
    if (composer.trim()) {
      // Typed text wins over a tap.
      if (sendText(composer)) setComposer("");
      return;
    }
    sendText(t, { tapped: true });
  }

  function submitRatings(ratings: Record<string, number>) {
    if (rateSubmittedRef.current || !rateItems) return;
    rateSubmittedRef.current = true;
    setRateSubmitted(true);
    const text = formatRatingsTurn(rateItems as never, ratings as never) as string;
    setTurns((p) => [...p, { role: "member", text, ratings: true }]);
    setRateItems(null);
    setStatus("in_progress");
    setPhase("close");
    void runTurn({ ratings });
  }

  function confirmStop() {
    setStopConfirm(false);
    if (rateItems && !rateSubmittedRef.current) setRateItems(null);
    setChips(null);
    void runTurn({ endNow: true });
  }

  // ---------------------------------------------------------------------------
  // Completion
  // ---------------------------------------------------------------------------
  async function complete() {
    const id = idRef.current;
    if (!id) return;
    setScreen("preparing");
    setFinishError(null);
    window.scrollTo(0, 0);
    try {
      const res = await api.finishInterview(id);
      setFinish(res);
      setScreen("feedback");
      window.scrollTo(0, 0);
    } catch (e) {
      setFinishError(errorMessage(e).message.replace("while Claude was answering", "while preparing your feedback"));
      setScreen("finishError");
    }
  }

  // ---------------------------------------------------------------------------
  // Resume
  // ---------------------------------------------------------------------------
  async function continueDraft() {
    const d = draftCard;
    if (!d) return;
    if (d.kind === "questionnaire") {
      setMember(d.member);
      setAnswers(d.answers);
      setDraftCard(null);
      setScreen("questionnaire");
      return;
    }
    idRef.current = d.id;
    setInterviewId(d.id);
    setMember(d.member);
    let st: api.InterviewStateResponse;
    try {
      st = await api.getState(d.id);
    } catch (e) {
      setLandingError({ field: "name", text: errorMessage(e).message });
      return;
    }
    setDraftCard(null);
    setMember(st.member);
    setAnswers((st.answers || {}) as Answers);
    applyState(st);
    rateSubmittedRef.current = !!st.ratingsSubmitted;
    if (st.finished || st.status === "complete" || st.status === "ended_early") {
      void complete();
      return;
    }
    setScreen("interview");
    const last = st.turns[st.turns.length - 1];
    if (st.status === "rating" && st.rateItems && !st.ratingsSubmitted) return;
    if (!last || last.role === "member") void runTurn({}); // a turn was in flight when the page was left
  }

  function startOver() {
    lsDel(LS_ID);
    lsDel(LS_DRAFT);
    setDraftCard(null);
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  if (screen === "landing") {
    const d = draftCard;
    let where = "";
    if (d && d.kind === "questionnaire") where = "the quick questions are not finished yet.";
    else if (d && d.kind === "interview")
      where = d.finished ? "your interview is finished." : `${d.n} answer${d.n === 1 ? "" : "s"} in the conversation so far.`;
    return (
      <div className="stack" id="landing">
        <div className="stack-sm">
          <p className="eyebrow">For members of Systeeminterventies</p>
          <h1>How does AI show up in your work?</h1>
        </div>
        <p className="lead">
          This takes about 8 to 10 minutes: a minute of quick questions, then a short conversation in English with an AI interviewer. It is about how
          AI tools do or do not show up in your work: what you actually do, what you have learned, and where your edges are. There are no right
          answers. People who never use AI are as interesting to us as daily users.
        </p>
        <p className="lead">
          Near the end you rate your confidence on a few tasks drawn from your own practice. You then get personal feedback you can act on. The
          organiser can read what you said, with your first name, and sees a map of the whole network built from everyone&apos;s interviews.
        </p>

        {d && (
          <div className="card stack-sm" id="draft-card">
            <p className="eyebrow">{d.kind === "interview" && d.finished ? "Finished interview" : "Unfinished interview"}</p>
            <p>
              {d.member.name || "You"} ({d.member.role || "no role given"}): {where}
            </p>
            <div className="row">
              <button className="btn primary" id="btn-continue" type="button" onClick={continueDraft}>
                {d.kind === "interview" && d.finished ? "Show the feedback" : "Continue your interview"}
              </button>
              <button className="btn" id="btn-startover" type="button" onClick={startOver}>
                Start again
              </button>
            </div>
          </div>
        )}

        <form className="stack" id="start-form" onSubmit={onLandingSubmit} noValidate>
          <label className="field" htmlFor="f-name">
            First name
            <input
              ref={nameRef}
              className="input"
              id="f-name"
              type="text"
              autoComplete="given-name"
              placeholder="Anneke"
              required
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="field" htmlFor="f-role">
            Your role in one line
            <input
              ref={roleRef}
              className="input"
              id="f-role"
              type="text"
              placeholder="team coach, mostly healthcare organisations"
              required
              maxLength={140}
              value={role}
              onChange={(e) => setRole(e.target.value)}
            />
          </label>
          {config?.memberCodeRequired && (
            <label className="field" htmlFor="f-code">
              Access code
              <input
                ref={codeRef}
                className="input"
                id="f-code"
                type="text"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                maxLength={80}
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                aria-describedby="f-code-hint"
              />
              <span className="small" id="f-code-hint" style={{ fontWeight: 400 }}>
                It is in the invitation from the organiser.
              </span>
            </label>
          )}
          <p className="small" id="f-error" style={{ color: "var(--bad)" }} hidden={!landingError} role="alert">
            {landingError?.text}
          </p>
          <p className="small">
            Your answers are saved for the organiser. Use a first name only and leave out client names. This is a pilot: treat it as a test, not a
            formal survey.
          </p>
          <div className="row">
            <button className="btn primary" type="submit" id="btn-start" disabled={!ready}>
              {d ? "Start a new interview" : "Start"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (screen === "questionnaire" && member) {
    const err = startError ? (
      <div className="notice bad stack-sm" id="start-error" role="alert">
        <p>{startError.message}</p>
        {startError.code === "access_code" && (
          <label className="field" htmlFor="f-code-retry">
            Access code
            <input
              className="input"
              id="f-code-retry"
              type="text"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              maxLength={80}
              value={accessCode}
              onChange={(e) => {
                setAccessCode(e.target.value);
                ssSet(SS_CODE, e.target.value.trim());
              }}
            />
          </label>
        )}
      </div>
    ) : null;
    return (
      <Questionnaire
        member={member}
        initial={answers}
        busy={starting}
        error={err}
        onChange={onQuestionnaireChange}
        onSubmit={onQuestionnaireSubmit}
      />
    );
  }

  if (screen === "interview" && member) {
    const showChips = !!chips && chips.length > 0 && status === "in_progress" && !rateItems && !busy && !turnError;
    const rating = !!rateItems && !rateSubmitted;
    return (
      <div className="stack" id="interview">
        <div className="progress">
          <span id="phase-hint">
            <PhaseHint step={phase} />
          </span>
          <span>
            {member.name}, {member.role}
          </span>
        </div>

        <div className="chat" id="chat" role="log" aria-label="Interview transcript" ref={chatRef}>
          {turns.map((t, i) => (
            <div key={i} className={"bubble " + t.role + (t.ratings ? " ratings" : "")}>
              {t.role === "interviewer" ? visible(t.text) : t.text}
            </div>
          ))}
          {streaming !== null && (
            <div className="bubble interviewer streaming" id="streaming">
              {visible(streaming)}
            </div>
          )}
          {rating && rateItems && <RateCard key={rateItems.map((r) => r.id).join(",")} items={rateItems} disabled={busy} onSubmit={submitRatings} />}
        </div>

        <div className="chips" id="chips" hidden={!showChips} role="group" aria-label="Quick replies">
          {showChips &&
            chips!.map((t) => (
              <button key={t} className={"chip" + (isOpenChip(t) ? " chip-open" : "")} type="button" onClick={() => onChip(t)}>
                {t}
              </button>
            ))}
        </div>

        <div id="turn-error" hidden={!turnError}>
          {turnError && (
            <div className="notice bad stack-sm" id="turn-error-box" role="alert">
              <p>{turnError.message}</p>
              <div className="row">
                <button className="btn" id="btn-retry" type="button" onClick={retry}>
                  {turnError.label}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="composer" id="composer" hidden={rating}>
          <div className="composer-row">
            <textarea
              ref={taRef}
              className="textarea"
              id="answer"
              rows={2}
              placeholder={
                config?.voice
                  ? "Type or speak your answer. Enter sends, Shift+Enter makes a new line."
                  : "Type your answer. Enter sends, Shift+Enter makes a new line."
              }
              aria-label="Your answer"
              disabled={busy}
              value={composer}
              onChange={(e) => setComposer(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            {config?.voice && interviewId && (
              <VoiceButton
                interviewId={interviewId}
                enabled={config.voice}
                disabled={busy}
                onText={(t) => {
                  setComposer((d) => (d.trim() ? `${d.trim()} ${t}` : t));
                  taRef.current?.focus();
                }}
              />
            )}
            <button className="btn primary" id="btn-send" type="button" onClick={send} disabled={busy}>
              Send
            </button>
          </div>
          <div id="stop-wrap" className="small">
            {stopConfirm ? (
              <span className="row" id="stop-confirm">
                <span>Stop now? Your feedback will be based on what you have shared so far.</span>
                <button className="btn" type="button" id="btn-stop-yes" onClick={confirmStop} disabled={busy}>
                  Yes, stop here
                </button>
                <button className="btn quiet" type="button" id="btn-stop-no" onClick={() => setStopConfirm(false)}>
                  Keep going
                </button>
              </span>
            ) : (
              <button className="linkbtn" id="btn-stop" type="button" disabled={busy} onClick={() => !busyRef.current && setStopConfirm(true)}>
                I&apos;d like to stop here
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (screen === "preparing") {
    return (
      <div className="stack" id="preparing">
        <h1>Thank you, {member?.name}</h1>
        <p className="lead">
          <span className="spinner" aria-hidden="true" /> Preparing your feedback…
        </p>
        <p className="small">This takes a little while. Claude is reading the whole conversation once more.</p>
      </div>
    );
  }

  if (screen === "finishError") {
    return (
      <div className="stack" id="profile-error">
        <h1>Your feedback could not be prepared</h1>
        <div className="notice bad">{finishError}</div>
        <div className="row">
          <button className="btn primary" type="button" id="btn-retry-profile" onClick={() => void complete()}>
            Try again
          </button>
        </div>
        <div className="card stack-sm">
          <h2>Nothing is lost</h2>
          <p className="small">
            Your conversation is saved. If trying again does not work, come back to this page later on this device and choose &ldquo;Continue your
            interview&rdquo;, or let the organiser know.
          </p>
        </div>
      </div>
    );
  }

  if (screen === "feedback" && finish) {
    const fb = finish.feedback;
    return (
      <div className="stack feedback" id="feedback">
        <div className="stack-sm">
          <p className="eyebrow">Your feedback</p>
          <h1>{fb.headline}</h1>
          <p className="lead">{fb.summary}</p>
        </div>
        {fb.strengths && fb.strengths.length > 0 && (
          <section className="stack-sm">
            <h2>What stood out</h2>
            <ul className="clean">
              {fb.strengths.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </section>
        )}
        {fb.nextSteps && fb.nextSteps.length > 0 && (
          <section className="stack-sm">
            <h2>Next steps</h2>
            <div className="steps">
              {fb.nextSteps.map((s, i) => (
                <div className="step" key={i}>
                  <span className="num">{i + 1}</span>
                  <div className="stack-sm" style={{ gap: "0.15rem" }}>
                    <h3>{s.title}</h3>
                    <p className="small">{s.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
        {fb.closing && <p className="lead">{fb.closing}</p>}
        {finish.ratings && finish.ratings.length > 0 && (
          <section className="stack-sm">
            <h2>Your confidence ratings</h2>
            <table className="ratings">
              <tbody>
                {finish.ratings.map((it, i) => (
                  <tr key={i}>
                    <td>{it.task}</td>
                    <td className="num">{typeof it.rating === "number" ? String(it.rating) : "skipped"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
        <p className="small" id="save-status">
          Your answers have been saved for the organiser.
        </p>
        <p className="small">
          <button className="linkbtn" type="button" id="btn-another" onClick={resetAll}>
            Start another interview
          </button>
        </p>
      </div>
    );
  }

  return null;
}
