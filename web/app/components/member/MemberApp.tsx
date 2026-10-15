"use client";

/* The member's screens: landing → quick questions → interview → ratings → feedback.
 * Port of prototype/src/member.js onto the server API (web/docs/contract.md). The server owns the
 * prompts, the interview state and the profile; this component only renders and sends answers. */

import { useCallback, useEffect, useRef, useState } from "react";
import { formatRatingsTurn } from "@/lib/aiwd/prompts";
import { VoiceButton } from "@/app/components/VoiceButton";
import * as api from "./api";
import type { AppConfig, FinishResponse, RateItem, Turn } from "./api";
import { FeedbackView } from "./FeedbackView";
import { displayRatingsText, LANG_KEY, STRINGS, type Lang, type Strings } from "./i18n";
import { PhaseHint } from "./PhaseHint";
import { Questionnaire, type Answers } from "./Questionnaire";
import { RateCard } from "./RateCard";

const LS_ID = "aiwd.interviewId";
const LS_DRAFT = "aiwd.draft";
const SS_CODE = "aiwd.accessCode";

type Screen = "landing" | "questionnaire" | "interview" | "preparing" | "feedback" | "finishError";
type Member = { name: string; role: string; email?: string };
const EMAIL_RE = /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[^\s@<>()",;:]{2,}$/;
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
const isOpenChip = (t: string) => /^something else\b|^other\b|^iets anders\b|^anders\b/i.test(t.trim());

function errorMessage(e: unknown, t: Strings): { message: string; label: string } {
  const err = e as api.ApiError;
  const code = (err && err.code) || "";
  const known = t.err[code];
  if (code && typeof known === "string") return { message: known, label: code === "failed" ? t.retry : t.tryAgain };
  // Messages for codes we do not translate come from the server in English.
  return { message: code ? err.message || t.errGeneric(String(e)) : t.errGeneric(err && err.message ? err.message : String(e)), label: t.retry };
}

export function MemberApp() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [lang, setLangState] = useState<Lang>("nl");
  const t = STRINGS[lang];
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    lsSet(LANG_KEY, l);
    if (typeof document !== "undefined") document.documentElement.lang = l;
  }, []);
  const [screen, setScreen] = useState<Screen>("landing");
  const [ready, setReady] = useState(false);
  const [draftCard, setDraftCard] = useState<DraftCard | null>(null);

  // landing
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [email, setEmail] = useState("");
  const [landingError, setLandingError] = useState<{ field: "name" | "role" | "code" | "email"; text: string } | null>(null);

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
  const emailRef = useRef<HTMLInputElement | null>(null);

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
    // Language: ?lang= in the link, else the member's earlier choice, else the site default (Dutch).
    let chosen: Lang | null = null;
    try {
      const q = new URL(window.location.href).searchParams.get("lang");
      if (q === "nl" || q === "en") chosen = q;
    } catch {
      /* ignore */
    }
    const saved = lsGet(LANG_KEY);
    if (!chosen && (saved === "nl" || saved === "en")) chosen = saved;
    if (chosen) setLang(chosen);
    api
      .getConfig()
      .then((c) => {
        setConfig(c);
        if (!chosen) setLang(c.defaultLang === "en" ? "en" : "nl");
      })
      .catch(() => setConfig({ voice: false, memberCodeRequired: false, storage: "redis", emailMode: "none" }));

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
    setEmail("");
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
      setLandingError({ field: "name", text: t.errName });
      nameRef.current?.focus();
      return;
    }
    if (!rl) {
      setLandingError({ field: "role", text: t.errRole });
      roleRef.current?.focus();
      return;
    }
    const mode = config?.emailMode || "none";
    const em = mode === "none" ? "" : email.trim().toLowerCase();
    if (mode === "required" && !em) {
      setLandingError({ field: "email", text: t.errEmailMissing });
      emailRef.current?.focus();
      return;
    }
    if (em && !EMAIL_RE.test(em)) {
      setLandingError({ field: "email", text: t.errEmailBad });
      emailRef.current?.focus();
      return;
    }
    if (config?.memberCodeRequired && !accessCode.trim()) {
      setLandingError({ field: "code", text: t.errCode });
      codeRef.current?.focus();
      return;
    }
    setLandingError(null);
    if (accessCode.trim()) ssSet(SS_CODE, accessCode.trim());
    lsDel(LS_ID);
    const m: Member = { name: nm, role: rl, ...(em ? { email: em } : {}) };
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
      const { interviewId: id } = await api.startInterview({ name: member.name, role: member.role, answers: a, accessCode: code, lang, ...(member.email ? { email: member.email } : {}) });
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
      setStartError({ message: errorMessage(err, t).message, code: err.code });
    } finally {
      setStarting(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Interview
  // ---------------------------------------------------------------------------
  function applyState(st: api.InterviewStateResponse) {
    if (st.lang === "nl" || st.lang === "en") setLang(st.lang); // an interview keeps the language it started in
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
      setTurnError(errorMessage(err.code === "rate_limited" ? Object.assign(err, { code: "overloaded" }) : err, t));
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
      setTurnError(errorMessage(e, t));
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
      setFinishError(errorMessage(e, t).message.replace("while Claude was answering", "while preparing your feedback").replace("terwijl Claude antwoordde", "bij het maken van je feedback"));
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
      setLandingError({ field: "name", text: errorMessage(e, t).message });
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
  const who = config?.contactName || t.TheOrganiser;
  const days = config?.retentionDays || 0;

  if (screen === "landing") {
    const d = draftCard;
    let where = "";
    if (d && d.kind === "questionnaire") where = t.draftQuestionnaire;
    else if (d && d.kind === "interview") where = d.finished ? t.draftFinished : t.draftAnswers(d.n);
    return (
      <div className="stack" id="landing">
        <div className="lang-row">
          <button
            className="linkbtn"
            type="button"
            id="btn-lang"
            lang={lang === "nl" ? "en" : "nl"}
            aria-label={t.langSwitchLabel}
            onClick={() => setLang(lang === "nl" ? "en" : "nl")}
          >
            {t.langSwitch}
          </button>
        </div>
        <div className="stack-sm">
          <p className="eyebrow">{t.eyebrow}</p>
          <h1>{t.title}</h1>
        </div>
        <p className="lead">{t.lead1}</p>
        <p className="lead">{t.lead2}</p>

        {config?.contactEmail && (
          <p className="small" id="contact-line">
            {t.contact(config.contactName || t.theOrganiser)}
            <a href={"mailto:" + config.contactEmail}>{config.contactEmail}</a>.
            {config.emailMode && config.emailMode !== "none" && config.emailSending && config.repliesToContact
              ? t.contactReplies(config.contactName || t.theOrganiser)
              : ""}
          </p>
        )}

        {d && (
          <div className="card stack-sm" id="draft-card">
            <p className="eyebrow">{d.kind === "interview" && d.finished ? t.draftFinishedTitle : t.draftUnfinishedTitle}</p>
            <p>
              {d.member.name || t.you} ({d.member.role || t.noRole}): {where}
            </p>
            <div className="row">
              <button className="btn primary" id="btn-continue" type="button" onClick={continueDraft}>
                {d.kind === "interview" && d.finished ? t.showFeedback : t.continueInterview}
              </button>
              <button className="btn" id="btn-startover" type="button" onClick={startOver}>
                {t.startAgain}
              </button>
            </div>
          </div>
        )}

        <form className="stack" id="start-form" onSubmit={onLandingSubmit} noValidate>
          <label className="field" htmlFor="f-name">
            {t.firstName}
            <input
              ref={nameRef}
              className="input"
              id="f-name"
              type="text"
              autoComplete="given-name"
              placeholder={t.namePlaceholder}
              required
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="field" htmlFor="f-role">
            {t.role}
            <input
              ref={roleRef}
              className="input"
              id="f-role"
              type="text"
              placeholder={t.rolePlaceholder}
              required
              maxLength={140}
              value={role}
              onChange={(e) => setRole(e.target.value)}
            />
          </label>
          {config?.emailMode && config.emailMode !== "none" && (
            <label className="field" htmlFor="f-email">
              {config.emailMode === "required" ? t.email : t.emailOptional}
              <input
                ref={emailRef}
                className="input"
                id="f-email"
                type="email"
                autoComplete="email"
                inputMode="email"
                maxLength={200}
                required={config.emailMode === "required"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-describedby="f-email-hint"
              />
              <span className="small" id="f-email-hint" style={{ fontWeight: 400 }}>
                {config.emailSending ? t.emailHintSending(who) : t.emailHintNotSending(who)}
                {days ? t.deletedAfter(days) : ""}
              </span>
            </label>
          )}
          {config?.memberCodeRequired && (
            <label className="field" htmlFor="f-code">
              {t.accessCode}
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
                {t.accessCodeHint}
              </span>
            </label>
          )}
          <p className="small" id="f-error" style={{ color: "var(--bad)" }} hidden={!landingError} role="alert">
            {landingError?.text}
          </p>
          <p className="small">
            {t.privacy(days)}
          </p>
          <div className="row">
            <button className="btn primary" type="submit" id="btn-start" disabled={!ready}>
              {d ? t.startNew : t.start}
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
            {t.accessCode}
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
        lang={lang}
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
            <PhaseHint step={phase} lang={lang} />
          </span>
          <span>
            {member.name}, {member.role}
          </span>
        </div>

        <div className="chat" id="chat" role="log" aria-label={t.transcript} ref={chatRef}>
          {turns.map((t, i) => (
            <div key={i} className={"bubble " + t.role + (t.ratings ? " ratings" : "")}>
              {t.role === "interviewer" ? visible(t.text) : t.ratings ? displayRatingsText(t.text, lang) : t.text}
            </div>
          ))}
          {streaming !== null && (
            <div className="bubble interviewer streaming" id="streaming">
              {visible(streaming)}
            </div>
          )}
          {rating && rateItems && <RateCard key={rateItems.map((r) => r.id).join(",")} items={rateItems} lang={lang} disabled={busy} onSubmit={submitRatings} />}
        </div>

        <div className="chips" id="chips" hidden={!showChips} role="group" aria-label={t.quickReplies}>
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
                config?.voice ? t.placeholderVoice : t.placeholder
              }
              aria-label={t.yourAnswer}
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
                lang={lang}
                enabled={config.voice}
                disabled={busy}
                onText={(t) => {
                  setComposer((d) => (d.trim() ? `${d.trim()} ${t}` : t));
                  taRef.current?.focus();
                }}
              />
            )}
            <button className="btn primary" id="btn-send" type="button" onClick={send} disabled={busy}>
              {t.send}
            </button>
          </div>
          <div id="stop-wrap" className="small">
            {stopConfirm ? (
              <span className="row" id="stop-confirm">
                <span>{t.stopConfirm}</span>
                <button className="btn" type="button" id="btn-stop-yes" onClick={confirmStop} disabled={busy}>
                  {t.stopYes}
                </button>
                <button className="btn quiet" type="button" id="btn-stop-no" onClick={() => setStopConfirm(false)}>
                  {t.keepGoing}
                </button>
              </span>
            ) : (
              <button className="linkbtn" id="btn-stop" type="button" disabled={busy} onClick={() => !busyRef.current && setStopConfirm(true)}>
                {t.stop}
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
        <h1>{t.thanks(member?.name || "")}</h1>
        <p className="lead">
          <span className="spinner" aria-hidden="true" /> {t.preparing}
        </p>
        <p className="small">{t.preparingNote}</p>
      </div>
    );
  }

  if (screen === "finishError") {
    return (
      <div className="stack" id="profile-error">
        <h1>{t.feedbackFailed}</h1>
        <div className="notice bad">{finishError}</div>
        <div className="row">
          <button className="btn primary" type="button" id="btn-retry-profile" onClick={() => void complete()}>
            {t.tryAgain}
          </button>
        </div>
        <div className="card stack-sm">
          <h2>{t.nothingLost}</h2>
          <p className="small">{t.nothingLostText}</p>
        </div>
      </div>
    );
  }

  if (screen === "feedback" && finish) {
    const reportUrl = finish.reportToken && typeof window !== "undefined" ? window.location.origin + "/r/" + finish.reportToken : "";
    return (
      <div className="stack feedback" id="feedback">
        <FeedbackView feedback={finish.feedback} ratings={finish.ratings} lang={lang} />
        {reportUrl && (
          <section className="card stack-sm" id="report-link">
            <h2>{t.keepReport}</h2>
            <p className="small">
              {finish.emailState === "sent" ? t.emailedToo : ""}
              {t.reportLinkText(days)}
            </p>
            <div className="row">
              <input className="input" id="report-url" readOnly value={reportUrl} onFocus={(e) => e.currentTarget.select()} aria-label={t.reportLinkLabel} />
              <button className="btn" type="button" id="btn-copy-report" onClick={() => void navigator.clipboard?.writeText(reportUrl).catch(() => {})}>
                {t.copyLink}
              </button>
            </div>
          </section>
        )}
        <p className="small" id="save-status">
          {t.saved}
        </p>
        <p className="small">
          <button className="linkbtn" type="button" id="btn-another" onClick={resetAll}>
            {t.another}
          </button>
        </p>
      </div>
    );
  }

  return null;
}
