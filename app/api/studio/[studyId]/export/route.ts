import { NextRequest, NextResponse } from "next/server";
import { getCreator } from "@/lib/auth";

export const runtime = "nodejs";

interface InterviewRow {
  id: string;
  status: string;
  created_at: string;
  email: string | null;
  consent_version: string | null;
}
interface TurnRow {
  interview_id: string;
  role: string;
  text: string;
  idx: number;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ studyId: string }> },
) {
  const { studyId } = await params;
  const creator = await getCreator();
  if (!creator) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: study } = await creator.supabase
    .from("studies")
    .select("id")
    .eq("id", studyId)
    .single();
  if (!study) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: ivData } = await creator.supabase
    .from("interviews")
    .select("id,status,created_at,email,consent_version")
    .eq("study_id", studyId)
    .order("created_at", { ascending: true });
  const interviews = (ivData ?? []) as InterviewRow[];
  const ids = interviews.map((i) => i.id);

  let turns: TurnRow[] = [];
  if (ids.length) {
    const { data: tData } = await creator.supabase
      .from("turns")
      .select("interview_id,role,text,idx")
      .in("interview_id", ids)
      .order("idx", { ascending: true });
    turns = (tData ?? []) as TurnRow[];
  }
  const byInterview = new Map<string, TurnRow[]>();
  for (const t of turns) {
    const arr = byInterview.get(t.interview_id) ?? [];
    arr.push(t);
    byInterview.set(t.interview_id, arr);
  }

  const format =
    new URL(req.url).searchParams.get("format") === "json" ? "json" : "csv";

  if (format === "json") {
    const payload = interviews.map((i) => ({
      ...i,
      turns: (byInterview.get(i.id) ?? []).map((t) => ({
        idx: t.idx,
        role: t.role,
        text: t.text,
      })),
    }));
    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="study-${studyId}.json"`,
      },
    });
  }

  // CSV: one row per turn.
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const rows = ["interview_id,created_at,status,email,turn_idx,role,text"];
  for (const i of interviews) {
    for (const t of byInterview.get(i.id) ?? []) {
      rows.push(
        [
          esc(i.id),
          esc(i.created_at),
          esc(i.status),
          esc(i.email ?? ""),
          t.idx,
          esc(t.role),
          esc(t.text),
        ].join(","),
      );
    }
  }
  return new NextResponse(rows.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="study-${studyId}.csv"`,
    },
  });
}
