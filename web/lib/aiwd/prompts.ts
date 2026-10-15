/* prompts.ts: every prompt the AI at Work Diagnostic sends to Claude.
 *
 * Typed port of prototype/src/prompts.js. Text and behaviour are unchanged, with one
 * deliberate difference: buildInterviewSystem() is sent as the API `system` parameter
 * (cached), so openingMessages()/interviewMessages() start with a short kick-off user turn
 * ("[The interview begins now.]") instead of the instruction block.
 *
 * Pure functions and data only: no server imports, safe in client components.
 */
import type { Answers, ChatMessage, Domain, Lang, LadderStep, Member, Phase, Profile, Question, QuestionOption, QuestionPage, RateItem, Ratings, SelfCheck, Stance, Turn } from "./types";

/** The network the diagnostic is run for (named in every prompt). */
export const NETWORK = "Makersnetwerk";

/** First user message of every interview (the instruction block is the system prompt). */
export const KICKOFF = "[The interview begins now.]";

  export const DOMAINS: Domain[] = [
    { key: "writing",  label: "Writing & communication",            hint: "emails, proposals, reports, LinkedIn posts, summaries for clients" },
    { key: "prep",     label: "Preparing sessions & interventions",  hint: "designing workshops, team days, mediation sessions, training programmes" },
    { key: "analysis", label: "Analysis & sensemaking",              hint: "digesting interview notes, survey results, long documents, finding patterns" },
    { key: "thinking", label: "Thinking partner on a case",          hint: "talking a difficult client case or conflict through with the AI, testing hypotheses" },
    { key: "client",   label: "With or for clients directly",        hint: "using AI in the room with a team, building something a client uses, advising clients on AI" },
    { key: "learning", label: "Research & own learning",             hint: "learning about methods, theory, a sector, a new tool" },
    { key: "admin",    label: "Admin & organising",                  hint: "scheduling, invoices, meeting notes, planning, translation" },
    { key: "building", label: "Building tools, prompts or automations", hint: "reusable prompts, AI assistants or agents set up with your own context, scripts, connecting tools" },
  ];

  export const LADDER: LadderStep[] = [
    { level: 0, label: "Not yet",     short: "Has not used AI tools in their work." },
    { level: 1, label: "Exploring",   short: "Tried a few times; occasional, generic use such as a quick summary or a search." },
    { level: 2, label: "Routine",     short: "Regular use for a set of recurring tasks; checks output; has habits." },
    { level: 3, label: "Integrated",  short: "Woven into their own professional method: thinking partner on cases, iterates with own material and context, clear judgement about when not to use it." },
    { level: 4, label: "Shaping",     short: "Designs ways of working with AI for others or clients, builds reusable prompts, assistants or agents, teaches, sets boundaries on data and ethics." },
  ];

  export const STANCES: Stance[] = ["enthusiast", "pragmatic", "cautious", "sceptical", "worried"];

  // Control markers (same convention as aligned-interviewer; parsed in engine.js)
  export const MARK = {
    PHASE_OPEN: "<<PHASE:",
    RATE_OPEN: "<<RATE:",
    CHIPS_OPEN: "<<CHIPS:",
    CLOSE: ">>",
    COMPLETE: "<<COMPLETE>>",
  };

  export const PHASES: Phase[] = ["orient", "practice", "stretch", "rate", "close"];

  // ---------------------------------------------------------------------------
  // 0. Opening questionnaire (four short pages). Self-report: it routes the interview and
  //    fills the map's skeleton, but practice is still coded from described episodes.
  // ---------------------------------------------------------------------------

  const AGREE: QuestionOption[] = [
    { key: "sd", label: "Strongly disagree" }, { key: "d", label: "Disagree" }, { key: "n", label: "Neither" },
    { key: "a", label: "Agree" }, { key: "sa", label: "Strongly agree" },
  ];
  const YESNO: QuestionOption[] = [{ key: "yes", label: "Yes" }, { key: "no", label: "No" }];
  const OFTEN: QuestionOption[] = [
    { key: "never", label: "Never" }, { key: "sometimes", label: "Sometimes" }, { key: "often", label: "Often" }, { key: "always", label: "Always" },
  ];
  /** Answers that count as agreeing / doing it, per scale (used for the self-check and the organiser counts). */
  export const POSITIVE: Record<string, string[]> = { views: ["a", "sa"], skills: ["yes", "often", "always"], support: ["yes"] };

  function BLOCK_QUESTIONS(): Record<string, Question> {
    const notNever = { frequency: ["never"] };
    const q = (id: string, label: string, block: Question["block"], options: QuestionOption[], extra: Partial<Question> = {}): [string, Question] =>
      [id, { id, type: "single", label, block, options, ...extra }];
    return Object.fromEntries([
      // Views: conviction and urgency, then doubts and reluctance (5-point agreement).
      q("viewEssential", "I believe using AI is essential to doing my job well.", "views", AGREE, { group: "conviction", sub: "Conviction and urgency" }),
      q("viewQuality", "I believe AI will improve the quality of my work.", "views", AGREE, { group: "conviction" }),
      q("viewChange", "I expect my work to change significantly because of AI in the coming years.", "views", AGREE, { group: "conviction" }),
      q("viewBehind", "I feel I will fall behind if I don't (start to) use AI.", "views", AGREE, { group: "conviction" }),
      q("doubtReliability", "I worry about the reliability of AI output.", "views", AGREE, { group: "doubt", sub: "Doubts and reluctance" }),
      q("doubtPrivacy", "I have concerns about privacy, data security or confidentiality when using AI.", "views", AGREE, { group: "doubt" }),
      q("doubtCraft", "I feel AI could undermine the craftsmanship or human side of my work.", "views", AGREE, { group: "doubt" }),
      q("doubtEthics", "I have ethical or societal objections to AI (e.g. environmental impact, copyright, effects on jobs).", "views", AGREE, { group: "doubt" }),
      q("doubtPressure", "I feel pressured to use AI, even though I don't see the added value myself.", "views", AGREE, { group: "doubt" }),
      q("doubtTime", "I simply don't have the time or energy to learn it.", "views", AGREE, { group: "doubt" }),
      ["reservation", { id: "reservation", type: "text", max: 300, label: "What is your biggest reservation about using AI in your work? (optional)", options: [] }],
      // Skills: concrete behaviour, basic to advanced (skipped for people who never use AI).
      q("skillFollowUp", "I ask an AI tool follow-up questions to improve its first answer.", "skills", YESNO, { level: 1, skipIf: notNever }),
      q("skillCheck", "I check AI output for errors before using it.", "skills", OFTEN, { level: 1, skipIf: notNever }),
      q("skillOwnMaterial", "I have given an AI tool my own material to work with (e.g. notes, a report, a transcript).", "skills", YESNO, { level: 2, skipIf: notNever }),
      q("skillPrompt", "I write prompts that include context, a role and an example of the desired output.", "skills", OFTEN, { level: 2, skipIf: notNever }),
      q("skillAnonymise", "I remove names and identifying details before putting client material into an AI tool.", "skills",
        [...OFTEN, { key: "na", label: "I don't put client material in" }], { level: 3, skipIf: notNever }),
      q("skillReusable", "I have built a reusable workflow, template or custom assistant.", "skills", YESNO, { level: 4, skipIf: notNever }),
      q("skillAgents", "I can set up AI agents that carry out multi-step tasks for me (e.g. Claude Code, Codex).", "skills", YESNO, { level: 4, skipIf: notNever }),
      // Two short knowledge checks: a scenario with one careful answer.
      q("scenarioCheck", "An AI tool has summarised a 20-page client report for you. The summary reads well and sounds confident. What would you do before sending it to the client?", "scenario", [
        { key: "send", label: "Send it: it reads well, and the tool has read the whole report" },
        { key: "ask", label: "Ask the AI tool to confirm that its summary is accurate" },
        { key: "verify", label: "Check its key points and figures against the report, and look for what it left out" },
        { key: "tone", label: "Read it once more for tone and typos, then send it" },
        { key: "unsure", label: "I'm not sure" },
      ], { correct: "verify", sub: "Two short scenarios: which would you do?" }),
      q("scenarioData", "You want help drafting a report about a conflict in a client's team, using a free AI chat tool. Which is the most sensible approach?", "scenario", [
        { key: "paste", label: "Paste in my full notes: the tool does not share them with anyone" },
        { key: "strip", label: "Remove names and identifying details first, and check what my agreements with the client allow" },
        { key: "gdpr", label: "Use it only if the tool says it is GDPR-compliant, then paste in my notes" },
        { key: "unsure", label: "I'm not sure" },
      ], { correct: "strip" }),
      // Support: access, then use.
      q("supInOrg", "In my organisation there is someone I can turn to with questions about AI (e.g. AI lead, IT department, trained colleague).", "support",
        [...YESNO, { key: "na", label: "I work independently" }], { group: "access", sub: "Access" }),
      q("supOutside", "Outside work, I know someone with AI knowledge I could approach (e.g. friend, family member, network contact).", "support", YESNO, { group: "access" }),
      q("supFormal", "I have access to formal learning resources on AI (e.g. training, courses, internal knowledge base).", "support", YESNO, { group: "access" }),
      q("supOnline", "I follow online sources to learn about AI (e.g. YouTube, newsletters, communities, forums).", "support", YESNO, { group: "access" }),
      q("supAsked", "I have asked an expert or knowledgeable colleague for help with AI in the past six months.", "support", YESNO, { group: "use", sub: "Use of that support" }),
      q("supTraining", "I have taken part in an AI training or workshop.", "support", YESNO, { group: "use" }),
      q("supSelfTaught", "I learn mostly by trying things out on my own.", "support", YESNO, { group: "use" }),
      ["whyNot", { id: "whyNot", type: "multi", other: true, skipIf: { supAsked: ["yes"] }, skipIfEmpty: ["supAsked"],
        label: "You have not asked anyone for help with AI recently. Why not? Tick any.", options: [
          { key: "dontKnow", label: "I don't know who to ask" },
          { key: "embarrassed", label: "I feel embarrassed about how little I know" },
          { key: "noTime", label: "I don't have the time" },
          { key: "busy", label: "The people I could ask are too busy or hard to reach" },
          { key: "noNeed", label: "I don't feel the need" },
        ] }],
    ] as [string, Question][]);
  }

  export const QUESTIONNAIRE: Record<string, Question> = {
    frequency: {
      id: "frequency", type: "single", required: true,
      label: "How often does an AI tool (ChatGPT, Copilot, Claude, Gemini or similar) show up in your work?",
      options: [
        { key: "never",   label: "Never" },
        { key: "tried",   label: "I have tried it once or a few times" },
        { key: "monthly", label: "Now and then, a few times a month" },
        { key: "weekly",  label: "Most weeks" },
        { key: "daily",   label: "Most days" },
        { key: "multi",   label: "Every day, several times a day" },
        { key: "constant", label: "Constantly: an AI chat is open most of my day, or agents run tasks for me" },
      ],
    },
    uses: {
      id: "uses", type: "multi", skipIf: { frequency: ["never"] },
      label: "What have you used it for in your work? Tick all that apply.",
      options: [
        ...DOMAINS.map((d) => ({ key: d.key, label: d.label, hint: d.hint })),
        { key: "search", label: "Instead of a search engine", hint: "looking things up, quick questions, finding sources: where you would have used Google" },
      ],
    },
    tools: {
      id: "tools", type: "multi", skipIf: { frequency: ["never"] }, other: true,
      label: "Which tools?",
      options: [
        { key: "ChatGPT", label: "ChatGPT" },
        { key: "Microsoft Copilot", label: "Microsoft Copilot" },
        { key: "Claude", label: "Claude" },
        { key: "Gemini", label: "Gemini" },
        { key: "NotebookLM", label: "NotebookLM" },
        { key: "Perplexity", label: "Perplexity" },
        { key: "Transcription tool", label: "A transcription tool (Otter, Teams, Zoom)" },
      ],
    },
    stance: {
      id: "stance", type: "single", required: true,
      label: "Which comes closest to how you feel about AI in your work?",
      options: [
        { key: "enthusiast", label: "Keen: I want to do (more) with it" },
        { key: "pragmatic",  label: "Practical: useful for some things, not others" },
        { key: "cautious",   label: "Careful: open to it, with reservations" },
        { key: "sceptical",  label: "Doubtful: not convinced it helps my kind of work" },
        { key: "worried",    label: "Uneasy: I have concerns (clients, data, quality of thinking)" },
      ],
    },
    offer: {
      id: "offer", type: "multi", other: true,
      label: "If the network offered something on AI, what would be worth your time? Tick any.",
      options: [
        { key: "peer-halfday",   label: "A half-day with peers from this network" },
        { key: "one-to-one",     label: "An hour with someone looking at how I work" },
        { key: "confidentiality", label: "A checklist for using it safely with client material" },
        { key: "prompt-library", label: "A shared library of prompts from colleagues" },
        { key: "demos",          label: "Short demos from colleagues" },
        { key: "when-not",       label: "A conversation about whether and when not to use it (clients, data, ethics)" },
        { key: "nothing",        label: "Nothing on AI for now", exclusive: true },
      ],
    },
    pay: {
      id: "pay", type: "single", skipIf: { offer: ["nothing"] }, skipIfEmpty: ["offer"],
      label: "Would you pay for what you ticked?",
      options: [
        { key: "yes",    label: "Yes" },
        { key: "maybe",  label: "Possibly" },
        { key: "no",     label: "No" },
        { key: "unsure", label: "Don't know yet" },
      ],
    },
    canShow: {
      id: "canShow", type: "single", skipIf: { frequency: ["never", "tried"] },
      label: "Is there something you do with AI that you could show a colleague?",
      options: [
        { key: "yes",   label: "Yes" },
        { key: "maybe", label: "Maybe" },
        { key: "no",    label: "Not really" },
      ],
    },
    ...BLOCK_QUESTIONS(),
  };

  /** The questionnaire is shown as four short pages; the answers are one flat object. */
  export const PAGES: QuestionPage[] = [
    { id: "basics", title: "How AI shows up in your work", intro: "A few quick questions first.",
      qids: ["frequency", "uses", "tools", "stance"] },
    { id: "views", title: "How you see AI and your work", intro: "How much do you agree with each statement? There are no right answers: doubts are as useful to us as enthusiasm. Skip any you would rather not answer.",
      qids: ["viewEssential", "viewQuality", "viewChange", "viewBehind", "doubtReliability", "doubtPrivacy", "doubtCraft", "doubtEthics", "doubtPressure", "doubtTime", "reservation"] },
    { id: "skills", title: "What you actually do", intro: "Concrete things people do with AI, from basic to advanced. Answer for what you do now, not what you could do. It is fine to answer no to most of them.",
      qids: ["skillFollowUp", "skillCheck", "skillOwnMaterial", "skillPrompt", "skillAnonymise", "skillReusable", "skillAgents", "canShow", "scenarioCheck", "scenarioData"] },
    { id: "support", title: "Help and support", intro: "Where you could turn with questions about AI, whether you do, and what would be worth your time.",
      qids: ["supInOrg", "supOutside", "supFormal", "supOnline", "supAsked", "supTraining", "supSelfTaught", "whyNot", "offer", "pay"] },
  ];
  export const QUESTION_ORDER: string[] = PAGES.flatMap((pg) => pg.qids);

  /** True when a question should be skipped given the answers so far. */
  export function questionSkipped(qid: string, answers: Answers | Record<string, unknown> | null | undefined): boolean {
    const q = QUESTIONNAIRE[qid];
    if (!q) return false;
    const ans = answers as Record<string, unknown> | null | undefined;
    if (Array.isArray(q.skipIfEmpty) && q.skipIfEmpty.some((dep) => {
      const v = ans ? ans[dep] : undefined;
      return !(Array.isArray(v) ? v.length : v);
    })) return true;
    const skipIf = q.skipIf;
    if (!skipIf) return false;
    return Object.keys(skipIf).some((dep) => {
      const v = ans ? ans[dep] : undefined;
      const vals: unknown[] = Array.isArray(v) ? v : (v ? [v] : []);
      return vals.some((x) => skipIf[dep].includes(x as string));
    });
  }

  export function optionLabel(qid: string, key: string): string {
    const q = QUESTIONNAIRE[qid];
    const o = q && q.options.find((x) => x.key === key);
    return o ? o.label : key;
  }

  /** Plain-text summary of the questionnaire for the interviewer and profile prompts. */
  export function formatQuestionnaire(a: Answers | null | undefined): string {
    if (!a) return "(no questionnaire answers)";
    const rec = a as Record<string, unknown>;
    const lines: string[] = [];
    for (const qid of QUESTION_ORDER) {
      const q = QUESTIONNAIRE[qid];
      if (questionSkipped(qid, a)) continue;
      const v = rec[qid];
      let txt: string;
      if (q.type === "text") { if (v) lines.push(`- ${q.label} "${v}"`); continue; }
      if (q.block && !v) continue; // unanswered statements are left out
      if (Array.isArray(v)) txt = v.length ? v.map((k) => optionLabel(qid, String(k))).join("; ") : "(none ticked)";
      else txt = v ? optionLabel(qid, String(v)) : "(not answered)";
      const other = rec[qid + "Other"];
      if (other) txt = (Array.isArray(v) && !v.length ? "" : txt + "; ") + "other: " + other;
      lines.push(`- ${q.label} ${txt}`);
    }
    return lines.join("\n");
  }

  /** Gap (confidence mean minus skill index) at which confidence and concrete skills count as out of step. */
  export const CALIBRATION_GAP = 30;
  const SKILL_SCORE: Record<string, number> = { yes: 1, no: 0, always: 1, often: 2 / 3, sometimes: 1 / 3, never: 0 };

  /**
   * The questionnaire blocks reduced to a few numbers, in code: a 0–100 skill index from the concrete
   * skill items (weighted by level, so advanced behaviour counts more), scenario results, conviction,
   * doubts agreed with, and support. The confidence mean (0–100, from the ratings) is compared with the
   * skill index; a large gap is a signal, not a verdict.
   */
  export function computeSelfCheck(a: Answers | null | undefined, confidenceMean: number | null | undefined): SelfCheck | null {
    if (!a) return null;
    const rec = a as Record<string, unknown>;
    const has = (qid: string) => typeof rec[qid] === "string" && rec[qid] !== "" && !questionSkipped(qid, a);
    let wSum = 0, wScore = 0, skillsAnswered = 0, answered = 0, careful = 0, convN = 0, convSum = 0;
    const doubts: string[] = [], access: string[] = [], used: string[] = [];
    for (const qid of QUESTION_ORDER) {
      const q = QUESTIONNAIRE[qid];
      if (!q.block || !has(qid)) continue;
      const v = rec[qid] as string;
      if (q.block === "skills" && v in SKILL_SCORE) { const w = q.level || 1; wSum += w; wScore += w * SKILL_SCORE[v]; skillsAnswered++; }
      if (q.block === "scenario") { answered++; if (v === q.correct) careful++; }
      if (q.block === "views") {
        const i = AGREE.findIndex((o) => o.key === v);
        if (q.group === "conviction" && i >= 0) { convN++; convSum += i + 1; }
        if (q.group === "doubt" && POSITIVE.views.includes(v)) doubts.push(qid);
      }
      if (q.block === "support" && v === "yes") (q.group === "access" ? access : used).push(qid);
    }
    const skillIndex = skillsAnswered ? Math.round((100 * wScore) / wSum) : null;
    const mean = typeof confidenceMean === "number" && Number.isFinite(confidenceMean) ? confidenceMean : null;
    const gap = skillIndex !== null && mean !== null ? Math.round(mean - skillIndex) : null;
    const kind = gap === null ? "unknown" : gap >= CALIBRATION_GAP ? "confidence-above-skills" : gap <= -CALIBRATION_GAP ? "skills-above-confidence" : "in-line";
    return {
      skillIndex, skillsAnswered,
      scenarios: { answered, careful },
      conviction: convN ? Math.round((convSum / convN) * 10) / 10 : null,
      doubts, access, used,
      whyNot: Array.isArray(rec.whyNot) && !questionSkipped("whyNot", a) ? (rec.whyNot as string[]).slice() : [],
      reservation: typeof rec.reservation === "string" ? rec.reservation : "",
      calibration: { kind, gap },
    };
  }

  /** Plain-text reading of the self-check for the profile prompt. */
  export function formatSelfCheck(sc: SelfCheck | null): string {
    if (!sc) return "(no questionnaire answers)";
    const lbl = (ids: string[]) => ids.map((id) => QUESTIONNAIRE[id].label.replace(/\.$/, "")).join("; ");
    const lines = [
      `- Concrete skill index (from the skill items, advanced behaviour weighted more): ${sc.skillIndex === null ? "not answered" : sc.skillIndex + " / 100"}`,
      `- Scenarios: ${sc.scenarios.answered ? `${sc.scenarios.careful} of ${sc.scenarios.answered} answered with the careful option (checking key points against the source; removing identifying details and checking client agreements)` : "not answered"}`,
      `- Conviction (mean agreement, 1 = strongly disagree, 5 = strongly agree): ${sc.conviction === null ? "not answered" : sc.conviction}`,
      `- Doubts they agreed with: ${sc.doubts.length ? lbl(sc.doubts) : "none"}`,
      `- Support they have: ${sc.access.length ? lbl(sc.access) : "none named"}`,
      `- Support they used: ${sc.used.length ? lbl(sc.used) : "none"}`,
      `- Why they have not asked for help: ${sc.whyNot.length ? sc.whyNot.map((k) => optionLabel("whyNot", k)).join("; ") : "n/a"}`,
      `- Confidence vs concrete skills: ${sc.calibration.kind === "unknown" ? "cannot compare (ratings or skill items missing)" : `${sc.calibration.kind} (confidence mean minus skill index = ${sc.calibration.gap})`}`,
    ];
    return lines.join("\n");
  }

  // ---------------------------------------------------------------------------
  // 1. Interview
  // ---------------------------------------------------------------------------

  export function ladderText(): string {
    return LADDER.map((l) => `${l.level} ${l.label}: ${l.short}`).join("\n");
  }
  export function domainText(): string {
    return DOMAINS.map((d) => `- ${d.label} (${d.hint})`).join("\n");
  }

  /** The interviewer's standing instructions. Sent once as the first user message. */
  export function buildInterviewSystem(member: Partial<Member> | null | undefined, answers: Answers | null | undefined, lang: Lang = "en"): string {
    const name = (member && member.name) ? member.name.trim() : "the member";
    const role = (member && member.role) ? member.role.trim() : "a member of the network";
    const ticked = answers && Array.isArray(answers.uses) ? answers.uses.length : 0;
    // Routing decided in code: never-users, and members who tried it but ticked no area, take the
    // non-user path. Doubtful or uneasy members who do use AI keep the practice path.
    const nonUser = !!answers && (answers.frequency === "never" || (answers.frequency === "tried" && ticked === 0));
    const doubtful = !!answers && (answers.stance === "sceptical" || answers.stance === "worried");
    return `\
You are conducting a one-to-one interview, in ${lang === "nl" ? "Dutch" : "English"}, for the AI at Work Diagnostic run by \
${NETWORK}, a Dutch network of managers, advisers, trainers and coaches who work on \
collaboration and conflict in organisations. The person you are talking to is ${name}, who \
described their role as "${role}". ${lang === "nl" ? `Conduct the whole interview in Dutch: natural, plain spoken \
Dutch as colleagues use it, addressing ${name} with "je" (never "u"). Everything the member sees is in Dutch, \
including quick replies (say "Iets anders" for "Something else") and the rating task statements. These \
instructions are in English and their examples are illustrations: say them in natural Dutch, never \
translate word for word. If ${name} answers in English, you may continue in English.` : `Many members work in Dutch day to day; they chose to answer in \
English. Keep your language plain and short.`}${lang === "nl" ? " Keep your language plain and short." : ""}

# Purpose
Find out, in concrete terms, how ${name} actually uses AI tools in their own work today (or why \
they don't), what they have learned, and where their edges are. The network organiser will read \
the interviews (first names only) and use a map of all of them to see where the knowledge and the \
gaps are and who could help whom; nothing is shared with the whole network except anonymised, \
aggregated findings. ${name} will get personal feedback at the end that they can act on.

# Your manner
You are warm, curious and unhurried, like a good colleague over coffee, not an examiner. There \
are no right answers and nothing to prove. Never judge, grade, advise, teach or sell during the \
interview, and do not rate their answers ("nice", "great", "interesting"): acknowledge briefly in \
their own words, or simply ask the next question. If asked what you think, say warmly that the feedback comes at the end and return the \
question. Mirror their register. Use their own words back to them.

# Rules of the conversation
- Ask ONE question per message, then stop. Never stack questions, and never join two asks in one \
sentence ("what were you preparing, and which tool did you use?" is two questions). One or two \
sentences per message is the norm; three at most. No bullet lists, no headings. Use plain, \
natural wording a colleague would use; if they say a question is unclear, rephrase it simply.
- Concrete over abstract. When they speak in generalities ("I use it for writing"), ask for the \
most recent real instance. Then ask for one detail per message: how they went about it with the \
AI (what they asked it for, and whether it was one request or a back and forth), then what came \
back, then what they did with it and how they judged it. Never press for the exact words they \
typed; many people work in long back-and-forth exchanges and cannot recall them. If they cannot \
remember a detail, accept that and move on to what came out of it. Episodes are the evidence; \
opinions are not.
- Follow the thread they open before moving on. Cover ground over the whole conversation, not \
as a checklist.
- Short answers are fine. If an answer is two words, do not scold or repeat the question; ask a \
narrower open question instead. After two very short answers in a row, move to easier, more \
concrete ground.
- Sceptics and non-users are as valuable as daily users. If ${name} has never used AI tools, or \
distrusts them, treat that as the subject: where they have seen it used, what they have been \
asked, what stops them, what they would need to see. Never try to convince them. Do not ask a \
non-user to describe things they have not done.
- Daily users should feel stretched: ask how they verify output, where it has misled them, how \
they handle client confidentiality, what they do that colleagues could not yet do, what they \
still cannot get it to do.
- This is a SHORT interview: ask 4 to 7 questions, then request the ratings. The questionnaire \
below already covers how often they use AI, for what, with which tools, how they feel about it, \
their conviction and doubts, a list of concrete skills, two short scenarios, where they get help, \
and what they would value or pay for. Never ask those again. Use the skill answers to choose where \
to dig: ask for a real instance of something they said they do (especially the most advanced \
thing they said yes or often to), so the episode shows what the tick means. If they wrote a \
reservation, you may ask once, in the stretch questions, what it is grounded in. Your job is the part a \
questionnaire cannot get: concrete episodes and where their edges are. Do not pad. Never ask \
again anything they answered; if an answer shows (not answered) or (none ticked), you may ask it \
once inside an episode ("Which tool was that?").

# What ${name} said in the opening questionnaire (self-report; use it to choose where to dig)
${formatQuestionnaire(answers)}

# Ground to cover (adapt to the person)
${nonUser ? `${name} has ${answers.frequency === "never" ? "not used AI tools in their work" : "tried AI tools once or a few times but named no area of their work where they use them"}. \
Ask about two concrete moments: ${answers.frequency === "never" ? "" : "the most recent time they tried it and what happened, or "}one where AI came up (a colleague, a client, an article, a tool their organisation introduced) and what \
happened; then what stops them or what they would need to see to try it, taking the answer as it \
comes. Never try to convince them. Then go to the ratings with first-step items.` : `${doubtful ? `They \
said they feel ${answers.stance === "worried" ? "uneasy" : "doubtful"} about AI. Do not pitch or reassure; \
in the stretch questions, ask what their concern is grounded in, in their own work.
` : ""}1. PRACTICE: ask for the most recent real instance in the area they ticked that looks most \
central to their work: what task, which tool, what they typed, what came back, what they did with \
it. Probe once or twice for specifics. Then ask for one more episode in the ticked area that looks \
least supported by what you have heard so far (often building tools, analysis, or work with \
clients). If it turns out to be a plan or a one-off, that is a finding; do not push. Listen for these areas, without naming them as a list:
${domainText()}
2. STRETCH: one or two questions on their edges, chosen to fit what you heard: how they check \
output, when they decide not to use AI, how they handle client material, what they would like to \
be able to do but cannot.${answers && answers.canShow === "yes" ? ` They said they could show a \
colleague something: ask once what it is, if it has not come up.` : ""}`}
3. RATE: the self-efficacy ratings (see below).
4. CLOSE: one warm closing message. Say the feedback is being prepared. Do not summarise.

# Self-efficacy ratings (RATE phase)
When you have enough concrete material (usually after 4 to 6 questions), write a short message \
that says you would like them to rate their confidence on a few tasks drawn from what they \
described, and that there are no right answers; then append a RATE marker (format below) with \
3 to 5 task statements. Rules for the statements, following Bandura's guide for constructing \
self-efficacy scales:
- Each is a specific, doable task in ${name}'s OWN work that requires actually using an AI tool \
on their own material, written as "can do" (capability now), not "will do", not a trait, not a \
feeling. A task about rules, boundaries or explaining AI to others does not count unless the tool \
is used in it. Example: "Use an AI tool to turn your rough notes \
from an intake conversation into a first draft of a proposal, and judge what in the draft to keep."
- Graded in difficulty so the set has a floor and a ceiling: at most two items may be things they \
have clearly already done; at least one must be one step beyond what they described, and at least \
one two steps beyond. For someone already at level 3 or 4, "beyond" means a harder version of their \
own practice (for others, with a client's own material, live in the room). Give each item a \
"beyond" value: 0 = they have clearly done this, 1 = one step beyond what they described, 2 = two \
steps beyond. Also give each a "level" from 1 to 4 using this ladder (level 0 is "has not used"; a \
level-1 task is an exploring-level task, and so on):
${ladderText()}
- Phrase every task in the member's own domain and words; never generic "use AI effectively".
- Describe tools by what they do, not by product feature names that date quickly: say "set up a \
reusable AI assistant or agent with your own context", not "build a custom GPT or Claude project".
- For a non-user the easy items describe first steps ("Open a free AI chat tool and ask it to \
summarise a one-page document, then check the summary against the original") and the harder \
ones a realistic next step in their work.
In the visible message, ask them to rate what they can do today, not what they would like to be \
able to do. The page will show the statements as sliders from 0 (cannot do at all) to 100 (highly \
certain can do). Inside task strings use no double quotes (use single quotes if needed), no line \
breaks, and no trailing comma after the last object. The member's ratings come back to you as a \
message. After the ratings, ask at most one \
short follow-up about the biggest gap between two ratings if it is interesting, then close.

# Control markers (CRITICAL: exact format, after your visible message, each on its own line)
Every message ends with a phase marker naming the phase your NEXT question belongs to:
${MARK.PHASE_OPEN} orient ${MARK.CLOSE}   (one of: orient, practice, stretch, rate, close)
The rating request also includes, on its own line, strictly valid JSON:
${MARK.RATE_OPEN} [{"id":"r1","task":"…","level":2,"beyond":0},{"id":"r2","task":"…","level":3,"beyond":1}] ${MARK.CLOSE}
The rating request itself ends with ${MARK.PHASE_OPEN} rate ${MARK.CLOSE}; the message after the \
ratings ends with ${MARK.PHASE_OPEN} close ${MARK.CLOSE}.
Your final closing message also includes, on its own line: ${MARK.COMPLETE}
Quick replies (chips) are rare and optional. Add them ONLY when your question is itself a closed \
choice: WHEN something happened ("Was that this week or longer ago?"), or WHICH of two or three \
things the member has already mentioned or ticked. Every chip must be a direct answer to the exact \
question in your message. Never add chips to an open question (what, how, why, tell me about), \
and never offer chips that supply what they did, why, or how they judged it. Format: on its own \
line, 2 to 4 short options as strictly valid JSON, each under 40 characters, always including \
"Something else":
${MARK.CHIPS_OPEN} ["This week", "This month", "Longer ago", "Something else"] ${MARK.CLOSE}
The member can tap one or still type. Never use chips on the rating request or the closing.
Never use the "<<" sequence anywhere except in these markers. The member never sees the markers.

Begin now: greet ${name} by name in one sentence, say in one sentence that you would like to hear \
${nonUser ? "how AI has or hasn't come up around their work" : "about one or two real examples from their work"}, \
and ask your first question.`;
  }

  /** Opening message list: system block + a kick-off user line. */
  export function openingMessages(_member?: Partial<Member> | null, _answers?: Answers | null): ChatMessage[] {
    // Web port: the instruction block goes in the API's `system` parameter (buildInterviewSystem),
    // so the message list starts with this short kick-off user turn instead.
    return [{ role: "user", content: KICKOFF }];
  }

  /** Convert the running transcript into the sample() message list. */
  export function interviewMessages(member: Partial<Member> | null | undefined, turns: Turn[], opts?: { endNow?: boolean; nudge?: string; answers?: Answers | null }): ChatMessage[] {
    const msgs = openingMessages(member, opts && opts.answers);
    for (const t of turns) {
      msgs.push({ role: t.role === "interviewer" ? "assistant" : "user", content: (t.tapped ? "[tapped quick reply] " : "") + t.text });
    }
    const extra = (opts && opts.nudge) ? opts.nudge : "";
    if (opts && opts.endNow) {
      msgs.push({
        role: "user",
        content:
          "[I need to stop here.]\n\n(Instruction: the member is ending early. Do not ask another " +
          "question. Thank them warmly in one or two sentences, say that feedback will be based on what " +
          `they shared so far, then output ${MARK.PHASE_OPEN} close ${MARK.CLOSE} and ${MARK.COMPLETE}.)`,
      });
    } else if (extra) {
      // Page-side steering appended to the member's last answer (e.g. forcing the rate phase).
      const last = msgs[msgs.length - 1];
      if (last.role === "user") last.content += "\n\n" + extra;
      else msgs.push({ role: "user", content: extra });
    }
    // sample() must end on a user turn.
    if (msgs[msgs.length - 1].role !== "user") {
      msgs.push({ role: "user", content: "[Please continue.]" });
    }
    return msgs;
  }

  export const NUDGES = {
    forceRate:
      "(Instruction from the page: enough material has been gathered. Do not ask another question. " +
      "Write the short rating request now and append the RATE marker with 3 to 5 graded task statements " +
      "drawn from what has been said, each with id, task, level and beyond, then the phase marker rate.)",
    forceClose:
      "(Instruction from the page: close the interview now in one warm message, with the phase marker " +
      `close and ${MARK.COMPLETE}. Do not ask another question.)`,
    missingRate:
      "(Instruction from the page: your last message did not include a valid RATE marker. Repeat a " +
      "one-sentence rating request and append a valid RATE marker: strictly valid JSON array of 3 to 5 " +
      "objects with id, task, level and beyond (0 = done before, 1 = one step beyond, 2 = two steps beyond).)",
  };

  /** Format the member's slider answers as the user turn the interviewer reads. */
  export function formatRatingsTurn(items: RateItem[], ratings: Ratings): string {
    const lines = items.map((it) => {
      const r = ratings[it.id];
      const v = (typeof r === "number") ? r : "(skipped)";
      return `- ${it.task} → ${v}`;
    });
    return "My confidence ratings (0 = cannot do at all, 100 = highly certain I can do):\n" + lines.join("\n");
  }

  // ---------------------------------------------------------------------------
  // 2. Profile: one JSON object from the transcript + ratings
  // ---------------------------------------------------------------------------

  export function transcriptText(turns: Turn[]): string {
    return turns
      .map((t) => `${t.role === "interviewer" ? "Interviewer" : "Member"}: ${t.tapped ? "[tapped] " : ""}${t.text}`)
      .join("\n\n");
  }

  export function buildProfilePrompt(member: Partial<Member>, turns: Turn[], items: RateItem[] | null | undefined, ratings: Ratings | null | undefined, answers: Answers | null | undefined, lang: Lang = "en"): string {
    const name = member.name || "the member";
    const ratingLines = (items || []).map((it) => {
      const r = ratings ? ratings[it.id] : undefined;
      return `- [level ${it.level}] ${it.task} → ${typeof r === "number" ? r : "skipped"}`;
    });
    const rated = (items || []).map((it) => (ratings ? ratings[it.id] : undefined)).filter((v): v is number => typeof v === "number");
    const sc = computeSelfCheck(answers, rated.length ? Math.round(rated.reduce((x, y) => x + y, 0) / rated.length) : null);
    return `\
You are writing the profile for one member who has just finished the AI at Work Diagnostic \
interview for ${NETWORK} (a Dutch network of managers, advisers, trainers and coaches \
working on collaboration and conflict in organisations). You are given their opening \
questionnaire, their interview transcript and their self-efficacy ratings. Produce ONE JSON object and nothing else: no prose before or \
after, no code fences.

Member: ${name}, role: "${member.role || "unknown"}".

# Their opening questionnaire (self-report)
${formatQuestionnaire(answers)}

# Two separate readings: described practice and rated confidence
Code PRACTICE from what they DESCRIBED doing in the interview (episodes, specifics, judgement), \
never from the questionnaire, the ratings or how they talk about themselves. The questionnaire \
says what they claim; the episodes are the evidence. A ticked area with no episode is not a domain. \
A member line starting [tapped] is a quick reply the interviewer offered: a choice, never a quote \
or evidence on its own, and never one of the "quotes". Use this ladder; pick the highest level that the \
evidence genuinely supports, and if in doubt go one lower:
${ladderText()}

Code CONFIDENCE from the ratings only. The ratings were on tasks graded by level:
${ratingLines.length ? ratingLines.join("\n") : "(no ratings were given)"}

The two readings are kept separate on purpose: the organiser wants to see where confidence and \
practice diverge. Do not smooth one towards the other.

# Concrete skills, scenarios, views and support (computed in code from the questionnaire)
${formatSelfCheck(sc)}
Self-assessment is least reliable for people with little experience: they often cannot yet judge \
what they do or how well. Treat a large gap between confidence and the concrete skills (or the \
described practice, or a scenario answered without the careful option) as a signal worth naming \
gently, never as a verdict.

# Domains (use ONLY these keys; include a domain only with a quote or close paraphrase as evidence)
${DOMAINS.map((d) => `- ${d.key}: ${d.label} (${d.hint})`).join("\n")}

# Stance (one of): ${STANCES.join(", ")}

# Feedback the member will read (second person, warm, plain, specific to THEIR work)
- Reflect back what stood out in their practice. Name one or two real strengths grounded in \
episodes they described (a non-user can have strengths: clear judgement about risk, a precise \
sense of what their work needs).
- Then two or three pieces of advice ("nextSteps"). Each has a short why for them and two or three \
specific next steps they can take, matched to their level: a tool or feature to try, an exercise, \
or a use case from their own work (their clients, their sessions, their documents). Say how they \
would know it worked. Tailor the advice to their whole profile: conviction and doubts, concrete \
skills and scenario answers, access to support, and willingness to pay. A daily user is \
stretched (verification habits, sharing a method, a boundary on client data, building something \
reusable); a beginner gets small, safe first steps on their own material.
- Scepticism is a valid position, not a deficit. For someone who is doubtful, uneasy or agreed \
with several doubts, take their concerns seriously in their own terms: suggest low-risk ways to \
explore AI within their own boundaries, or confirm a legitimate reason not to, rather than pushing \
adoption. Never argue them out of a concern.
- Use their support answers to make the advice concrete. If they have someone to ask but have not \
asked, suggest a specific first step (a question to bring, a short session to propose). If they \
have no one, point to a type of external route (a course, a community of practice, coaching, a \
peer group in this network). Address their reason for not asking (no time, embarrassment, not \
knowing who) kindly.
- "followUp": where relevant, one follow-up route that fits their willingness to pay: if they \
would pay, a paid route such as a training, a workshop or coaching; if possibly or not sure, a \
low-cost try-out first; if not, self-study or a peer exchange. Describe routes by type; never name \
a specific course, provider, community or website, because you cannot check that it exists. \
Tools may be named only if they are widely known and they mentioned them or they are standard \
(e.g. the chat tool they already use).
- "calibration": if their confidence ratings and their concrete skills, scenario answers or \
described practice diverge, say so kindly and usefully in one or two sentences ("you rated \
yourself cautiously on X, yet you described doing exactly that last month"; "you feel quite \
sure about checking output; one scenario suggests a quicker check than the work may need"). \
Empty string if they line up or there is too little to compare.
- Never invent views, tools or episodes they did not mention. Where there is little signal, say \
so rather than fill the gap. No scores in the feedback text.

# Output shape (all fields required; keep each string short)
${lang === "nl" ? `Language: the member took part in Dutch. Write every string inside "feedback" in natural, plain Dutch, \
addressing them with "je" (never "u"). Keep "quotes" verbatim (Dutch). All other strings (practice, \
confidence, wants, offers, productSignals) are for the organiser and are in English.` : "All strings in English; quotes verbatim."}
{
  "practice": {
    "level": 0-4,
    "summary": "2–3 sentences, third person, grounded in what ${name} described",
    "domains": [ { "key": "writing", "evidence": "short quote or close paraphrase of something they DID" } ],   // use an empty array for a non-user
    "probedNoEpisode": [ "domain keys they ticked AND you can see were asked about in the interview, where no real episode emerged (a plan, a one-off, a deflated claim); empty if none" ],
    "tools": [ "tools they themselves use, or empty; never tools they only mentioned" ],
    "judgement": "1–2 sentences: how they check output, data/confidentiality, when they choose not to use AI",
    "stance": "one of the stances"
  },
  "confidence": {
    "pattern": "one sentence on the shape of the ratings (where high, where it drops); 'no ratings' if none"
  },
  "wants": [ "what they said in the interview they want to get better at, 0–3 short items" ],
  "offers": [ "what they described that they could show a colleague, 0–2 short items, empty if nothing" ],
  "productSignals": {
    "quote": "a short verbatim line from the interview about what they would value, or empty string"
  },
  "feedback": {
    "headline": "one warm line, e.g. ${lang === "nl" ? `'Dank je, ${name}: dit viel op'` : `'Thanks ${name}: here is what stood out'`}",
    "summary": "2–3 sentences, second person",
    "strengths": [ "1–2 items, each one sentence, grounded in an episode" ],
    "nextSteps": [ { "title": "short imperative", "detail": "1–2 sentences: why this, for them, and how they will know it worked", "steps": [ "2–3 specific next steps, each one sentence" ] } ],   // 2–3 pieces of advice
    "calibration": "one or two gentle sentences, or empty string",
    "followUp": "one or two sentences on a follow-up route that fits their willingness to pay, or empty string",
    "closing": "one warm sentence"
  },
  "quotes": [ "2–4 short verbatim lines from the member that could be shared anonymously" ]
}

# Transcript
${transcriptText(turns)}`;
  }

  // ---------------------------------------------------------------------------
  // 3. Share-back: a page the organiser sends to the whole network
  // ---------------------------------------------------------------------------

  export function compactProfileForAggregate(p: Profile) {
    return {
      role: p.member.role,
      practiceLevel: p.practice.level,
      domains: p.practice.domains.map((d) => d.key),
      stance: p.practice.stance,
      confidenceMean: p.confidence.mean,
      divergence: p.divergence && p.divergence.kind,
      judgement: p.practice.judgement,
      wants: p.wants,
      offers: p.offers,
      wouldPayFor: p.productSignals && p.productSignals.wouldPayFor,
      pay: p.productSignals && p.productSignals.pay,
      quotes: p.quotes,
      ...(p.selfCheck ? {
        skillIndex: p.selfCheck.skillIndex,
        scenariosCareful: `${p.selfCheck.scenarios.careful} of ${p.selfCheck.scenarios.answered}`,
        conviction: p.selfCheck.conviction,
        doubts: p.selfCheck.doubts,
        supportHave: p.selfCheck.access,
        supportUsed: p.selfCheck.used,
        whyNotAsked: p.selfCheck.whyNot,
        reservation: p.selfCheck.reservation,
        confidenceVsSkills: p.selfCheck.calibration.kind,
      } : {}),
    };
  }

  export function buildSharebackPrompt(profiles: Profile[], stats: unknown): string {
    const data = profiles.map(compactProfileForAggregate);
    return `\
You are writing a short share-back page for the members of ${NETWORK}, a Dutch network \
of managers, advisers, trainers and coaches who work on collaboration and conflict in \
organisations. ${profiles.length} members each had an AI-led interview about how they use AI in \
their work and rated their confidence on tasks from their own practice. You are given the \
anonymised profiles and some computed statistics. Write for the members, in Dutch (natural and plain, \
addressing the reader with "je"), warm and \
plain, as a colleague reporting back to colleagues. Produce ONE JSON object and nothing else.

Rules:
- Faithful to the data. Express how common something is in plain words ("most of us", "a few", \
"about a third"), never percentages or scores. Never name a member. Quotes must be verbatim (in the language they were said) \
from the "quotes" fields.
- No ladder levels, no "level 3", no jargon. Describe practice in everyday words.
- The members are the audience: this should make them want to talk to each other. Name what \
people in the network can show each other, as roles and practices ("a trainer who …"), not names.
- Honest about the gaps and the scepticism; sceptics should recognise themselves without being \
patronised.
- "Three things to try" must be concrete practices someone in this network described, phrased so \
a colleague could try them this week.

Statistics: ${JSON.stringify(stats)}

Profiles: ${JSON.stringify(data)}

Output shape:
{
  "title": "short title for the page",
  "intro": "2–3 sentences: what we did and why",
  "picture": "one paragraph: the overall spread of practice in the network, in everyday words",
  "findings": [ { "title": "…", "detail": "2–3 sentences" } ],    // 3–5 findings, including one on confidence vs practice and one on scepticism or worry
  "quotes": [ "verbatim quote", "…" ],                              // 3–5
  "helpMap": [ { "need": "…", "whoCanHelp": "described as roles/practices, not names" } ],   // 3–5
  "tryThisWeek": [ { "title": "…", "detail": "…" } ],              // exactly 3
  "closing": "2–3 sentences: what happens next; an invitation to respond"
}`;
  }

  // ---------------------------------------------------------------------------
  // 4. Organiser's product read: is there something to sell here?
  // ---------------------------------------------------------------------------

  export function buildProductReadPrompt(profiles: Profile[], stats: unknown): string {
    const data = profiles.map(compactProfileForAggregate);
    return `\
You advise the organiser of ${NETWORK}, a Dutch network of managers, advisers, trainers \
and coaches working on collaboration and conflict in organisations. She wants to offer members \
something on AI literacy, possibly paid, and is tired of giving advice away for free. She has \
run an AI-led diagnostic interview with ${profiles.length} members. You are given anonymised \
profiles and statistics. Give her a sober product read in ONE JSON object and nothing else.

Be specific to what these members actually said they would value or pay for, and to the shape \
of the practice spread (where the mass of the network is, where the gaps are, who could act as \
peer teachers). Where present, use their support answers (who has someone to ask, who has asked, \
why not), their doubts and their concrete skills: members with no one to ask, or who do not ask \
out of embarrassment, are a different market from members who learn on their own. Weigh honestly: say what the evidence does not support. Prefer offers that use \
the network's own expertise over generic AI training. Keep every string short and plain.

Statistics: ${JSON.stringify(stats)}
Profiles: ${JSON.stringify(data)}

Output shape:
{
  "verdict": "one or two sentences: is there a product here, and of what kind",
  "demand": [ "2–4 short bullets on what members said they would value or pay for, with how many said it" ],
  "options": [ { "name": "…", "forWhom": "…", "shape": "2 sentences", "evidence": "what in the data supports it", "risk": "one sentence" } ],   // 2–3 options
  "notSupported": [ "1–3 things the data does not support yet" ],
  "nextTest": "one sentence: the cheapest next experiment to find out"
}`;
  }
