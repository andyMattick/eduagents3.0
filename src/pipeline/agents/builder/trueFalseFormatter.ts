import { getPrompt } from "@/pipeline/utils/itemNormalizer";

/**
 * trueFalseFormatter.ts
 *
 * Ensures every True/False item carries a visible instruction line so
 * students know to circle T or F even when the writer prompt omits it.
 *
 * Rule: if questionType === "trueFalse" AND the existing prompt text does not
 * already contain a recognisable True/False instruction, prepend:
 *
 *   "Circle T or F.\n\n"
 *
 * This is a pure transform — it never truncates or alters the question body.
 */

/** Matches any pre-existing instruction that already tells students to circle,
 *  underline, write, or choose True / False (or T / F). */
const INSTRUCTION_PATTERN =
  /true\/false|true or false|t\/f|circle\s+(t|f|true|false)|indicate\s+(t|f|true|false)/i;

export interface TrueFalseFormattable {
  questionType: string;
  prompt: string;
}

/**
 * Inject the "Circle T or F." instruction line into trueFalse items that
 * lack one.  Returns a new object — never mutates the input.
 */
export function formatTrueFalseItem<T extends TrueFalseFormattable>(item: T): T {
  if (item.questionType !== "trueFalse") return item;

  const prompt = getPrompt(item);
  const needsInstruction = !INSTRUCTION_PATTERN.test(prompt);
  if (!needsInstruction) return item;

  return {
    ...item,
    prompt: `Circle True or False.\n\n${prompt}`,
  };
}
