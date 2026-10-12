import { transcriptionEnabled } from "@/lib/groq";
import { NewStudy } from "./NewStudy";

// Server shell: resolves whether voice input is available (a server-only env check) and
// hands it to the client builder, so the mic is hidden when no transcription key is set.
export default function NewStudyPage() {
  return <NewStudy voiceEnabled={transcriptionEnabled()} />;
}
