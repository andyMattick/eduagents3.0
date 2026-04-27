/**
 * arithmeticFluency.ts — Deterministic arithmetic fluency template plugin.
 *
 * Generates basic arithmetic problems: addition, subtraction, multiplication, division.
 * No LLM calls. Pure math.
 */

import type { ProblemPlugin, ProblemSlot, GenerationContext, GeneratedProblem } from "../../../interfaces/problemPlugin";
import { randInt, pick } from "./mathUtils";

type Op = "add" | "subtract" | "multiply" | "divide";

const OP_SYMBOLS: Record<Op, string> = {
  add: "+",
  subtract: "−",
  multiply: "×",
  divide: "÷",
};

function generateArithmetic(
  operation: Op,
  difficulty: string
): { a: number; b: number; answer: number; expression: string } {
  let a: number, b: number, answer: number;

  const ranges: Record<string, [number, number]> = {
    easy: [1, 12],
    medium: [2, 25],
    hard: [5, 100],
  };
  const [lo, hi] = ranges[difficulty] ?? ranges.medium;

  switch (operation) {
    case "add":
      a = randInt(lo, hi);
      b = randInt(lo, hi);
      answer = a + b;
      break;
    case "subtract":
      a = randInt(lo, hi);
      b = randInt(lo, Math.min(a, hi)); // avoid negatives for easy/medium
      answer = a - b;
      break;
    case "multiply":
      a = randInt(lo, Math.min(hi, 12));
      b = randInt(lo, Math.min(hi, 12));
      answer = a * b;
      break;
    case "divide": {
      b = randInt(Math.max(lo, 2), Math.min(hi, 12));
      answer = randInt(lo, Math.min(hi, 12));
      a = b * answer; // ensure clean division
      break;
    }
  }

  return { a, b, answer, expression: `${a} ${OP_SYMBOLS[operation]} ${b}` };
}

export const arithmetic_fluency_template: ProblemPlugin = {
  id: "arithmetic_fluency_template",
  generationType: "template",
  supportedTopics: [
    "arithmetic", "addition", "subtraction", "multiplication", "division",
    "math fluency", "basic math", "number operations",
  ],

async generate(slot: ProblemSlot, _context: GenerationContext): Promise<any> {
  const op: Op = (slot.operation as Op) ?? pick(["add", "subtract", "multiply", "divide"] as Op[]);
  const difficulty = slot.difficulty ?? "medium";
  const { a, b, answer, expression } = generateArithmetic(op, difficulty);

  return {
    id: slot.slot_id, // required unique ID

    problemText: `${expression} = ?`,
    correctAnswer: `${answer}`,

    problemType: "procedural",
    bloomLevel: 1, // Remember
    questionFormat: "short-answer",

    complexity: difficulty === "easy" ? "low" : difficulty === "medium" ? "medium" : "high",
    novelty: "low",

    estimatedTime: 1,
    problemLength: expression.length,
    hasTip: false,

    rubric: {
      criteria: ["Correct computation"],
      expectations: "Student computes the correct value."
    }
  };
}

};
