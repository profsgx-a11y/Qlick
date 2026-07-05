// Greek → Latin transliteration map (covers basic chars + tonos)
const greekMap: Record<string, string> = {
  α: "a", ά: "a", Α: "a", Ά: "a",
  β: "v", Β: "v",
  γ: "g", Γ: "g",
  δ: "d", Δ: "d",
  ε: "e", έ: "e", Ε: "e", Έ: "e",
  ζ: "z", Ζ: "z",
  η: "i", ή: "i", Η: "i", Ή: "i",
  θ: "th", Θ: "th",
  ι: "i", ί: "i", ϊ: "i", ΐ: "i", Ι: "i", Ί: "i", Ϊ: "i",
  κ: "k", Κ: "k",
  λ: "l", Λ: "l",
  μ: "m", Μ: "m",
  ν: "n", Ν: "n",
  ξ: "x", Ξ: "x",
  ο: "o", ό: "o", Ο: "o", Ό: "o",
  π: "p", Π: "p",
  ρ: "r", Ρ: "r",
  σ: "s", ς: "s", Σ: "s",
  τ: "t", Τ: "t",
  υ: "y", ύ: "y", ϋ: "y", ΰ: "y", Υ: "y", Ύ: "y", Ϋ: "y",
  φ: "f", Φ: "f",
  χ: "ch", Χ: "ch",
  ψ: "ps", Ψ: "ps",
  ω: "o", ώ: "o", Ω: "o", Ώ: "o",
};

export function slugify(input: string): string {
  const transliterated = input
    .split("")
    .map((c) => greekMap[c] ?? c)
    .join("");

  return transliterated
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip remaining diacritics
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function suffixedSlug(base: string, suffix: string): string {
  const trimmed = base.length > 50 ? base.slice(0, 50) : base;
  return `${trimmed}-${suffix}`.replace(/^-+|-+$/g, "");
}
