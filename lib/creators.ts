// Allowlist of emails permitted to act as study creators. Only these addresses
// can log into the studio and create studies — anyone else who tries the magic
// link gets signed straight back out. Set CREATOR_EMAILS (comma-separated) in env.
export function isCreator(email: string | null | undefined): boolean {
  if (!email) return false;
  const allow = (process.env.CREATOR_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allow.includes(email.toLowerCase());
}
