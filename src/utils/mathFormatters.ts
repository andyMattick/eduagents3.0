/**
 * mathFormatters.ts
 *
 * Applies a display-format pass AFTER normalizeMath.ts has run its canonical
 * conversion. The canonical form uses LaTeX-ish syntax:
 *
 *   exponents  → x^{2}, x^{-1}
 *   fractions  → \frac{num}{den}
 *   radicals   → \sqrt{inner}
 *   products   → 3x   (no dot, no gap)
 *
 * Three output modes:
 *   "unicode"  — pretty symbols: √(x + 7), x², (4x − 5)/(x + 2)  [DEFAULT]
 *   "plain"    — ASCII-safe:     sqrt(x + 7), x^2, (4x - 5)/(x + 2)
 *   "latex"    — keep as-is (canonical IS LaTeX), convert any stray symbols back
 */

export type MathFormat = "unicode" | "plain" | "latex";

// Superscript digit map
const SUP: Record<string, string> = {
  "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴",
  "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹",
};

// Reverse map for LaTeX pass
const SUP_BACK: Record<string, string> = {
  "²": "2", "³": "3", "⁴": "4", "⁵": "5",
  "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9",
};

// ── Unicode Pretty ────────────────────────────────────────────────────────────

export function toUnicodePretty(text: string): string {
  let out = text;

  // \frac{a}{b} → (a)/(b)
  out = out.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1)/($2)");

  // \sqrt{inner} → √(inner)
  out = out.replace(/\\sqrt\{([^}]+)\}/g, "√($1)");

  // bare √(inner) that normalizeMath may have missed (e.g. spaces inside)
  // Already in correct display form — leave as-is

  // x^{-n} → x⁻ⁿ  (negative exponents first — before positive)
  out = out.replace(/\^\{-([0-9]+)\}/g, (_, n) =>
    "⁻" + n.split("").map((c: string) => SUP[c] ?? c).join("")
  );

  // x^{n} → xⁿ  (positive integer exponents)
  out = out.replace(/\^\{([0-9]+)\}/g, (_, n) =>
    n.split("").map((c: string) => SUP[c] ?? c).join("")
  );

  // bare x^n (single digit, post-normalization remnant) → xⁿ
  out = out.replace(/\^([0-9])(?!\{)/g, (_, n) => SUP[n] ?? n);

  // Parenthesis multiplication — run AFTER fraction/radical conversion
  // 2(x+1) → 2·(x+1)
  out = out.replace(/([0-9])\s*\((?!\s*\))/g, "$1·(");
  // (a)(b) → (a)·(b)
  out = out.replace(/\)\s*\(/g, ")·(");

  // Binary operator spacing (careful: don't mangle unary minus or exponent context)
  // + and = when preceded by word/digit/close-paren/superscript
  out = out.replace(/([\w²³⁴⁵⁶⁷⁸⁹⁰¹]|[)])\s*\+\s*/g, "$1 + ");
  out = out.replace(/([\w²³⁴⁵⁶⁷⁸⁹⁰¹]|[)])\s*=\s*/g, "$1 = ");
  // Binary minus: only between alphanumeric/close-paren and alphanumeric/open-paren
  out = out.replace(/([\w²³⁴⁵⁶⁷⁸⁹⁰¹]|[)])\s*-\s*(?=[\w(])/g, "$1 - ");

  return out;
}

// ── Plain Text ────────────────────────────────────────────────────────────────

export function toPlainText(text: string): string {
  let out = text;

  // \frac{a}{b} → (a)/(b)
  out = out.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1)/($2)");

  // \sqrt{inner} → sqrt(inner)
  out = out.replace(/\\sqrt\{([^}]+)\}/g, "sqrt($1)");

  // bare √(...) that normalizeMath missed
  out = out.replace(/√\s*\(([^)]+)\)/g, "sqrt($1)");
  out = out.replace(/√\s*([a-zA-Z0-9]+)/g, "sqrt($1)");

  // x^{-n} → x^(-n)
  out = out.replace(/\^\{(-[^}]+)\}/g, "^($1)");

  // x^{n} — single digit stays bare: x^2; multi-char: x^(expr)
  out = out.replace(/\^\{([0-9])\}/g, "^$1");
  out = out.replace(/\^\{([^}]{2,})\}/g, "^($1)");

  return out;
}

// ── LaTeX ─────────────────────────────────────────────────────────────────────

export function toLatex(text: string): string {
  let out = text;

  // bare √(inner) that normalizeMath missed → \sqrt{inner}
  out = out.replace(/√\s*\(([^)]+)\)/g, "\\sqrt{$1}");
  out = out.replace(/√\s*([a-zA-Z0-9]+)/g, "\\sqrt{$1}");

  // Unicode superscripts back to LaTeX — guard in case they slipped through
  out = out.replace(/([a-zA-Z0-9])([²³⁴⁵⁶⁷⁸⁹])/g,
    (_, base, sup) => `${base}^{${SUP_BACK[sup] ?? sup}}`
  );

  // Remove dot multiplication (LaTeX omits implicit multiplication dot)
  out = out.replace(/·/g, " ");

  return out;
}

// ── Router ────────────────────────────────────────────────────────────────────

export function applyMathFormat(text: string, format: MathFormat | undefined): string {
  switch (format ?? "unicode") {
    case "unicode": return toUnicodePretty(text);
    case "plain":   return toPlainText(text);
    case "latex":   return toLatex(text);
    default:        return toUnicodePretty(text);
  }
}
