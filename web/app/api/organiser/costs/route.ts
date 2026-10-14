import type { NextRequest } from "next/server";
import { requireOrganiser } from "@/lib/auth";
import { errorResponse, noStore } from "@/lib/http";
import { MODELS } from "@/lib/llm";
import { groqPricePerHour, PRICES } from "@/lib/pricing";
import { COST_KINDS, costDays, costInterviews, costTotals, listProfiles, type CostCounters } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const METRICS = ["micro", "calls", "input", "output", "cacheRead", "cacheWrite", "seconds", "fallbacks"] as const;

function byKind(c: CostCounters) {
  const kinds: Record<string, Record<string, number>> = {};
  for (const k of COST_KINDS) kinds[k] = Object.fromEntries(METRICS.map((m) => [m, c[k + "." + m] || 0]));
  const usd = COST_KINDS.reduce((a, k) => a + kinds[k].micro, 0) / 1e6;
  const calls = COST_KINDS.reduce((a, k) => a + kinds[k].calls, 0);
  return { usd, calls, kinds };
}

/**
 * GET → estimated spend: totals by kind, the last 30 days, and per interview (joined to the
 * member's name when the interview finished). Owner only.
 */
export async function GET(req: NextRequest) {
  const auth = await requireOrganiser(req, { owner: true });
  if (auth.denied) return auth.denied;
  try {
    const total = byKind(await costTotals());
    const days = (await costDays(30)).map((d) => ({ date: d.date, usd: byKind(d.counters).usd }));
    const profiles = await listProfiles();
    const byIv = new Map(profiles.filter((p) => p.interviewId).map((p) => [p.interviewId as string, p]));
    const interviews = (await costInterviews()).map((r) => {
      const s = byKind(r.counters);
      const p = byIv.get(r.id);
      return { id: r.id, name: p ? p.member.name : null, finished: !!p, usd: s.usd, calls: s.calls };
    });
    const finished = interviews.filter((i) => i.finished);
    const avgPerFinished = finished.length ? finished.reduce((a, i) => a + i.usd, 0) / finished.length : null;
    const month = new Date().toISOString().slice(0, 7);
    const thisMonth = days.filter((d) => d.date.startsWith(month)).reduce((a, d) => a + d.usd, 0);
    return noStore({
      total, days, thisMonth, avgPerFinished, interviews,
      pricing: { models: MODELS, prices: { [MODELS.interview]: PRICES[MODELS.interview] || null, [MODELS.reasoning]: PRICES[MODELS.reasoning] || null }, groqPerHour: groqPricePerHour() },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
