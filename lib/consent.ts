// Consent shown before an interview begins, plus the fuller privacy notice rendered
// at /privacy.
//
// All placeholders are filled: controller is Timothy Gallagher (a personal project, NOT
// any organisation); contact is aligned.benchmark@gmail.com (a reachable inbox — not a
// send-only GitHub noreply address); retention is research-complete / ≤12 months; and
// the research purpose is set. A reviewer should still sign off the final wording before
// any link is shared (commercial use, EU/UK respondents → stricter than academic
// research). Operational checklist in docs/gdpr-compliance.md. Bump CONSENT_VERSION
// whenever the wording changes; the version + timestamp are stored on each interview row
// so it's always clear who agreed to what.

export const CONSENT_VERSION = "2026-07-10";

export const CONSENT_TEXT = `This is a voluntary research interview conducted by an AI interviewer as part of independent socio-technical research by Timothy Gallagher.

What we collect and why. Your answers — whether typed or spoken — are stored as text and used to understand the topic and to inform research into the socio-technical dimensions of how AI is deployed across industries. Our AI providers (Anthropic and Groq) do not use your responses to train their models. To deliver and secure the service, our hosting also processes limited technical data such as your IP address. If you answer by voice, your audio is sent to our transcription provider Groq (a speech-to-text service — not xAI's “Grok”) only to turn it into text, and is not kept afterwards. Leaving an email at the end is optional; if you choose to, you can opt in to be sent a summary of your own interview, an optional reflection on your own answers read through a psychological or educational framework, and/or the study's overall findings later — delivered through our email provider Resend and used only for that. Any such reflection is an interpretation offered to help you think — not a score, a diagnosis, or advice.

Legal basis. We rely on your consent. Some answers may reveal sensitive details (for example about health or beliefs); by continuing you explicitly consent to us processing such details for this research.

Who handles your data. Our service providers — Anthropic (running the interview), Groq (voice-to-text), Resend (email delivery, if you opt in), Supabase (storage) and Vercel (hosting) — process data on our behalf under data-processing agreements. Some are based in the United States; transfers are protected by Standard Contractual Clauses / the EU–US Data Privacy Framework.

Retention. We keep your responses until the research is complete (at most 12 months after your interview), then delete them.

Your rights. You can stop at any time, and you can ask to access or delete your data — quote the reference code shown at the end and contact aligned.benchmark@gmail.com. You can also withdraw consent or complain to your data protection authority (in the UK, the ICO).

By continuing you confirm you are 18 or older and agree to the above.`;

// Sections for the standalone /privacy page (same substance, room to breathe).
export const PRIVACY_SECTIONS: { heading: string; body: string }[] = [
  {
    heading: "Who we are",
    body: "This research is run by Timothy Gallagher, the data controller. For any question about your data, contact aligned.benchmark@gmail.com.",
  },
  {
    heading: "What we collect",
    body: "The text of your interview answers, an optional email if you choose to leave one (used only to send you the report(s) you opt into — which may include a summary of your interview, an interpretive reflection on your answers through a chosen framework, and/or the study's overall findings), and a reference code generated for your session. Our hosting also processes limited technical data, such as your IP address, to deliver and secure the service. If you answer by voice, your audio is processed only to transcribe it to text and is not retained.",
  },
  {
    heading: "Why, and on what basis",
    body: "We process your responses on the basis of your consent, to understand the topic and to inform research into the socio-technical dimensions of how AI is deployed across industries. Where answers reveal special-category details, we rely on your explicit consent.",
  },
  {
    heading: "Who processes it",
    body: "Anthropic (conducting and analysing the interview), Groq (voice-to-text), Resend (email delivery, if you opt in to receive a report), Supabase (storage) and Vercel (hosting) act as our processors under data-processing agreements. Some are in the United States; transfers rely on Standard Contractual Clauses / the EU–US Data Privacy Framework. Our AI providers do not use your responses to train their models.",
  },
  {
    heading: "How long we keep it",
    body: "We retain your responses until the research is complete (at most 12 months after your interview), after which they are deleted.",
  },
  {
    heading: "Your rights",
    body: "You may access, correct, delete, or port your data, withdraw consent, or object to processing. Quote your reference code and contact aligned.benchmark@gmail.com. You can also complain to your data protection authority (in the UK, the Information Commissioner's Office).",
  },
];
