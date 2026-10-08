const SKIP = new Set(["of", "the", "and", "at", "in", "for", "&", "-"]);

/**
 * Initials for the logo placeholder.
 * "Massachusetts Institute of Technology" -> "MIT", "University of California, Berkeley" -> "UCB".
 * A short_name of up to 4 characters wins ("UCLA").
 */
export function monogram(name: string, shortName?: string | null): string {
  const short = shortName?.trim();
  if (short && short.length <= 4) return short.toUpperCase();

  const words = name
    .replace(/[,.()]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !SKIP.has(w.toLowerCase()));
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return words
    .slice(0, 3)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}
