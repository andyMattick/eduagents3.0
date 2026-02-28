export function normalizeMath(text: string | undefined): string | undefined {
  if (!text) return text;

  let result = text;

  // -------------------------
  // 1️⃣ Normalize Unicode superscripts
  // -------------------------
  const superMap: Record<string, string> = {
    "²": "2",
    "³": "3",
    "⁴": "4",
    "⁵": "5",
    "⁶": "6",
    "⁷": "7",
    "⁸": "8",
    "⁹": "9",
  };

  result = result.replace(
    /([a-zA-Z0-9])([²³⁴⁵⁶⁷⁸⁹])/g,
    (_, base, sup) => `${base}^{${superMap[sup]}}`
  );

  // -------------------------
  // 2️⃣ Caret exponents → brace form
  // x^2 → x^{2}
  // -------------------------
  result = result.replace(
    /([a-zA-Z0-9])\^([0-9]+)/g,
    (_, base, exp) => `${base}^{${exp}}`
  );

  // -------------------------
  // 3️⃣ Simple numeric fractions only
  // 3/4 → \frac{3}{4}
  // Avoid dates and multi-slash expressions
  // -------------------------
  result = result.replace(
    /\b(\d+)\s*\/\s*(\d+)\b/g,
    (_, num, den) => `\\frac{${num}}{${den}}`
  );

  // -------------------------
  // 4️⃣ Variable fractions
  // (x+1)/(x-2) → \frac{x+1}{x-2}
  // Only convert if wrapped in parentheses
  // -------------------------
  result = result.replace(
    /\(\s*([^()]+)\s*\)\s*\/\s*\(\s*([^()]+)\s*\)/g,
    (_, num, den) => `\\frac{${num}}{${den}}`
  );

  // -------------------------
  // 5️⃣ Square roots
  // √x → \sqrt{x}
  // √(x+3) → \sqrt{x+3}
  // -------------------------
  result = result.replace(
    /√\s*\(?([^()\s]+)\)?/g,
    (_, inner) => `\\sqrt{${inner}}`
  );

  // sqrt(x) → \sqrt{x}
  result = result.replace(
    /\bsqrt\s*\(\s*([^()]+)\s*\)/gi,
    (_, inner) => `\\sqrt{${inner}}`
  );

  // -------------------------
  // 6️⃣ Multiplication cleanup
  // 3 x → 3x
  // 3*x → 3x
  // 3·x → 3x
  // -------------------------
  result = result.replace(/(\d)\s*[·*]\s*([a-zA-Z])/g, "$1$2");
  result = result.replace(/(\d)\s+([a-zA-Z])/g, "$1$2");

  // -------------------------
  // 7️⃣ Remove double braces
  // x^{{2}} → x^{2}
  // -------------------------
  result = result.replace(/\^\{\{([^}]+)\}\}/g, "^{$1}");

  return result;
}