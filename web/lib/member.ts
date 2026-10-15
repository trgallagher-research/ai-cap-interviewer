/* member.ts: the member-safe views of server data. Members never receive practice level,
 * divergence, stance, quotes or the rating items' difficulty levels. */
import type { MemberResult, Profile, RateItem } from "./aiwd/types";
import type { InterviewRecord } from "./store";

export interface MemberRateItem { id: string; task: string }

/** Rate items for the member: easiest first (member.js sorts by level, then original order),
 *  then stripped to {id, task}: the difficulty coding stays organiser-only. */
export function memberRateItems(items: RateItem[] | null | undefined): MemberRateItem[] | null {
  if (!items) return null;
  return items
    .map((it, i) => ({ it, i }))
    .sort((a, b) => (a.it.level - b.it.level) || (a.i - b.i))
    .map(({ it }) => ({ id: it.id, task: it.task }));
}

export function memberState(rec: InterviewRecord) {
  const s = rec.state;
  return {
    member: { name: s.member.name, role: s.member.role },
    lang: s.lang === "nl" ? "nl" : "en",
    answers: s.answers,
    turns: s.turns.map((t) => (t.tapped ? { role: t.role, text: t.text, tapped: true } : { role: t.role, text: t.text })),
    phase: s.phase,
    status: s.status,
    rateItems: s.status === "rating" ? memberRateItems(s.rateItems) : null,
    chips: s.chips || null,
    ratingsSubmitted: !!s.ratings,
    finished: !!rec.result,
  };
}

export function memberResult(p: Profile): MemberResult {
  return {
    feedback: {
      headline: p.feedback.headline,
      summary: p.feedback.summary,
      strengths: p.feedback.strengths.slice(),
      nextSteps: p.feedback.nextSteps.map((s) => ({ title: s.title, detail: s.detail, steps: (s.steps || []).slice() })),
      calibration: p.feedback.calibration || "",
      followUp: p.feedback.followUp || "",
      closing: p.feedback.closing,
    },
    ratings: p.confidence.items.map((it) => ({ task: it.task, rating: typeof it.rating === "number" ? it.rating : null })),
    endedEarly: !!p.endedEarly,
    ...(p.reportToken ? { reportToken: p.reportToken } : {}),
    ...(p.emailStatus ? { emailState: p.emailStatus.state } : {}),
  };
}
