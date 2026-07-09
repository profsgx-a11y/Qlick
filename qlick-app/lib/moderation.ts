// Lightweight content-moderation scanner for admin review.
// Flags Greek / greeklish / English profanity, slurs and violent language in
// business-entered text (names, descriptions, services, staff). Results are
// advisory — they only surface a warning for the platform admin, they never
// block anything automatically, so occasional false positives are acceptable.

// Stems matched at the START of a word (normalized: lowercase, accent-stripped,
// final sigma folded). Keep stems specific enough to avoid common legit words
// (e.g. use "γαμω" not "γαμ" which would match "γάμος"/"γαμήλιος").
const PREFIX_STEMS = [
  // Greek profanity
  "αρχιδ",
  "μαλακασ",
  "μαλακεσ",
  "μαλακια",
  "πουτσ",
  "μουνι",
  "μουνο",
  "γαμω",
  "γαμησ",
  "γαμιεσ",
  "γαμιολ",
  "καυλ",
  "κωλο",
  "ξεκωλ",
  "πουταν",
  "πουστ",
  "καριολ",
  "τσιμπουκ",
  "βυζι",
  "σκατα",
  "σκατο",
  "χεσ",
  "τσουλα",
  "παπαρι",
  // Greek violence / threats
  "δολοφον",
  "σκοτων",
  "σκοτωσ",
  "κρεμαλ",
  "μαχαιρωσ",
  "μαχαιρωμ",
  "σφαξ",
  "σφαζ",
  "βιασμ",
  "βιαστησ",
  "ναρκωτικ",
  // Greeklish
  "arxid",
  "arhid",
  "malakas",
  "malakia",
  "mouni",
  "mouno",
  "poutsa",
  "poutso",
  "gamw",
  "gamise",
  "gamiol",
  "kavli",
  "kauli",
  "kavla",
  "kaula",
  "poutan",
  "poust",
  "kariol",
  "tsimpouk",
  "tsibouk",
  "kwlo",
  "skata",
  "skato",
  "kremal",
  "dolofon",
  "skotwn",
  "skotose",
  "viasm",
  "viastis",
  // English
  "fuck",
  "shit",
  "bitch",
  "cunt",
  "asshole",
  "whore",
  "slut",
  "nigger",
  "nigga",
  "wanker",
  "blowjob",
  "handjob",
  "murder",
  "rapist",
];

// Whole-word matches only (too many legit words share these prefixes,
// e.g. "cocktail", "peniche").
const EXACT_WORDS = [
  "cock",
  "dick",
  "penis",
  "rape",
  "πεοσ",
];

const ACCENT_MAP: Record<string, string> = {
  ά: "α",
  έ: "ε",
  ή: "η",
  ί: "ι",
  ό: "ο",
  ύ: "υ",
  ώ: "ω",
  ϊ: "ι",
  ϋ: "υ",
  ΐ: "ι",
  ΰ: "υ",
  ς: "σ",
};

// Length-preserving normalization so match indices map back to the original.
function normalizeChar(ch: string): string {
  const lower = ch.toLowerCase();
  return ACCENT_MAP[lower] ?? lower;
}

export function normalizeForScan(text: string): string {
  let out = "";
  for (const ch of text) out += normalizeChar(ch);
  return out;
}

const WORD_RE = /[a-zα-ω0-9]+/g;

function tokenIsFlagged(token: string): boolean {
  if (EXACT_WORDS.includes(token)) return true;
  return PREFIX_STEMS.some((stem) => token.startsWith(stem));
}

export interface ScanMatch {
  /** The offending word exactly as it appears in the original text. */
  word: string;
  index: number;
  length: number;
}

/** All flagged words in a text, with positions (for highlighting). */
export function findMatches(text: string | null | undefined): ScanMatch[] {
  if (!text) return [];
  const norm = normalizeForScan(text);
  const out: ScanMatch[] = [];
  let m: RegExpExecArray | null;
  WORD_RE.lastIndex = 0;
  while ((m = WORD_RE.exec(norm)) !== null) {
    if (tokenIsFlagged(m[0])) {
      out.push({ word: text.slice(m.index, m.index + m[0].length), index: m.index, length: m[0].length });
    }
  }
  return out;
}

/** Unique flagged words found in a text (original spelling). */
export function scanText(text: string | null | undefined): string[] {
  const seen = new Set<string>();
  const words: string[] = [];
  for (const m of findMatches(text)) {
    const key = normalizeForScan(m.word);
    if (!seen.has(key)) {
      seen.add(key);
      words.push(m.word);
    }
  }
  return words;
}

/** Split a text into parts for rendering, marking the flagged words. */
export function highlightParts(
  text: string | null | undefined,
): { text: string; hit: boolean }[] {
  if (!text) return [];
  const matches = findMatches(text);
  if (matches.length === 0) return [{ text, hit: false }];
  const parts: { text: string; hit: boolean }[] = [];
  let pos = 0;
  for (const m of matches) {
    if (m.index > pos) parts.push({ text: text.slice(pos, m.index), hit: false });
    parts.push({ text: text.slice(m.index, m.index + m.length), hit: true });
    pos = m.index + m.length;
  }
  if (pos < text.length) parts.push({ text: text.slice(pos), hit: false });
  return parts;
}
