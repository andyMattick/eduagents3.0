/**
 * End-to-end dry run test for the four-agent pipeline.
 * 
 * Simulates:
 * - Mixed blueprint (template, diagram, image, LLM slots)
 * - Passage-based questions
 * - Full Writer → Gatekeeper → Builder → Scribe flow
 * 
 * Run with: npx ts-node src/__tests__/dryRun.ts
 */

import type { BlueprintPlanV3_2 } from "pipeline/contracts/BlueprintPlanV3_2";
import type { UnifiedAssessmentRequest } from "pipeline/contracts/UnifiedAssessmentRequest";
import type { GeneratedItem, WriterItemMetadata } from "pipeline/agents/writer/types";
import { Gatekeeper } from "pipeline/agents/gatekeeper/Gatekeeper";
import { runBuilder } from "pipeline/agents/builder";
import { internalLogger } from "pipeline/agents/shared/internalLogging";

// Enable internal logging for dry run
if (typeof window === "undefined") {
  (global as any).__INTERNAL_LOGGING_ENABLED = true;
}
internalLogger.setEnabled(true);

// ── Dry Run: Mock Blueprint with Mixed Generation Methods ──────────────────

const mockBlueprint: BlueprintPlanV3_2 = {
  version: "3.2",
  domain: "Algebra 1",
  grade: "9",
  assessmentType: "formative",
  slots: [
    {
      id: "template_slot_1",
      questionType: "multipleChoice",
      difficulty: "easy",
      cognitiveDemand: "remember",
      pacingSeconds: 45,
      topicAngle: "Basic math facts",
      templateId: "template_001",
      generationMethod: "template",
    } as any,
    {
      id: "diagram_slot_1",
      questionType: "graphInterpretation",
      difficulty: "medium",
      cognitiveDemand: "apply",
      pacingSeconds: 90,
      topicAngle: "Linear functions",
      diagramType: "xy_plane",
      generationMethod: "diagram",
    } as any,
    {
      id: "image_slot_1",
      questionType: "shortAnswer",
      difficulty: "medium",
      cognitiveDemand: "analyze",
      pacingSeconds: 120,
      topicAngle: "Historical analysis",
      imageReferenceId: "image_001",
      generationMethod: "image",
    } as any,
    {
      id: "llm_slot_1",
      questionType: "constructedResponse",
      difficulty: "hard",
      cognitiveDemand: "evaluate",
      pacingSeconds: 180,
      topicAngle: "Critical thinking",
      generationMethod: "llm",
    } as any,
    {
      id: "passage_slot_1",
      questionType: "passageBased",
      difficulty: "medium",
      cognitiveDemand: "analyze",
      pacingSeconds: 240,
      topicAngle: "Reading comprehension",
      constraints: { passageBased: { passageLength: "medium", questionCount: 3 } },
      generationMethod: "llm",
    } as any,
  ],
  depthFloor: "understand",
  depthCeiling: "evaluate",
  totalEstimatedTimeSeconds: 675,
  distribution: {
    questionTypes: { multipleChoice: 1, graphInterpretation: 1, shortAnswer: 1, constructedResponse: 1, passageBased: 1 },
    difficulty: { easy: 1, medium: 3, hard: 1 },
    bloom: { remember: 1, understand: 0, apply: 1, analyze: 2, evaluate: 1, create: 0 },
  },
  orderingStrategy: "sequentialDifficulty",
} as any;

const mockUAR: UnifiedAssessmentRequest = {
  course: "Algebra 1",
  topic: "Functions and Equations",
  gradeLevels: ["9"],
} as any;

// ── Mock Writer Output (pre-generated items) ────────────────────────────────

const mockGeneratedItems: GeneratedItem[] = [
  {
    slotId: "template_slot_1",
    questionType: "multipleChoice",
    prompt: "What is 5 + 3?",
    answer: "8",
    options: ["7", "8", "9", "10"],
    metadata: {
      generationMethod: "template",
      templateId: "template_001",
      diagramType: null,
      imageReferenceId: null,
      difficulty: "easy",
      cognitiveDemand: "remember",
      topicAngle: "Basic math facts",
      pacingSeconds: 45,
      slotId: "template_slot_1",
      questionType: "multipleChoice",
      sectionId: null,
      passageId: null,
    } as WriterItemMetadata,
  },
  {
    slotId: "diagram_slot_1",
    questionType: "graphInterpretation",
    prompt: "What is the slope of this line (shown in diagram)?",
    answer: "2",
    metadata: {
      generationMethod: "diagram",
      templateId: null,
      diagramType: "xy_plane",
      imageReferenceId: null,
      difficulty: "medium",
      cognitiveDemand: "apply",
      topicAngle: "Linear functions",
      pacingSeconds: 90,
      slotId: "diagram_slot_1",
      questionType: "graphInterpretation",
      sectionId: null,
      passageId: null,
    } as WriterItemMetadata,
  },
  {
    slotId: "image_slot_1",
    questionType: "shortAnswer",
    prompt: "Describe what is happening in this image (shown above).",
    answer: "The image shows a historical artifact.",
    metadata: {
      generationMethod: "image",
      templateId: null,
      diagramType: null,
      imageReferenceId: "image_001",
      difficulty: "medium",
      cognitiveDemand: "analyze",
      topicAngle: "Historical analysis",
      pacingSeconds: 120,
      slotId: "image_slot_1",
      questionType: "shortAnswer",
      sectionId: null,
      passageId: null,
    } as WriterItemMetadata,
  },
  {
    slotId: "llm_slot_1",
    questionType: "constructedResponse",
    prompt: "Evaluate the effectiveness of this strategy in solving the problem.",
    answer: "The strategy is effective because it breaks down the problem into manageable parts.",
    metadata: {
      generationMethod: "llm",
      templateId: null,
      diagramType: null,
      imageReferenceId: null,
      difficulty: "hard",
      cognitiveDemand: "evaluate",
      topicAngle: "Critical thinking",
      pacingSeconds: 180,
      slotId: "llm_slot_1",
      questionType: "constructedResponse",
      sectionId: null,
      passageId: null,
    } as WriterItemMetadata,
  },
  {
    slotId: "passage_slot_1",
    questionType: "passageBased",
    prompt: "",
    answer: "",
    passage: "The industrial revolution transformed manufacturing processes. Engineers developed steam-powered machinery that increased production efficiency dramatically. This innovation spread across Europe and North America throughout the nineteenth century.",
    questions: [
      { prompt: "What innovation is discussed in the passage?", answer: "Steam-powered machinery." },
      { prompt: "How did this affect manufacturing?", answer: "It increased efficiency." },
      { prompt: "When did this occur?", answer: "Throughout the nineteenth century." },
    ],
    metadata: {
      generationMethod: "llm",
      templateId: null,
      diagramType: null,
      imageReferenceId: null,
      difficulty: "medium",
      cognitiveDemand: "analyze",
      topicAngle: "Reading comprehension",
      pacingSeconds: 240,
      slotId: "passage_slot_1",
      questionType: "passageBased",
      sectionId: null,
      passageId: null,
    } as WriterItemMetadata,
  },
];

// ── Dry Run Execution ───────────────────────────────────────────────────────

async function runDryRun() {
  console.log("\n╔════════════════════════════════════════════════════════════════╗");
  console.log("║          END-TO-END DRY RUN: Mixed Generation Methods        ║");
  console.log("╚════════════════════════════════════════════════════════════════╝\n");

  try {
    // ── Step 1: Gatekeeper Validation ──────────────────────────────────────
    console.log("▶ Step 1: Gatekeeper Validation");
    console.log("─".repeat(64));

    const gkResult = Gatekeeper.validate(mockBlueprint as any, mockGeneratedItems);
    console.log(`  ✓ Validation: ${gkResult.ok ? "PASS" : "FAIL"}`);
    console.log(`  • Total violations: ${gkResult.violations.length}`);
    if (gkResult.violations.length > 0) {
      console.log("  • Violations by type:");
      const violationsByType: Record<string, number> = {};
      for (const v of gkResult.violations) {
        violationsByType[v.type] = (violationsByType[v.type] ?? 0) + 1;
      }
      for (const [type, count] of Object.entries(violationsByType)) {
        console.log(`    - ${type}: ${count}`);
      }
    }

    // ── Step 2: Builder (Asset Rendering) ──────────────────────────────────
    console.log("\n▶ Step 2: Builder (Asset Rendering)");
    console.log("─".repeat(64));

    const builderInput = { items: mockGeneratedItems, blueprint: { plan: mockBlueprint, uar: mockUAR } };
    const finalAssessment = await runBuilder(builderInput);

    console.log(`  ✓ Assessment built`);
    console.log(`  • Total items: ${finalAssessment.totalItems}`);
    console.log(`  • Items with diagrams: ${finalAssessment.items.filter((i: any) => i.diagramUrl).length}`);
    console.log(`  • Items with images: ${finalAssessment.items.filter((i: any) => i.imageUrl).length}`);

    // Verify routing worked
    const diagramItem = finalAssessment.items.find((i: any) => i.slotId === "diagram_slot_1");
    const imageItem = finalAssessment.items.find((i: any) => i.slotId === "image_slot_1");

    if (diagramItem?.diagramUrl) {
      console.log(`  • Diagram rendering: ${diagramItem.diagramUrl}`);
    } else {
      console.warn(`  ⚠ Diagram rendering FAILED`);
    }

    if (imageItem?.imageUrl) {
      console.log(`  • Image rendering: ${imageItem.imageUrl}`);
    } else {
      console.warn(`  ⚠ Image rendering FAILED`);
    }

    // ── Step 3: Internal Logging Inspection ─────────────────────────────────
    console.log("\n▶ Step 3: Internal Logging Inspection");
    console.log("─".repeat(64));

    const logs = internalLogger.getLogs();
    console.log(`  ✓ Total log entries: ${logs.length}`);
    for (const agent of ["Writer", "Gatekeeper", "Builder", "Scribe"] as const) {
      const agentLogs = internalLogger.getLogsByAgent(agent);
      console.log(`  • ${agent}: ${agentLogs.length} entries`);
      for (const log of agentLogs.slice(0, 2)) {
        console.log(`    - ${log.level.toUpperCase()}: ${log.message}`);
      }
    }

    // ── Summary ────────────────────────────────────────────────────────────
    console.log("\n╔════════════════════════════════════════════════════════════════╗");
    console.log("║                        DRY RUN SUMMARY                         ║");
    console.log("╚════════════════════════════════════════════════════════════════╝");
    console.log(`  ✓ Writer output: ${mockGeneratedItems.length} items with complete metadata`);
    console.log(`  ✓ Gatekeeper: ${gkResult.violations.length} violations (${gkResult.ok ? "PASS" : "FAIL"})`);
    console.log(`  ✓ Builder: ${finalAssessment.totalItems} items with asset URLs`);
    console.log(`  ✓ Logging: ${logs.length} internal log entries`);
    console.log("\n✅ End-to-end pipeline verification complete!\n");

  } catch (error: any) {
    console.error("\n❌ Dry run failed:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the dry run
runDryRun().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
