const SKIP = /^(of|the|at|in|and|&)$/i;

/**
 * Initials for the logo placeholder (the design's rules).
 * "Boston College" -> "BC", "Massachusetts Institute of Technology" -> "MIT",
 * "USC" -> "USC", "WashU" -> "WU", "Bentley" -> "B".
 * A short_name of up to 4 characters wins ("UCLA").
 */
export function monogram(name: string, shortName?: string | null): string {
  const short = shortName?.trim();
  if (short && short.length <= 4) return short.toUpperCase();

  const n = (name || "").trim();
  if (!n) return "";
  const words = n.split(/[\s\-,]+/).filter((w) => w && !SKIP.test(w));
  if (!words.length) return n[0].toUpperCase();
  if (/^[A-Z]{2,4}$/.test(words[0])) return words[0];
  if (words.length === 1) {
    const caps = words[0].match(/[A-Z]/g) || [];
    return caps.length >= 2 && caps.length <= 3 ? caps.join("") : words[0][0].toUpperCase();
  }
  return words
    .slice(0, 3)
    .map((w) => w[0].toUpperCase())
    .join("");
}
