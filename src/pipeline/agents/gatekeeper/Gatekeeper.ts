import type { BlueprintPlanV3_2 } from "@/types/Blueprint";
import type { BlueprintSlot } from "@/types/Blueprint";
import type { GeneratedItem } from "../writer/types";
import { internalLogger } from "../shared/internalLogging";
import { getPrompt, getPassage, getAnswer, getOptions } from "@/pipeline/utils/itemNormalizer";

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

export interface GatekeeperRewriteInstruction {
  slotId: string;
  mode: RewriteMode;
  issues: string[];
}

/** Maps a violation type string to the most appropriate RewriteMode. */
function violationToMode(type: string): RewriteMode {
  switch (type) {
    case "invalid_template_id":
    case "invalid_diagram_type":
    case "invalid_image_id":
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
    case "style_instruction_length":
    case "style_tone_mismatch":
    case "style_language_level":
    default:
      return "clarityFix";
  }
}

export class Gatekeeper {
  static validate(
    blueprint: BlueprintPlanV3_2,
    items: GeneratedItem[],
    /** Optional teacher profile style constraints. Pass from WriterContract.styleConstraints. */
    styleConstraints?: {
      tone?: string;
      languageLevel?: string;
      instructionLength?: string;
      contextPreference?: string;
    } | null
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

      // Template/diagram/image slot compliance checks against blueprint metadata.
      const metadata = (item as any).metadata ?? {};
      if ((slot as any).templateId) {
        const expectedTemplateId = String((slot as any).templateId);
        const actualTemplateId = metadata.templateId ?? metadata.template_id ?? null;
        if (actualTemplateId == null || String(actualTemplateId) !== expectedTemplateId) {
          violations.push({
            slotId: slot.id,
            type: "invalid_template_id",
            message: `Slot requires templateId "${expectedTemplateId}" but Writer returned "${actualTemplateId ?? "null"}".`,
          });
        }
      }

      if ((slot as any).diagramType) {
        const expectedDiagramType = String((slot as any).diagramType);
        const actualDiagramType = metadata.diagramType ?? metadata.diagram_type ?? null;
        if (actualDiagramType == null || String(actualDiagramType) !== expectedDiagramType) {
          violations.push({
            slotId: slot.id,
            type: "invalid_diagram_type",
            message: `Slot requires diagramType "${expectedDiagramType}" but Writer returned "${actualDiagramType ?? "null"}".`,
          });
        }
      }

      if ((slot as any).imageReferenceId) {
        const expectedImageRef = String((slot as any).imageReferenceId);
        const actualImageRef = metadata.imageReferenceId ?? metadata.image_reference_id ?? null;
        if (actualImageRef == null || String(actualImageRef) !== expectedImageRef) {
          violations.push({
            slotId: slot.id,
            type: "invalid_image_id",
            message: `Slot requires imageReferenceId "${expectedImageRef}" but Writer returned "${actualImageRef ?? "null"}".`,
          });
        }
      }

      //
      // 1b. Passage-based structural validation — validate passage + sub-questions; skip LLM checks.
      //
      if (item.questionType === "passageBased") {
        const passageItem = item as any;
        const passageText: string = getPassage(passageItem) ?? "";
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
      if (item.questionType === "arithmeticFluency") {
        const arithPattern = /^\d+\s*[+\-×÷*/]\s*\d+$/;
        const promptText = getPrompt(item);
        if (!arithPattern.test(promptText.trim())) {
          violations.push({
            slotId: slot.id,
            type: "arithmetic_format_invalid",
            message: `Arithmetic fluency prompt must be a bare expression (e.g. "7 + 4"). Got: "${promptText}".`,
          });
        } else {
          // Verify the answer is numerically correct
          const expr = promptText.replace(/×/g, "*").replace(/÷/g, "/");
          try {
            // eslint-disable-next-line no-new-func
            const computed: number = Function(`"use strict"; return (${expr})`)();
            const given = parseFloat((getAnswer(item) as string) ?? "");
            if (isNaN(given) || Math.abs(computed - given) > 0.001) {
              violations.push({
                slotId: slot.id,
                type: "arithmetic_answer_incorrect",
                message: `Answer "${getAnswer(item)}" is incorrect. Expected ${computed} for "${promptText}".`,
              });
            }
          } catch {
            violations.push({
              slotId: slot.id,
              type: "arithmetic_eval_error",
              message: `Could not evaluate arithmetic expression "${promptText}".`,
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
            if (!opMap[slot.operation]?.test(promptText)) {
              violations.push({
                slotId: slot.id,
                type: "arithmetic_operator_mismatch",
                message: `Slot requires "${slot.operation}" but expression "${promptText}" uses a different operator.`,
              });
            }
          }

          // ── Operand range check ──────────────────────────────────────────
          const slotRange = (slot as any).range ?? (uar as any).range;
          if (slotRange) {
            const nums = promptText.match(/\d+/g)?.map(Number) ?? [];
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
      console.log("[Gatekeeper] Item received:", item);      
      // Safety check: ensure prompt exists before processing
      const promptText = getPrompt(item);
      if (!promptText || typeof promptText !== "string") {
        violations.push({
          slotId: slot.id,
          type: "missing_item",
          message: "Item is missing a valid prompt string."
        });
        continue;
      }
      const promptLower = promptText.toLowerCase();

      //
      // 3. MCQ structural rules
      //
      if (slot.questionType === "multipleChoice") {
        const options = getOptions(item);
        if (!Array.isArray(options) || options.length !== 4) {
          violations.push({
            slotId: slot.id,
            type: "mcq_options_invalid",
            message: "Multiple-choice questions must have exactly 4 options."
          });
        }

        // Accept both exact match and letter-prefix match.
        // LLMs commonly output "B" when the full option is "B. Find a common..."
        const answerStr = String(getAnswer(item) ?? "").trim();
        const opts = options ?? [];
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
        if (Array.isArray(getOptions(item)) && (getOptions(item) as string[]).length > 0) {
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
        const answerValue = getAnswer(item);
        const answerLower = Array.isArray(answerValue)
          ? answerValue.join(" ").toLowerCase()
          : String(answerValue ?? "").toLowerCase();


        const optionsLower = (getOptions(item) ?? []).join(" ").toLowerCase();

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
        const prompt = getPrompt(item) ?? "";
        if (slot.pacing === "normal" && prompt.length > 300) {
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
        const commaCount = (prompt.match(/,/g) || []).length;
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
          if (/√[^(]/.test(getPrompt(item))) {
            violations.push({
              slotId: slot.id,
              type: "math_clarity_violation",
              message: `Radical expression must use parentheses: √(expression). Found bare √ in prompt.`,
            });
          }
          // Check log format: log without parentheses
          if (/\blog[^(]/.test(getPrompt(item))) {
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
        const promptLength = prompt.length;
        if (promptLength < 20 && !academicVocab.test(prompt)) {
          violations.push({
            slotId: slot.id,
            type: "standards_mismatch",
            message: `Item may not align to required standard (${slotStandards ?? uarStandards}). Prompt appears too brief to assess standards coverage.`,
          });
        }
      }
      //
      // 12. Teacher style enforcement (from TeacherProfile constraint injection)
      //
      // Checks that don't require LLM: instruction length, informal markers.
      // Only applied when styleConstraints are present (from the WriterContract).
      //
      if (styleConstraints && prompt) {
        const wordCount = prompt.trim().split(/\s+/).filter(Boolean).length;

        // Instruction length: "short" = max 30 words per stem
        if (styleConstraints.instructionLength === "short" && wordCount > 40) {
          violations.push({
            slotId: slot.id,
            type: "style_instruction_length",
            message: `Question stem has ${wordCount} words but teacher style prefers "short" (max ~30 words). Simplify and condense.`,
          });
        }

        // Tone: "formal" should have no contractions
        if (styleConstraints.tone === "formal") {
          const contractionPattern = /\b(can't|won't|don't|isn't|aren't|wasn't|weren't|it's|i'm|you're|they're|we're|he's|she's|that's|there's)\b/i;
          if (contractionPattern.test(getPrompt(item))) {
            violations.push({
              slotId: slot.id,
              type: "style_tone_mismatch",
              message: `Question stem contains contractions but teacher style requires "formal" tone. Use full forms (e.g. "do not" not "don't").`,
            });
          }
        }

        // Language level: "academic" should not use overly casual phrases
        if (styleConstraints.languageLevel === "academic") {
          const casualPhrases = /\b(kids|super easy|super hard|easy peasy|no big deal|totally|like (a|the))\b/i;
          if (casualPhrases.test(getPrompt(item))) {
            violations.push({
              slotId: slot.id,
              type: "style_language_level",
              message: `Question contains casual language but teacher profile requires "academic" language level.`,
            });
          }
        }
      }
    }

    // ── Aggregate Policy Enforcement ─────────────────────────────────────────
    // Check distribution, depth, pacing, and ordering constraints across all items.

    // Build maps for aggregate checks
    const allSlots = blueprint.slots || [];
    const allItems = new Map(items.map(i => [i.slotId, i]));

    // Type guard: ensure all items have metadata
    for (const item of items) {
      if (!item.metadata) {
        console.warn(`[Gatekeeper] Item ${item.slotId} missing metadata: using defaults`);
        item.metadata = {
          generationMethod: "llm",
          templateId: null,
          diagramType: null,
          imageReferenceId: null,
          difficulty: "medium",
          cognitiveDemand: null,
          topicAngle: null,
          pacingSeconds: null,
          slotId: item.slotId,
          questionType: item.questionType,
          sectionId: null,
          passageId: null,
        } as any;
      }
    }

    // 1. Depth floor/ceiling enforcement
    if (blueprint.depthFloor || blueprint.depthCeiling) {
      const bloomOrder = ["remember", "understand", "apply", "analyze", "evaluate", "create"];
      const depthFloorIdx = blueprint.depthFloor ? bloomOrder.indexOf(blueprint.depthFloor as any) : -1;
      const depthCeilIdx = blueprint.depthCeiling ? bloomOrder.indexOf(blueprint.depthCeiling as any) : -1;

      for (const slot of allSlots) {
        const demand = (slot.cognitiveDemand ?? "understand").toLowerCase();
        const demandIdx = bloomOrder.indexOf(demand as any);

        if (depthFloorIdx >= 0 && demandIdx < depthFloorIdx) {
          violations.push({
            slotId: slot.id,
            type: "violates_depth_floor",
            message: `Slot "${slot.id}" has cognitiveDemand="${demand}" but blueprint requires floor="${blueprint.depthFloor}".`,
          });
        }

        if (depthCeilIdx >= 0 && demandIdx > depthCeilIdx) {
          violations.push({
            slotId: slot.id,
            type: "violates_depth_ceiling",
            message: `Slot "${slot.id}" has cognitiveDemand="${demand}" but blueprint limits ceiling="${blueprint.depthCeiling}".`,
          });
        }
      }
    }

    // 2. Distribution enforcement (question type, difficulty, cognitive demand)
    if ((blueprint as any).distribution) {
      const dist = (blueprint as any).distribution;

      // Question type distribution
      if (dist.questionTypes) {
        const typeCount: Record<string, number> = {};
        for (const item of Array.from(allItems.values())) {
          typeCount[item.questionType] = (typeCount[item.questionType] ?? 0) + 1;
        }
        for (const [type, expected] of Object.entries(dist.questionTypes)) {
          const actual = typeCount[type] ?? 0;
          if (actual < (expected as number) * 0.8) {
            violations.push({
              slotId: `blueprint`,
              type: "violates_distribution",
              message: `Expected at least ${expected} questions of type "${type}", got ${actual}.`,
            });
          }
        }
      }

      // Difficulty distribution
      if (dist.difficulty) {
        const diffCount: Record<string, number> = {};
        for (const slot of allSlots) {
          const difficulty = slot.difficulty ?? "medium";
          diffCount[difficulty] = (diffCount[difficulty] ?? 0) + 1;
        }
        for (const [level, expected] of Object.entries(dist.difficulty)) {
          const actual = diffCount[level] ?? 0;
          if (actual < (expected as number) * 0.8) {
            violations.push({
              slotId: `blueprint`,
              type: "violates_distribution",
              message: `Expected at least ${expected} questions of difficulty "${level}", got ${actual}.`,
            });
          }
        }
      }

      // Bloom distribution
      if (dist.bloom) {
        const bloomCount: Record<string, number> = {};
        for (const slot of allSlots) {
          const demand = (slot.cognitiveDemand ?? "understand").toLowerCase();
          bloomCount[demand] = (bloomCount[demand] ?? 0) + 1;
        }
        for (const [level, expected] of Object.entries(dist.bloom)) {
          const actual = bloomCount[level] ?? 0;
          if (actual < (expected as number) * 0.8) {
            violations.push({
              slotId: `blueprint`,
              type: "violates_distribution",
              message: `Expected at least ${expected} questions at Bloom level "${level}", got ${actual}.`,
            });
          }
        }
      }
    }

    // 3. Pacing enforcement (total time + per-item constraints)
    if (blueprint.totalEstimatedTimeSeconds) {
      const totalPacing = allSlots.reduce((sum, s) => sum + (s.pacingSeconds ?? 60), 0);
      if (totalPacing > blueprint.totalEstimatedTimeSeconds * 1.2) {
        violations.push({
          slotId: `blueprint`,
          type: "violates_pacing",
          message: `Total pacing ${totalPacing}s exceeds blueprint limit ${blueprint.totalEstimatedTimeSeconds}s by >20%.`,
        });
      }
    }

    // 4. Ordering constraints (if present in blueprint)
    if ((blueprint as any).orderingStrategy === "sequentialDifficulty") {
      let prevDiffIdx = -1;
      const diffOrder = ["easy", "medium", "hard"];
      for (const slot of allSlots) {
        const currentDifficulty = slot.difficulty ?? "medium";
        const currentDiffIdx = diffOrder.indexOf(currentDifficulty);
        if (prevDiffIdx > currentDiffIdx) {
          violations.push({
            slotId: slot.id,
            type: "violates_ordering",
            message: `Slot "${slot.id}" violates sequential difficulty ordering: found ${currentDifficulty} after higher difficulty.`,
          });
        }
        prevDiffIdx = currentDiffIdx;
      }
    }

    // ── Internal logging: violations summary ──────────────────────────────
    const violationsByType = violations.reduce((acc, v) => {
      acc[v.type] = (acc[v.type] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    internalLogger.info("Gatekeeper", "Validation complete", {
      totalItems: items.length,
      totalViolations: violations.length,
      violationsByType,
      pass: violations.length === 0,
    });

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

  /**
   * Convert a validation result into structured rewrite instructions grouped by slot.
   */
  static toRewriteInstructions(result: GatekeeperValidationResult): GatekeeperRewriteInstruction[] {
    const bySlot = new Map<string, GatekeeperViolation[]>();
    for (const v of result.violations ?? []) {
      const list = bySlot.get(v.slotId) ?? [];
      list.push(v);
      bySlot.set(v.slotId, list);
    }

    return Array.from(bySlot.entries()).map(([slotId, issues]) => ({
      slotId,
      mode: violationToMode(issues[0]?.type ?? "formatFix"),
      issues: issues.map((v) => `${v.type}: ${v.message}`),
    }));
  }
}
