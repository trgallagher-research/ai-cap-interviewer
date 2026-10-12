import { z } from "zod";

// The inbox file schema — see training-log/README.md "Inbox file schema"
// for the human-readable contract a chat assistant should target. This is
// the source of truth for validation; keep the two in sync.

export const SetEntrySchema = z.object({
  order: z.number().int().positive(),
  exercise: z.string().trim().min(1),
  load_kg: z.number().min(0),
  scheme: z.string().trim().min(1),
  reps: z.array(z.number().int().min(0)).min(1),
  rpe: z.number().min(0).max(10).nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const SessionFileSchema = z.object({
  schema_version: z.literal(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  source: z.enum(["HYP", "PT"]),
  block: z.string().trim().min(1),
  session: z.string().trim().min(1),
  exercises: z.array(SetEntrySchema).min(1),
  session_notes: z.string().nullable().optional(),
});

export type SetEntry = z.infer<typeof SetEntrySchema>;
export type SessionFile = z.infer<typeof SessionFileSchema>;

export interface ReconciledSetEntry extends SetEntry {
  canonicalExercise: string;
  matchedVia: "canonical" | "alias";
}

export interface ReconciledSession extends Omit<SessionFile, "exercises"> {
  exercises: ReconciledSetEntry[];
}
