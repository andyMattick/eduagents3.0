/**
 * fractions.ts — Deterministic fractions template plugin.
 *
 * Generates fraction arithmetic problems with clean answers.
 * No LLM calls. Pure math.
 */

import type { ProblemPlugin, ProblemSlot, GenerationContext, GeneratedProblem } from "../../../interfaces/problemPlugin";
import { randInt, pick, gcd } from "./mathUtils";

type FracOp = "add" | "subtract" | "multiply" | "simplify";

function simplify(n: number, d: number): string {
  const g = gcd(Math.abs(n), Math.abs(d));
  const sn = n / g;
  const sd = d / g;
  if (sd === 1) return `${sn}`;
  return `${sn}/${sd}`;
}

export const FractionsPlugin: ProblemPlugin = {
  id: "fractions_template",
  generationType: "template",
  supportedTopics: ["fractions", "rational numbers", "number operations"],

  async generate(slot: ProblemSlot, _context: GenerationContext): Promise<any> {
    const difficulty = slot.difficulty ?? "medium";
    const op: FracOp = pick(["add", "subtract", "multiply", "simplify"]);

    let prompt: string;
    let answer: string;

    if (op === "simplify") {
      const d = randInt(2, difficulty === "hard" ? 24 : 12);
      const factor = randInt(2, 5);
      const n = randInt(1, d - 1);
      prompt = `Simplify: ${n * factor}/${d * factor}`;
      answer = simplify(n, d);
    } else if (op === "multiply") {
      const n1 = randInt(1, 5);
      const d1 = randInt(2, 8);
      const n2 = randInt(1, 5);
      const d2 = randInt(2, 8);
      prompt = `Multiply: ${n1}/${d1} × ${n2}/${d2}`;
      answer = simplify(n1 * n2, d1 * d2);
    } else {
      // add or subtract — use common denominator
      const d = randInt(2, difficulty === "hard" ? 12 : 6);
      const n1 = randInt(1, d * 2);
      const n2 = randInt(1, d * 2);
      const symbol = op === "add" ? "+" : "−";
      const resultN = op === "add" ? n1 + n2 : n1 - n2;
      prompt = `${n1}/${d} ${symbol} ${n2}/${d} = ?`;
      answer = simplify(resultN, d);
    }

    return {
      slot_id: slot.slot_id,
      prompt,
      answer,
      concepts: ["fractions", "rational numbers"],
      skills: ["fraction arithmetic", "simplification"],
      standards: ["CCSS.Math.Content.5.NF.A.1"],
      metadata: {
        generation_method: "template",
        plugin_id: this.id,
        template_id: "fractions",
        difficulty,
        operation: op,
      },
    };
  },
};
