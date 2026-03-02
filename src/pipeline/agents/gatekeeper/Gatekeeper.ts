import type { BlueprintPlanV3_2 } from "@/types/Blueprint";
import type { BlueprintSlot } from "@/types/Blueprint";
import type { GeneratedItem } from "../writer/types";

export interface GatekeeperViolation {
  slotId: string;
  type: string;
  message: string;
}

export interface GatekeeperValidationResult {
  ok: boolean;
  violations: GatekeeperViolation[];
}

/**
 * RewriteMode — tells the Rewriter what kind of surgery to perform.
 * Derived from the first (most critical) Gatekeeper violation.
 */
export type RewriteMode =
  | "formatFix"
  | "distractorStrengthen"
  | "clarityFix"
  | "cognitiveAdjust"
  | "difficultyAdjust"
  | "topicGrounding";

export interface GatekeeperSingleResult {
  ok: boolean;
  mode: RewriteMode;
  violations: GatekeeperViolation[];
}

/** Maps a violation type string to the most appropriate RewriteMode. */
function violationToMode(type: string): RewriteMode {
  switch (type) {
    case "mcq_options_invalid":
    case "mcq_answer_mismatch":
    case "mcq_options_unexpected":
    case "question_type_mismatch":
    case "arithmetic_format_invalid":
    case "arithmetic_answer_incorrect":
    case "arithmetic_eval_error":
    case "arithmetic_operator_mismatch":
    case "passage_missing":
    case "passage_contains_raw_newlines":
    case "passage_length_out_of_range":
    case "passage_question_count_mismatch":
    case "passage_subquestion_incomplete":
      return "formatFix";
    case "topic_mismatch":
    case "domain_mismatch":
      return "topicGrounding";
    case "cognitive_demand_mismatch":
      return "cognitiveAdjust";
    case "difficulty_mismatch":
      return "difficultyAdjust";
    case "pacing_violation":
    case "scope_width_violation":
    case "missing_misconception_alignment":
    case "forbidden_content":
    default:
      return "clarityFix";
  }
}

export class Gatekeeper {
  static validate(
    blueprint: BlueprintPlanV3_2,
    items: GeneratedItem[]
  ): GatekeeperValidationResult {
    const violations: GatekeeperViolation[] = [];
    const uar = blueprint.uar ?? {};

    for (const slot of blueprint.slots) {
      const item = items.find(i => i.slotId === slot.id);

      if (!item) {
        violations.push({
          slotId: slot.id,
          type: "missing_item",
          message: "Writer did not generate an item for this slot."
        });
        continue;
      }

      //
      // 1. Question type match
      // A slot may declare `questionTypes` (multi-select) — any entry is acceptable.
      //
      const acceptedTypes: string[] = (slot.questionTypes && slot.questionTypes.length > 0)
        ? slot.questionTypes
        : [slot.questionType];

      if (!acceptedTypes.includes(item.questionType)) {
        violations.push({
          slotId: slot.id,
          type: "question_type_mismatch",
          message: `Expected one of [${acceptedTypes.join(", ")}], got ${item.questionType}.`
        });
      }

      //
      // 1b. Passage-based structural validation — validate passage + sub-questions; skip LLM checks.
      //
      if (item.questionType === "passageBased") {
        const passageItem = item as any;
        const passageText: string = passageItem.passage ?? "";
        const subQs: Array<{ prompt?: string; answer?: string }> = passageItem.questions ?? [];

        if (!passageText || typeof passageText !== "string") {
          violations.push({
            slotId: slot.id,
            type: "passage_missing",
            message: "passageBased item must include a non-empty 'passage' string.",
          });
        } else {
          // Raw-newline check (unescaped newlines break JSON and export)
          if (/\n/.test(passageText)) {
            violations.push({
              slotId: slot.id,
              type: "passage_contains_raw_newlines",
              message: "passage field contains raw newline characters — must be a single-line string.",
            });
          }
          // Word-count check against passageLength constraint
          const pbCfg = (slot.constraints as any)?.passageBased as
            { passageLength?: string; questionCount?: number } | undefined;
          // Also support legacy flat constraints.passageLength
          const passageLength = pbCfg?.passageLength ?? (slot.constraints as any)?.passageLength;
          const wordCount = passageText.split(/\s+/).filter(Boolean).length;
          if (passageLength === "short"  && (wordCount < 80  || wordCount > 180)) {
            violations.push({ slotId: slot.id, type: "passage_length_out_of_range", message: `Short passage must be 80–180 words; got ${wordCount}.` });
          } else if (passageLength === "medium" && (wordCount < 130 || wordCount > 280)) {
            violations.push({ slotId: slot.id, type: "passage_length_out_of_range", message: `Medium passage must be 130–280 words; got ${wordCount}.` });
          } else if (passageLength === "long"   && (wordCount < 200 || wordCount > 380)) {
            violations.push({ slotId: slot.id, type: "passage_length_out_of_range", message: `Long passage must be 200–380 words; got ${wordCount}.` });
          }
        }

        // Sub-question count
        const expectedQCount = (slot.constraints as any)?.passageBased?.questionCount ??
          (slot.constraints as any)?.questionCount ?? 3;
        if (subQs.length !== expectedQCount) {
          violations.push({
            slotId: slot.id,
            type: "passage_question_count_mismatch",
            message: `Expected ${expectedQCount} sub-questions; got ${subQs.length}.`,
          });
        }

        // Per-question validation
        for (let qi = 0; qi < subQs.length; qi++) {
          if (!subQs[qi].prompt?.trim() || !subQs[qi].answer?.trim()) {
            violations.push({
              slotId: slot.id,
              type: "passage_subquestion_incomplete",
              message: `Sub-question ${qi + 1} is missing a prompt or answer.`,
            });
          }
        }

        // Passage-based items have their own format — skip the generic item checks.
        continue;
      }

      //
      // 1c. Arithmetic fluency — structural validation; skip all LLM-oriented checks.
      //
      if (item.questionType === "arithmeticFluency") {        const arithPattern = /^\d+\s*[+\-×÷*/]\s*\d+$/;
        if (!arithPattern.test(item.prompt.trim())) {
          violations.push({
            slotId: slot.id,
            type: "arithmetic_format_invalid",
            message: `Arithmetic fluency prompt must be a bare expression (e.g. "7 + 4"). Got: "${item.prompt}".`,
          });
        } else {
          // Verify the answer is numerically correct
          const expr = item.prompt.replace(/×/g, "*").replace(/÷/g, "/");
          try {
            // eslint-disable-next-line no-new-func
            const computed: number = Function(`"use strict"; return (${expr})`)();
            const given = parseFloat(item.answer ?? "");
            if (isNaN(given) || Math.abs(computed - given) > 0.001) {
              violations.push({
                slotId: slot.id,
                type: "arithmetic_answer_incorrect",
                message: `Answer "${item.answer}" is incorrect. Expected ${computed} for "${item.prompt}".`,
              });
            }
          } catch {
            violations.push({
              slotId: slot.id,
              type: "arithmetic_eval_error",
              message: `Could not evaluate arithmetic expression "${item.prompt}".`,
            });
          }
          // Operator check when slot specifies a required operation
          if (slot.operation && slot.operation !== "any") {
            const opMap: Record<string, RegExp> = {
              add:      /\+/,
              subtract: /-/,
              multiply: /[×*]/,
              divide:   /[÷/]/,
            };
            if (!opMap[slot.operation]?.test(item.prompt)) {
              violations.push({
                slotId: slot.id,
                type: "arithmetic_operator_mismatch",
                message: `Slot requires "${slot.operation}" but expression "${item.prompt}" uses a different operator.`,
              });
            }
          }

          // ── Operand range check ──────────────────────────────────────────
          const slotRange = (slot as any).range ?? (uar as any).range;
          if (slotRange) {
            const nums = item.prompt.match(/\d+/g)?.map(Number) ?? [];
            const outOfRange = nums.filter(n => n < slotRange.min || n > slotRange.max);
            if (outOfRange.length > 0) {
              violations.push({
                slotId: slot.id,
                type: "operand_out_of_range",
                message: `Operand(s) ${outOfRange.join(", ")} are outside the required range [${slotRange.min}, ${slotRange.max}].`,
              });
            }
          }
        }
        // Arithmetic items have no LLM-authored content to validate — skip remaining checks.
        continue;
      }

      //
      // 2. Topic/domain grounding
      //
      // Intentional design: we do NOT check whether topic/course keywords appear
      // verbatim in the prompt text.  Forcing keyword presence causes the Writer
      // to prepend robotic preambles ("In Algebra 2, ...").  Instead, the Writer
      // is guided by structured GROUNDING context and the Bloom verb check (§4)
      // provides a content-quality signal independent of literal phrasing.
      // Topic alignment is a Writer responsibility enforced via the system prompt;
      // Gatekeeper validates structure, cognition, and format — not stem wording.
      const promptLower = item.prompt.toLowerCase();

      //
      // 3. MCQ structural rules
      //
      if (slot.questionType === "multipleChoice") {
        if (!Array.isArray(item.options) || item.options.length !== 4) {
          violations.push({
            slotId: slot.id,
            type: "mcq_options_invalid",
            message: "Multiple-choice questions must have exactly 4 options."
          });
        }

        // Accept both exact match and letter-prefix match.
        // LLMs commonly output "B" when the full option is "B. Find a common..."
        const answerStr = (item.answer ?? "").trim();
        const opts = item.options ?? [];
        const answerMatches =
          opts.includes(answerStr) ||
          opts.some(
            (opt) =>
              // "B" matches "B. ...", "B) ...", "B: ...", "B ..."
              opt.trim().match(new RegExp(`^${answerStr}[.):\s]`, "i")) !== null
          );

        if (!answerMatches) {
          violations.push({
            slotId: slot.id,
            type: "mcq_answer_mismatch",
            message: `Answer "${answerStr}" must match one of the provided options.`
          });
        }
      } else {
        // Only flag if options is genuinely populated (not null/undefined from JSON cleanup)
        if (Array.isArray(item.options) && item.options.length > 0) {
          violations.push({
            slotId: slot.id,
            type: "mcq_options_unexpected",
            message: "Non-MC questions must not include an options array."
          });
        }
      }

      //
      // 4. Cognitive demand (Bloom-aligned)
      //
      // Philosophy: trust the LLM's level judgment. Only flag when the prompt
      // contains NO recognizable Bloom verb from the assigned level or any level
      // below it.
      //
      // Special case — "remember" false-positive exemption:
      // MC questions with a single factual answer and no explanation verbs
      // (why/explain/how/describe) are cognitively valid "remember" items even
      // if they use phrasing like "what was the primary reason". Don't penalise.
      //
      const explanationVerbs = ["why", "explain", "how", "describe", "interpret", "justify", "analyse", "analyze"];
      const hasExplanationVerb = explanationVerbs.some(v => promptLower.includes(v));
      const isRememberMC =
        slot.cognitiveDemand === "remember" &&
        item.questionType === "multipleChoice" &&
        !hasExplanationVerb;

      if (slot.cognitiveDemand && !isRememberMC) {
        const bloomOrder = ["remember", "understand", "apply", "analyze", "evaluate", "create"];
        const bloom: Record<string, string[]> = {
          remember: [
            "define", "identify", "recall", "list", "state", "name", "label",
            "match", "select", "what is", "what are", "which", "when", "who",
            "where", "how many", "first step", "step", "term", "represent",
            "stands for", "notation"
          ],
          understand: [
            "explain", "summarize", "describe", "interpret", "why",
            "how does", "what does", "what concept", "what mathematical",
            "what process", "paraphrase", "classify", "give an example",
            "difference between", "is necessary", "reason", "means", "tell"
          ],
          apply: [
            "solve", "use", "calculate", "apply", "add", "subtract",
            "multiply", "divide", "find", "compute", "evaluate",
            "determine", "simplify", "convert", "what is the sum",
            "what is the product", "what is the result", "complete",
            "perform", "carry out", "demonstrate", "given", "if"
          ],
          analyze: [
            "compare", "contrast", "categorize", "analyze", "analyse",
            "distinguish", "differentiate", "examine", "break down",
            "what relationship", "how are", "why does", "classify",
            "what pattern", "what effect", "infer", "both", "neither"
          ],
          evaluate: [
            "justify", "critique", "evaluate", "assess", "judge",
            "defend", "argue", "which is best", "what would you recommend",
            "rate", "rank", "support", "do you agree", "is it better"
          ],
          create: [
            "design", "create", "construct", "generate", "compose",
            "produce", "write", "formulate", "develop", "plan"
          ]
        };

        // Collect verbs for the assigned level and all levels below it
        const assignedIdx = bloomOrder.indexOf((slot.cognitiveDemand as string).toLowerCase());
        const levelsToCheck = assignedIdx >= 0
          ? bloomOrder.slice(0, assignedIdx + 1)
          : bloomOrder;

        const allVerbs = levelsToCheck.flatMap((l) => bloom[l] ?? []);
        const matchesVerb = allVerbs.some((v) => promptLower.includes(v));

        if (!matchesVerb) {
          violations.push({
            slotId: slot.id,
            type: "cognitive_demand_mismatch",
            message: `Prompt does not reflect Bloom level "${slot.cognitiveDemand}".`
          });
        }
      }

      //
      // 5. Difficulty alignment (light heuristic)
      //
      if (slot.difficulty === "easy" && promptLower.includes("prove")) {
        violations.push({
          slotId: slot.id,
          type: "difficulty_mismatch",
          message: "Easy questions must not require proof-level reasoning."
        });
      }

      //
      // 6. Avoid list
      //
      if (uar.avoidList) {
        for (const forbidden of uar.avoidList) {
          if (promptLower.includes(forbidden.toLowerCase())) {
            violations.push({
              slotId: slot.id,
              type: "forbidden_content",
              message: `Prompt contains forbidden content: "${forbidden}".`
            });
          }
        }
      }

      //
      // 7. Misconceptions
      //
      // Check both prompt and answer fields — a question can address a
      // misconception through its answer/distractor layout without echoing the
      // misconception keyword verbatim in the stem.
      //
      if (uar.misconceptions) {
        const answerLower = (item.answer ?? "").toLowerCase();
        const optionsLower = (item.options ?? []).join(" ").toLowerCase();
        const fullText = `${promptLower} ${answerLower} ${optionsLower}`;
        for (const misconception of uar.misconceptions) {
          if (!fullText.includes(misconception.toLowerCase())) {
            violations.push({
              slotId: slot.id,
              type: "missing_misconception_alignment",
              message: `Item does not address required misconception: "${misconception}".`
            });
          }
        }
      }

      //
      // 8. Pacing sanity
      //
      if (slot.pacing === "normal" && item.prompt.length > 300) {
        violations.push({
          slotId: slot.id,
          type: "pacing_violation",
          message: "Prompt too long for pacing=normal."
        });
      }

      //
      // 9. Scope width (soft check)
      //
      if (blueprint.scopeWidth === "narrow") {
        const commaCount = (item.prompt.match(/,/g) || []).length;
        if (commaCount > 3) {
          violations.push({
            slotId: slot.id,
            type: "scope_width_violation",
            message: "Narrow scope questions must not integrate multiple strands."
          });
        }
      }

      //
      // 10. Math clarity (non-arithmetic items)
      //
      // Enforce: radicals use √(...), logs use log(...), no implicit multiplication.
      //
      if (item.questionType !== "arithmeticFluency") {
        // No implicit multiplication: e.g. "3x" where the coefficient and variable
        // are fused without an operator. Flag only in math-heavy domains.
        const domain = (uar as any).domain ?? (uar as any).course ?? "";
        const isMath = /math|algebra|calculus|geometry|statistics|arithmetic/i.test(domain);
        if (isMath) {
          // Check radical format: bare √ without parentheses
          if (/√[^(]/.test(item.prompt)) {
            violations.push({
              slotId: slot.id,
              type: "math_clarity_violation",
              message: `Radical expression must use parentheses: √(expression). Found bare √ in prompt.`,
            });
          }
          // Check log format: log without parentheses
          if (/\blog[^(]/.test(item.prompt)) {
            violations.push({
              slotId: slot.id,
              type: "math_clarity_violation",
              message: `Logarithm expression must use parentheses: log(expression). Found bare log in prompt.`,
            });
          }
        }
      }

      //
      // 11. Standards alignment (soft check)
      //
      // If the slot has standards constraints, note any mismatch as a low-severity
      // advisory. We do not block — alignment is verified by the Architect/Writer.
      //
      const slotStandards = (slot as any).constraints?.standards;
      const uarStandards = (uar as any).standards;
      if ((slotStandards || uarStandards) && !(uar as any).standardsCheckDisabled) {
        // Light heuristic: if the prompt has NO academic vocabulary at all,
        // it's a signal that standards alignment may have been ignored.
        const academicVocab = /[A-Z]{2,}\.[A-Z0-9]{2,}|standard|objective|ccss|teks|ngsss/i;
        const promptLength = item.prompt.length;
        if (promptLength < 20 && !academicVocab.test(item.prompt)) {
          violations.push({
            slotId: slot.id,
            type: "standards_mismatch",
            message: `Item may not align to required standard (${slotStandards ?? uarStandards}). Prompt appears too brief to assess standards coverage.`,
          });
        }
      }
    }

    return {
      ok: violations.length === 0,
      violations
    };
  }

  /**
   * validateSingle — per-problem validation used by the adaptive writer loop.
   *
   * Returns `ok`, the dominant `mode` (RewriteMode) derived from the first
   * violation, and the full violations list.
   */
  static validateSingle(
    slot: BlueprintSlot,
    item: GeneratedItem,
    uar: Record<string, any> = {},
    scopeWidth?: BlueprintPlanV3_2["scopeWidth"]
  ): GatekeeperSingleResult {
    // Delegate to validate() by synthesising a minimal blueprint-like object
    const minimalBlueprint = {
      slots: [slot],
      scopeWidth: scopeWidth ?? "focused",
      uar,
    } as unknown as BlueprintPlanV3_2;

    const result = Gatekeeper.validate(minimalBlueprint, [item]);

    const mode: RewriteMode =
      result.violations.length > 0
        ? violationToMode(result.violations[0].type)
        : "clarityFix";

    return {
      ok: result.ok,
      mode,
      violations: result.violations,
    };
  }
}
