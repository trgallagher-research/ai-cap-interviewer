/* member.js — the member's screens: landing → interview → ratings → feedback.
 *
 * Depends on window.App (ui helpers), window.Engine, window.Prompts, window.Store.
 * Exposes window.MemberView = { render(container), reset() }.
 */
(function () {
  "use strict";

  const PHASE_HINT = {
    orient: "getting oriented",
    practice: "your practice",
    stretch: "your edges",
    rate: "your confidence",
    close: "wrapping up",
  };
  const PHASE_ORDER = ["orient", "practice", "stretch", "rate", "close"];

  // Module state (one interview per page load; "Start another interview" resets it)
  const S = {
    container: null,
    interview: null,
    screen: "landing",      // landing | interview | preparing | feedback
    busy: false,
    rateCardEl: null,       // the live rating card, so it is never rendered twice
    rateSubmitted: false,
    profile: null,
    saveWhere: [],
    lastTurnOpts: null,     // for Retry
    profileError: null,
  };

  const ui = () => window.App.ui;
  const h = (...a) => ui().el(...a);

  // ---------------------------------------------------------------------------
  // Entry
  // ---------------------------------------------------------------------------
  function render(container) {
    S.container = container;
    container.replaceChildren();
    if (S.screen === "landing") renderLanding();
    else if (S.screen === "interview") renderInterviewScreen();
    else if (S.screen === "preparing") renderPreparing();
    else if (S.screen === "feedback") renderFeedback();
  }

  function reset() {
    S.interview = null; S.screen = "landing"; S.busy = false; S.rateCardEl = null; S.rateSubmitted = false;
    S.profile = null; S.saveWhere = []; S.lastTurnOpts = null; S.profileError = null;
    window.Store.clearDraft();
    if (S.container) render(S.container);
  }

  // ---------------------------------------------------------------------------
  // Landing
  // ---------------------------------------------------------------------------
  function renderLanding() {
    const c = S.container;
    const draft = window.Store.loadDraft();
    const wrap = h("div", { class: "stack", id: "landing" });

    wrap.appendChild(h("div", { class: "stack-sm" }, [
      h("p", { class: "eyebrow" }, "For members of Systeeminterventies"),
      h("h1", {}, "How does AI show up in your work?"),
    ]));
    wrap.appendChild(h("p", { class: "lead" },
      "This is a relaxed conversation in English, about 10 to 15 minutes, led by an AI interviewer. " +
      "It asks how AI tools do or do not show up in your work: what you actually do, what you have learned, and where your edges are. " +
      "There are no right answers. People who never use AI are as interesting to us as daily users."));
    wrap.appendChild(h("p", { class: "lead" },
      "Near the end you rate your confidence on a few tasks drawn from your own practice. " +
      "You then get personal feedback you can act on. The organiser sees an anonymised overview of the whole network, not a transcript with your name on it."));

    if (draft && draft.interview) {
      const d = draft.interview;
      const n = (d.turns || []).filter((t) => t.role === "member").length;
      wrap.appendChild(h("div", { class: "card stack-sm", id: "draft-card" }, [
        h("p", { class: "eyebrow" }, "Unfinished interview"),
        h("p", {}, `${d.member.name || "You"} (${d.member.role || "no role given"}): ${n} answer${n === 1 ? "" : "s"} so far.`),
        h("div", { class: "row" }, [
          h("button", { class: "btn primary", id: "btn-continue", on: { click: () => resumeDraft(draft) } }, "Continue your interview"),
          h("button", { class: "btn", id: "btn-startover", on: { click: () => { window.Store.clearDraft(); render(c); } } }, "Start again"),
        ]),
      ]));
    }

    const name = h("input", { class: "input", id: "f-name", type: "text", autocomplete: "given-name", placeholder: "Anneke", required: true, maxLength: 60 });
    const role = h("input", { class: "input", id: "f-role", type: "text", placeholder: "team coach, mostly healthcare organisations", required: true, maxLength: 140 });
    const err = h("p", { class: "small", id: "f-error", style: { color: "var(--bad)" }, hidden: true });
    const form = h("form", { class: "stack", id: "start-form", on: { submit: (e) => {
      e.preventDefault();
      const nm = name.value.trim(); const rl = role.value.trim();
      if (!nm) { err.textContent = "Please give a first name."; err.hidden = false; name.focus(); return; }
      if (!rl) { err.textContent = "Please describe your role in one line."; err.hidden = false; role.focus(); return; }
      err.hidden = true;
      startInterview({ name: nm, role: rl });
    } } }, [
      h("label", { class: "field", htmlFor: "f-name" }, ["First name", name]),
      h("label", { class: "field", htmlFor: "f-role" }, ["Your role in one line", role]),
      err,
      h("p", { class: "small" }, "Your answers are stored for the organiser's overview. Use a first name only. This is a prototype: treat it as a test, not a formal survey."),
      h("div", { class: "row" }, [
        h("button", { class: "btn primary", type: "submit", id: "btn-start" }, draft ? "Start a new interview" : "Start the interview"),
      ]),
    ]);
    wrap.appendChild(form);
    const unavailable = h("div", { class: "notice warn", id: "llm-unavailable", hidden: true });
    wrap.appendChild(unavailable);
    c.appendChild(wrap);
  }

  function showUnavailable() {
    const n = document.getElementById("llm-unavailable");
    const msg = "Claude is not available in this view. Open this page in the Claude app where it was published, or paste the file into a Claude chat.";
    if (n) { n.textContent = msg; n.hidden = false; } else ui().toast(msg);
  }

  async function startInterview(member) {
    const btn = document.getElementById("btn-start");
    if (btn) btn.disabled = true;
    await window.Engine.llm.init();
    if (!window.Engine.llm.available) { showUnavailable(); if (btn) btn.disabled = false; return; }
    S.interview = new window.Engine.Interview(member);
    S.rateCardEl = null; S.rateSubmitted = false; S.profile = null; S.profileError = null;
    S.screen = "interview";
    window.Store.saveDraft(S.interview.toJSON());
    render(S.container);
    runTurn({});
  }

  async function resumeDraft(draft) {
    await window.Engine.llm.init();
    if (!window.Engine.llm.available) { showUnavailable(); return; }
    const iv = window.Engine.Interview.fromJSON(draft.interview);
    S.interview = iv;
    S.rateCardEl = null; S.rateSubmitted = !!iv.ratings; S.profile = null; S.profileError = null;
    if (iv.status === "complete" || iv.status === "ended_early") {
      S.screen = "preparing"; render(S.container); generateProfile(); return;
    }
    S.screen = "interview";
    render(S.container);
    const last = iv.turns[iv.turns.length - 1];
    if (iv.status === "rating" && iv.rateItems && !iv.ratings) {
      showRateCard(iv.rateItems);
    } else if (!last || last.role === "member") {
      // A turn was in flight when the page was left: run it again.
      runTurn({});
    }
  }

  // ---------------------------------------------------------------------------
  // Interview screen
  // ---------------------------------------------------------------------------
  function renderInterviewScreen() {
    const iv = S.interview;
    const c = S.container;
    const wrap = h("div", { class: "stack", id: "interview" });

    wrap.appendChild(h("div", { class: "progress" }, [
      h("span", { id: "phase-hint" }, phaseHintNode(iv.phase)),
      h("span", {}, `${iv.member.name}, ${iv.member.role}`),
    ]));

    const chat = h("div", { class: "chat", id: "chat", role: "log", "aria-label": "Interview transcript" });
    for (const t of iv.turns) chat.appendChild(bubble(t.role, t.text, isRatingsTurn(t)));
    wrap.appendChild(chat);

    const errBox = h("div", { id: "turn-error", hidden: true });
    wrap.appendChild(errBox);

    const ta = h("textarea", { class: "textarea", id: "answer", rows: 2, placeholder: "Type your answer. Enter sends, Shift+Enter makes a new line.", "aria-label": "Your answer" });
    ta.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
    });
    const sendBtn = h("button", { class: "btn primary", id: "btn-send", type: "button", on: { click: send } }, "Send");
    const stopWrap = h("div", { id: "stop-wrap", class: "small" });
    const stopLink = h("button", { class: "linkbtn", id: "btn-stop", type: "button", on: { click: () => askStop(stopWrap, stopLink) } }, "I'd like to stop here");
    stopWrap.appendChild(stopLink);

    wrap.appendChild(h("div", { class: "composer", id: "composer" }, [
      h("div", { class: "composer-row" }, [ta, sendBtn]),
      stopWrap,
    ]));
    c.appendChild(wrap);
    setBusy(S.busy);
    if (iv.status === "rating") setComposerHidden(true);
  }

  function phaseHintNode(phase) {
    const idx = Math.max(0, PHASE_ORDER.indexOf(phase));
    const dots = h("span", { class: "phase-dots", "aria-hidden": "true" }, PHASE_ORDER.map((p, i) => h("i", { class: i <= idx ? "on" : "" })));
    return h("span", {}, [dots, PHASE_HINT[phase] || PHASE_HINT.orient]);
  }
  function updatePhase() {
    const n = document.getElementById("phase-hint");
    if (n) n.replaceChildren(phaseHintNode(S.interview.phase));
  }

  function isRatingsTurn(t) {
    return t.role === "member" && /^My confidence ratings/.test(t.text);
  }
  function bubble(role, text, ratings) {
    return h("div", { class: "bubble " + role + (ratings ? " ratings" : "") }, text);
  }
  function chatEl() { return document.getElementById("chat"); }
  function scrollChat() {
    const ch = chatEl();
    if (!ch) return;
    const last = ch.lastElementChild;
    if (last && last.scrollIntoView) last.scrollIntoView({ block: "end", behavior: "auto" });
  }

  function setBusy(b) {
    S.busy = b;
    const ta = document.getElementById("answer");
    const btn = document.getElementById("btn-send");
    const stop = document.getElementById("btn-stop");
    if (ta) ta.disabled = b;
    if (btn) btn.disabled = b;
    if (stop) stop.disabled = b;
    if (!b && ta && !ta.hidden) { try { ta.focus({ preventScroll: true }); } catch (_) { /* ignore */ } }
  }
  function setComposerHidden(hidden) {
    const comp = document.getElementById("composer");
    if (comp) comp.hidden = hidden;
  }
  function showTurnError(message, retryLabel, retryFn) {
    const box = document.getElementById("turn-error");
    if (!box) return;
    box.replaceChildren(h("div", { class: "notice bad stack-sm", id: "turn-error-box" }, [
      h("p", {}, message),
      h("div", { class: "row" }, [
        h("button", { class: "btn", id: "btn-retry", type: "button", on: { click: () => { box.hidden = true; box.replaceChildren(); retryFn(); } } }, retryLabel || "Retry"),
      ]),
    ]));
    box.hidden = false;
  }
  function errorMessage(e) {
    const code = e && e.code;
    if (code === "not_granted") return "Claude could not be used because permission was declined in this view. Allow Claude for this page and try again.";
    if (code === "rate_limited") return "Claude is busy right now. Wait a moment, then try again.";
    if (code === "unavailable") return "Claude is not available in this view. Open this page in the Claude app where it was published, or paste the file into a Claude chat.";
    return "Something went wrong while Claude was answering: " + (e && e.message ? e.message : String(e)) + ".";
  }

  function send() {
    if (S.busy) return;
    const ta = document.getElementById("answer");
    const text = (ta.value || "").trim();
    if (!text) return;
    S.interview.answer(text);
    ta.value = "";
    chatEl().appendChild(bubble("member", text));
    scrollChat();
    window.Store.saveDraft(S.interview.toJSON());
    runTurn({});
  }

  /** One interviewer turn. Safe to re-run with the same opts: Engine only records the turn on success. */
  async function runTurn(opts) {
    if (S.busy) return;
    S.lastTurnOpts = opts || {};
    setBusy(true);
    const ch = chatEl();
    const b = h("div", { class: "bubble interviewer streaming", id: "streaming" }, "");
    ch.appendChild(b);
    scrollChat();
    let res;
    try {
      res = await S.interview.next((visible) => { b.textContent = visible; scrollChat(); }, S.lastTurnOpts);
    } catch (e) {
      b.remove();
      setBusy(false);
      const retryOpts = S.lastTurnOpts;
      const label = (e && e.code === "rate_limited") ? "Try again" : "Retry";
      showTurnError(errorMessage(e), label, () => runTurn(retryOpts));
      return;
    }
    b.classList.remove("streaming");
    b.removeAttribute("id");
    b.textContent = res.visible;
    window.Store.saveDraft(S.interview.toJSON());
    updatePhase();
    setBusy(false);
    scrollChat();
    if (res.complete) { onComplete(); return; }
    if (res.rateItems && !S.rateSubmitted) { showRateCard(res.rateItems); return; }
  }

  function askStop(wrap, link) {
    if (S.busy) return;
    wrap.replaceChildren(h("span", { class: "row", id: "stop-confirm" }, [
      h("span", {}, "Stop now? Your feedback will be based on what you have shared so far."),
      h("button", { class: "btn", type: "button", id: "btn-stop-yes", on: { click: () => {
        wrap.replaceChildren(link);
        const card = S.rateCardEl;
        if (card && !S.rateSubmitted) { card.remove(); S.rateCardEl = null; }
        setComposerHidden(false);
        runTurn({ endNow: true });
      } } }, "Yes, stop here"),
      h("button", { class: "btn quiet", type: "button", id: "btn-stop-no", on: { click: () => wrap.replaceChildren(link) } }, "Keep going"),
    ]));
  }

  // ---------------------------------------------------------------------------
  // Rating widget
  // ---------------------------------------------------------------------------
  function showRateCard(items) {
    if (S.rateCardEl || S.rateSubmitted) return; // never twice
    const ch = chatEl();
    if (!ch) return;
    // Easiest first, stable.
    const sorted = items.map((it, i) => ({ it, i })).sort((a, b) => (a.it.level - b.it.level) || (a.i - b.i)).map((x) => x.it);
    const state = {}; // id -> {value, skipped}
    const rows = sorted.map((it) => {
      state[it.id] = { value: 50, skipped: false };
      const val = h("span", { class: "rate-value", id: "val-" + it.id }, "50");
      const range = h("input", { type: "range", min: 0, max: 100, step: 5, value: 50, id: "range-" + it.id, "aria-label": "Confidence for: " + it.task, "aria-valuetext": "50" });
      range.addEventListener("input", () => { state[it.id].value = Number(range.value); val.textContent = range.value; range.setAttribute("aria-valuetext", range.value); });
      const skip = h("input", { type: "checkbox", id: "skip-" + it.id });
      const row = h("div", { class: "rate-item", dataset: { id: it.id } }, [
        h("p", { class: "rate-task" }, it.task),
        h("div", { class: "rate-slider" }, [range, val]),
        h("div", { class: "rate-anchors", "aria-hidden": "true" }, [h("span", {}, "Cannot do at all"), h("span", {}, "Moderately certain"), h("span", {}, "Highly certain")]),
        h("label", { class: "skip", htmlFor: "skip-" + it.id }, [skip, "Skip this one"]),
      ]);
      skip.addEventListener("change", () => { state[it.id].skipped = skip.checked; range.disabled = skip.checked; row.classList.toggle("skipped", skip.checked); });
      return row;
    });
    const submit = h("button", { class: "btn primary", type: "button", id: "btn-rate-submit" }, "Send my ratings");
    submit.addEventListener("click", () => {
      if (S.rateSubmitted) return;
      const ratings = {};
      for (const it of sorted) if (!state[it.id].skipped) ratings[it.id] = state[it.id].value;
      S.rateSubmitted = true;
      submit.disabled = true;
      S.interview.submitRatings(ratings);
      const card = S.rateCardEl; S.rateCardEl = null;
      if (card) card.remove();
      const last = S.interview.turns[S.interview.turns.length - 1];
      ch.appendChild(bubble("member", last.text, true));
      setComposerHidden(false);
      window.Store.saveDraft(S.interview.toJSON());
      updatePhase();
      scrollChat();
      runTurn({});
    });
    const card = h("div", { class: "card rate-card stack-sm", id: "rate-card" }, [
      h("p", { class: "eyebrow" }, "Rate your confidence"),
      h("p", { class: "small" }, "For each task, how confident are you that you can do it right now? 0 = cannot do at all, 100 = highly certain you can do it. There are no right answers."),
      h("div", {}, rows),
      h("div", { class: "row" }, [submit]),
    ]);
    S.rateCardEl = card;
    ch.appendChild(card);
    setComposerHidden(true);
    scrollChat();
  }

  // ---------------------------------------------------------------------------
  // Completion → profile
  // ---------------------------------------------------------------------------
  function onComplete() {
    S.screen = "preparing";
    render(S.container);
    generateProfile();
  }

  function renderPreparing() {
    S.container.appendChild(h("div", { class: "stack", id: "preparing" }, [
      h("h1", {}, "Thank you, " + S.interview.member.name),
      h("p", { class: "lead" }, [h("span", { class: "spinner", "aria-hidden": "true" }), " Preparing your feedback…"]),
      h("p", { class: "small" }, "This takes a little while. Claude is reading the whole conversation once more."),
    ]));
  }

  async function generateProfile() {
    const iv = S.interview;
    S.profileError = null;
    try {
      const prompt = window.Prompts.buildProfilePrompt(iv.member, iv.turns, iv.rateItems, iv.ratings);
      const out = await window.Engine.llm.json([{ role: "user", content: prompt }], { tier: "complex" });
      const profile = window.Engine.assembleProfile(iv, out, "live");
      S.profile = profile;
      let where = [];
      try { where = (await window.Store.save(profile)).where || []; } catch (_) { where = []; }
      S.saveWhere = where;
      window.Store.clearDraft();
      S.screen = "feedback";
      render(S.container);
    } catch (e) {
      S.profileError = e;
      S.screen = "feedback";
      render(S.container);
    }
  }

  function renderFeedback() {
    const c = S.container;
    const iv = S.interview;
    if (S.profileError) { renderProfileError(c); return; }
    const p = S.profile; const fb = p.feedback;
    const wrap = h("div", { class: "stack feedback", id: "feedback" });
    wrap.appendChild(h("div", { class: "stack-sm" }, [
      h("p", { class: "eyebrow" }, "Your feedback"),
      h("h1", {}, fb.headline),
      h("p", { class: "lead" }, fb.summary),
    ]));
    if (fb.strengths.length) {
      wrap.appendChild(h("section", { class: "stack-sm" }, [
        h("h2", {}, "What stood out"),
        h("ul", { class: "clean" }, fb.strengths.map((s) => h("li", {}, s))),
      ]));
    }
    if (fb.nextSteps.length) {
      wrap.appendChild(h("section", { class: "stack-sm" }, [
        h("h2", {}, "Next steps"),
        h("div", { class: "steps" }, fb.nextSteps.map((s, i) => h("div", { class: "step" }, [
          h("span", { class: "num" }, String(i + 1)),
          h("div", { class: "stack-sm", style: { gap: "0.15rem" } }, [h("h3", {}, s.title), h("p", { class: "small" }, s.detail)]),
        ]))),
      ]));
    }
    if (fb.closing) wrap.appendChild(h("p", { class: "lead" }, fb.closing));

    if (p.confidence.items.length) {
      wrap.appendChild(h("section", { class: "stack-sm" }, [
        h("h2", {}, "Your confidence ratings"),
        h("table", { class: "ratings" }, [h("tbody", {}, p.confidence.items.map((it) => h("tr", {}, [
          h("td", {}, it.task),
          h("td", { class: "num" }, typeof it.rating === "number" ? String(it.rating) : "skipped"),
        ])))]),
      ]));
    }

    wrap.appendChild(resultCodeBox(window.Store.exportCode(p), S.saveWhere.includes("db")));
    wrap.appendChild(h("p", { class: "small" }, [
      h("button", { class: "linkbtn", type: "button", id: "btn-another", on: { click: reset } }, "Start another interview"),
    ]));
    c.appendChild(wrap);
    void iv;
  }

  function resultCodeBox(code, savedToDb) {
    const ta = h("textarea", { class: "textarea code", id: "result-code", readOnly: true, rows: 4, value: code, "aria-label": "Result code" });
    const btn = h("button", { class: "btn", type: "button", id: "btn-copy-code" }, "Copy the code");
    btn.addEventListener("click", () => ui().copy(code, btn));
    return h("div", { class: "card stack-sm", id: "result-box" }, [
      h("h2", {}, "Send your result to the organiser"),
      h("p", { class: "small", id: "save-status" }, savedToDb
        ? "Saved to the network's shared store. You can also copy the code below as a backup."
        : "Saved on this device only; copy the code below and send it to the organiser."),
      ta,
      h("div", { class: "row" }, [btn]),
    ]);
  }

  function renderProfileError(c) {
    const iv = S.interview;
    const e = S.profileError;
    const raw = JSON.stringify({ kind: "aiwd-transcript", member: iv.member, turns: iv.turns, rateItems: iv.rateItems, ratings: iv.ratings, status: iv.status });
    const ta = h("textarea", { class: "textarea code", id: "transcript-code", readOnly: true, rows: 4, value: raw, "aria-label": "Transcript code" });
    const btn = h("button", { class: "btn", type: "button", id: "btn-copy-transcript" }, "Copy the transcript");
    btn.addEventListener("click", () => ui().copy(raw, btn));
    c.appendChild(h("div", { class: "stack", id: "profile-error" }, [
      h("h1", {}, "Your feedback could not be prepared"),
      h("div", { class: "notice bad" }, errorMessage(e)),
      h("div", { class: "row" }, [
        h("button", { class: "btn primary", type: "button", id: "btn-retry-profile", on: { click: () => { S.screen = "preparing"; render(c); generateProfile(); } } }, "Try again"),
      ]),
      h("div", { class: "card stack-sm" }, [
        h("h2", {}, "Nothing is lost"),
        h("p", { class: "small" }, "Your conversation is kept on this device. If trying again does not work, copy this transcript and send it to the organiser."),
        ta,
        h("div", { class: "row" }, [btn]),
      ]),
      h("details", {}, [
        h("summary", { class: "small" }, "Show the conversation"),
        h("div", { class: "chat", style: { marginTop: "0.75rem" } }, iv.turns.map((t) => bubble(t.role, t.text, isRatingsTurn(t)))),
      ]),
    ]));
  }

  window.MemberView = { render, reset, _state: S };
})();
