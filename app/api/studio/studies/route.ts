import { NextResponse } from "next/server";
import { getCreator } from "@/lib/auth";
import type {
  AnalysisFramework,
  CustomFramework,
  Guide,
  Intro,
} from "@/lib/types";

const FRAMEWORKS: AnalysisFramework[] = ["sdt", "cyborg_centaur", "samr", "custom"];

export const runtime = "nodejs";

// Creator-only: create a study owned by the logged-in creator. The insert runs
// under the authed (RLS) client, so owner_id must be the creator's own id.
export async function POST(req: Request) {
  const creator = await getCreator();
  if (!creator) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const {
      title,
      topic,
      guide,
      intro,
      targetMinutes,
      visibility,
      analysisFramework,
      analysisFrameworkCustom,
    } = (await req.json()) as {
      title: string;
      topic: string;
      guide: Guide;
      intro?: Intro;
      targetMinutes?: number;
      visibility: "public" | "controlled";
      analysisFramework?: AnalysisFramework | null;
      analysisFrameworkCustom?: CustomFramework | null;
    };
    if (!title?.trim() || !topic?.trim() || !guide?.objectives?.length) {
      return NextResponse.json(
        { error: "Title, topic and a guide are required" },
        { status: 400 },
      );
    }

    // Normalise the optional framework lens. Only persist a valid key; 'custom' needs a
    // name + definition, else it's treated as no framework.
    const framework =
      analysisFramework && FRAMEWORKS.includes(analysisFramework)
        ? analysisFramework
        : null;
    const custom =
      framework === "custom" &&
      analysisFrameworkCustom?.name?.trim() &&
      analysisFrameworkCustom?.definition?.trim()
        ? {
            name: analysisFrameworkCustom.name.trim(),
            definition: analysisFrameworkCustom.definition.trim(),
          }
        : null;
    const frameworkToSave = framework === "custom" && !custom ? null : framework;

    const { data, error } = await creator.supabase
      .from("studies")
      .insert({
        owner_id: creator.user.id,
        title: title.trim(),
        topic: topic.trim(),
        guide,
        intro: intro ?? null,
        target_minutes: targetMinutes ?? intro?.minutes ?? null,
        visibility: visibility === "public" ? "public" : "controlled",
        analysis_framework: frameworkToSave,
        analysis_framework_custom: custom,
        status: "active",
      })
      .select("id")
      .single();
    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || "Failed to create study" },
        { status: 500 },
      );
    }
    return NextResponse.json({ id: data.id });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 },
    );
  }
}
