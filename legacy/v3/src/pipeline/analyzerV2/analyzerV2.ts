import {
  NormalizedBlock,
  AnalyzedItem,
  SectionStructure,
  TeacherStyleProfile,
  GenericTemplate,
  ProceduralTemplate,
  ConceptualPlugin,
  PatternSlot,
  Relationship,
  Rule
} from "./types";



import { UnifiedAssessmentRequest } from "../contracts/UnifiedAssessmentRequest";

export interface AnalyzerV2Input {
  documentId: string;
  rawText: string;
  blocks?: NormalizedBlock[];
  uar?: UnifiedAssessmentRequest;
  courseId?: string | null;
  teacherId?: string | null;
}

export interface AnalyzerV2Output {
  items: AnalyzedItem[];
  sectionStructures: SectionStructure[];
  teacherStyle?: TeacherStyleProfile;
  genericTemplates: GenericTemplate[];
  proceduralTemplates: ProceduralTemplate[];
  conceptualPlugins: ConceptualPlugin[];
  distributions: {
    difficulty: Record<string, number>;
    bloom: Record<string, number>;
    questionTypes: Record<string, number>;
  };
  conceptCoverage?: {
    assessed: string[];
    missing: string[];
  };
}
export interface SegmentedItem {
  id: string;
  rawPrompt: string;
  blocks: NormalizedBlock[];
  sectionTaskType?: string;
  isContainer?: boolean;
  subItems: SegmentedItem[];
  indent: number;
  numbering: string | null;
}

// Matches: 1), 1., 1a), 1a., a), i), (i), (1), etc.
const numberingRegex = /^(\(?[0-9]+[a-zA-Z]*\)?[.)]?|\(?[a-zA-Z]+\)?[.)]?)/;

// Extracts numbering token (e.g., "1a)", "a)", "i)")
function extractNumbering(line: string): string | null {
  const trimmed = line.trim();

  // 1) 1. 1- 1:
  const numeric = trimmed.match(/^(\d+)[\)\.\:\-]\s+/);
  if (numeric) return numeric[0];

  // a) b) c) A) B) C)
  const letter = trimmed.match(/^([a-zA-Z])\)\s+/);
  if (letter) return letter[0];

  // i) ii) iii) iv) v) etc. (roman numerals)
  const roman = trimmed.match(/^((?=[MDCLXVI])(M{0,4}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})))\)\s+/i);
  if (roman) return roman[0];

  return null;
}

// Removes numbering token from the beginning of a line
function stripNumbering(line: string): string {
  const trimmed = line.trim();
  const match = trimmed.match(numberingRegex);
  if (!match) return trimmed;
  return trimmed.slice(match[0].length).trim();
}

// Count leading spaces for indentation
function countIndent(line: string): number {
  let i = 0;
  while (i < line.length && line[i] === " ") i++;
  return i;
}

// Determines if child numbering belongs under parent numbering
function isChildNumbering(parentNum: string | null, childNum: string | null): boolean {
  if (!childNum) return false;
  if (!parentNum) return false;

  // Examples:
  // parent: "1)" → children: "a)", "b)", "1a)", "1b)"
  // parent: "1a)" → children: "i)", "ii)", "1a(i)"

  const p = parentNum.replace(/[).]/g, "");
  const c = childNum.replace(/[).]/g, "");

  // If child starts with parent prefix → child
  if (c.startsWith(p)) return true;

  // If parent is numeric and child is alpha → child
  if (/^[0-9]+$/.test(p) && /^[a-zA-Z]+$/.test(c)) return true;

  // If parent is alpha and child is roman → child
  if (/^[a-zA-Z]+$/.test(p) && /^[ivxIVX]+$/.test(c)) return true;

  return false;
}




interface SegmentedSection {
  id: string;
  title?: string;
  itemIds: string[];
  taskType?: string | null;   // ← add this
}

type ParsedItem = AnalyzedItem & {
  sectionTaskType?: string | null;
};



export class AnalyzerV2 {
  private globalItemCounter = 1;

  async analyze(input: AnalyzerV2Input): Promise<AnalyzerV2Output> {
    // Phase 1 — Preprocessing & segmentation
    const { segmentedItems, segmentedSections } = this.preprocessAndSegment(input);

    // Phase 2 — Item parsing
    const parsedItems = this.parseItems(segmentedItems);

    // Phase 3 — Generic pattern extraction
    const genericTemplates = this.extractGenericPatterns(parsedItems);

    // Phase 4 — Domain-specific enrichment (optional)
    const { proceduralTemplates, conceptualPlugins } =
      this.enrichDomainSpecific(parsedItems, genericTemplates);

    // Phase 5 — Section & test structure extraction
    const sectionStructures = this.extractSectionStructure(segmentedSections, parsedItems);

    // Phase 6 — Teacher style extraction
    const teacherStyle = this.extractTeacherStyle(parsedItems, sectionStructures);

    // Phase 7 — Distributions & concept coverage
    const distributions = this.computeDistributions(parsedItems);
    const conceptCoverage = this.computeConceptCoverage(parsedItems);

    // Final output assembly — all variables are used here
    return {
      items: parsedItems,
      sectionStructures,
      teacherStyle,
      genericTemplates,
      proceduralTemplates,
      conceptualPlugins,
      distributions,
      conceptCoverage
    };
  }

  
public async debugPhase4(rawText: string) {
  // Phase 1
  const { segmentedItems, segmentedSections } = this.preprocessAndSegment({
    documentId: "debug",
    rawText
  });

  // Phase 2
  const parsed = this.parseItems(segmentedItems);

  // Phase 3
  const structural = this.extractGenericPatterns(parsed);

  // Phase 4
  const { proceduralTemplates, conceptualPlugins } =
    this.enrichDomainSpecific(parsed, structural);

  // Phase 5
  const sectionStructures = this.extractSectionStructure(segmentedSections, parsed);

  // Per-item classification snapshot
  const classified = parsed.map((item, index) => {
    const text = item.rawPrompt;

    const hasMathExpression =
      /\d+\s*[\+\-\*\/]\s*\d+/.test(text) ||
      /[a-zA-Z]\s*[\+\-\*\/]\s*\d+/.test(text) ||
      /\d+\s*[a-zA-Z]/.test(text) ||
      /=/.test(text);

    const isProcedural =
      item.taskType === "calculate" ||
      hasMathExpression;

    const isConceptual =
      !isProcedural &&
      ["define", "explain", "interpretation", "compareContrast"]
        .includes(item.taskType ?? "");

    return {
      id: item.id,
      rawPrompt: item.rawPrompt,
      taskType: item.taskType,
      surfaceForm: item.surfaceForm,
      bloomSignals: item.bloomSignals,
      difficultySignals: item.difficultySignals,
      concepts: item.concepts,

      hasMathExpression,
      isProcedural,
      isConceptual,

      structuralTemplateId: structural[index]?.id
    };
  });

  return {
    segmentedItems,
    segmentedSections,
    parsed,
    structural,
    classified,
    proceduralTemplates,
    conceptualPlugins,
    sectionStructures
  };
}

public async debugPhase5(rawText: string) {
  // Phase 1 — segmentation
  const { segmentedItems, segmentedSections } = this.preprocessAndSegment({
    documentId: "debug",
    rawText
  });

  // Phase 2 — parsed items
  const parsedItems = this.parseItems(segmentedItems);

  // Phase 3 — structural templates
  const structural = this.extractGenericPatterns(parsedItems);

  // Phase 4 — domain enrichment
  const { proceduralTemplates, conceptualPlugins } =
    this.enrichDomainSpecific(parsedItems, structural);

  console.log("SEGMENTED SECTIONS:", segmentedSections);
  console.log("PARSED ITEMS:", parsedItems);
  console.log("ITEM IDS PER SECTION:", segmentedSections.map(s => s.itemIds));


  // Phase 5 — section structure extraction
  const sectionStructures =
    this.extractSectionStructure(segmentedSections, parsedItems);

  // Build a debug‑friendly view of each section
  const sectionDebug = sectionStructures.map(section => {
    const items = parsedItems.filter(it => section.itemIds.includes(it.id));

    return {
      id: section.id,
      title: section.title,
      taskType: section.taskType,
      itemIds: section.itemIds,

      // What items actually look like
      items: items.map(it => ({
        id: it.id,
        rawPrompt: it.rawPrompt,
        taskType: it.taskType,
        surfaceForm: it.surfaceForm,
        bloomSignals: it.bloomSignals,
        difficultySignals: it.difficultySignals,
        concepts: it.concepts
      })),

      // Section‑level signals
      distributions: section.distributions,
      conceptCoverage: section.conceptCoverage,

      // Template summary
      sectionTemplate: section.sectionTemplate
    };
  });

  return {
    segmentedItems,
    segmentedSections,
    parsedItems,
    structural,
    proceduralTemplates,
    conceptualPlugins,
    sectionStructures,
    sectionDebug
  };
}


  // -----------------------------
  // Phase 1
  // -----------------------------
  
private defaultBlockify(rawText: string): NormalizedBlock[] {
  console.log(">>> USING UPDATED BLOCKIFIER <<<");

  return rawText
    .split("\n")
    .map(line => {
      const indent = line.match(/^\s*/)?.[0].length ?? 0;
      const trimmed = line.trim();
      if (!trimmed) return null;

      const numbering = extractNumbering(trimmed);

      if (numbering) {
        return {
          type: "listItem",
          text: trimmed,
          numbering,
          indent,
          index: 0
        } as NormalizedBlock;
      }

      return {
        type: "paragraph",
        text: trimmed,
        indent
      } as NormalizedBlock;
    })
    .filter(Boolean) as NormalizedBlock[];
}
private buildHierarchy(blocks: NormalizedBlock[]): SegmentedItem[] {
  const items: SegmentedItem[] = [];
  const stack: { indent: number; item: SegmentedItem }[] = [];

  for (const block of blocks) {
    if (block.type !== "listItem" && block.type !== "paragraph") continue;

    const item: SegmentedItem = {
      id: `item_${this.globalItemCounter++}`,
      rawPrompt: block.text,
      blocks: [block],
      subItems: [],
      indent: block.indent,
      numbering: block.numbering ?? null,
      isContainer: false
    };

    // Find parent by indentation
    while (stack.length > 0 && block.indent <= stack[stack.length - 1].indent) {
      stack.pop();
    }

    if (stack.length === 0) {
      items.push(item);
    } else {
      const parent = stack[stack.length - 1].item;
      parent.subItems.push(item);
      parent.isContainer = true;
    }

    stack.push({ indent: block.indent, item });
  }

  // Mark containers recursively
  const markContainers = (nodes: SegmentedItem[]) => {
    for (const n of nodes) {
      if (n.subItems.length > 0) {
        n.isContainer = true;
      }
      markContainers(n.subItems);
    }
  };
  markContainers(items);

  // ⭐ FIX: wrap multiple roots under a synthetic root
  if (items.length > 1) {
    return [{
      id: `item_${this.globalItemCounter++}`,
      rawPrompt: "",
      blocks: [],
      subItems: items,
      indent: -1,
      numbering: null,
      isContainer: true
    }];
  }

  return items;
}




private preprocessAndSegment(input: AnalyzerV2Input) {
  const segmentedSections: SegmentedSection[] = [];

  // Phase 1a: Blockify the raw text
  const blocks = input.blocks ?? this.defaultBlockify(input.rawText);
  console.log("PHASE 1 BLOCKS:", blocks);

  // Phase 1b: Build hierarchy from indentation
  const hierarchicalItems = this.buildHierarchy(blocks);
  console.log("PHASE 1 HIERARCHY:", hierarchicalItems);

  let currentSection: SegmentedSection | null = null;
  const allSegmentedItems: SegmentedItem[] = [];

  // Phase 1c: Group items into sections
  const processItems = (items: SegmentedItem[], sectionTaskType?: string | null, isTopLevel: boolean = true) => {
    for (const item of items) {
      // Check if this is a section instruction
      const inferredTask = this.detectSectionInstruction(item.rawPrompt);

      if (inferredTask) {
        // Flush previous section if exists
        if (currentSection) {
          segmentedSections.push(currentSection);
        }

        // Start new section
        const sectionId = `section_${segmentedSections.length + 1}`;
        currentSection = {
          id: sectionId,
          title: item.rawPrompt,
          itemIds: [],
          taskType: inferredTask
        };
      } else {
        // Normal content item
        if (!currentSection) {
          const sectionId = `section_${segmentedSections.length + 1}`;
          currentSection = {
            id: sectionId,
            title: undefined,
            itemIds: [],
            taskType: sectionTaskType ?? null
          };
        }

        // Add item to current section
        currentSection.itemIds.push(item.id);
        
        // Only add top-level items to segmented items list
        // Children will be discovered through the recursive walk in parseItems()
        if (isTopLevel) {
          allSegmentedItems.push(item);
        }

        // Recursively process children
        if (item.subItems.length > 0) {
          processItems(item.subItems, item.sectionTaskType ?? currentSection.taskType, false);
        }
      }
    }
  };

  if (hierarchicalItems.length > 0) {
  processItems([hierarchicalItems[0]], null, true);
}



  // Flush last section
  if (currentSection) {
    segmentedSections.push(currentSection);
  }

  console.log("SEGMENTED ITEMS:", allSegmentedItems);
  console.log("SEGMENTED SECTIONS:", segmentedSections);

  return {
    segmentedItems: allSegmentedItems,
    segmentedSections
  };
}



private detectSectionInstruction(text: string): string | null {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  // === PATTERN 1: Part / Section boundaries (highest priority) ===
  // "Part A:", "Part B.", "part c :", etc.
  if (/^\s*Part\s+[A-Z]\s*[:.]/i.test(trimmed)) {
    return "section";
  }

  // "Section I:", "Section II.", "section iii :", etc. (roman numerals)
  if (/^\s*Section\s+(I|II|III|IV|V|VI|VII|VIII|IX|X)\s*[:.]/i.test(trimmed)) {
    return "section";
  }

  // "Section 1:", "Section 2.", "section 3 :", etc. (numeric)
  if (/^\s*Section\s+\d+\s*[:.]/i.test(trimmed)) {
    return "section";
  }

  // === PATTERN 2: Instructional verbs (task-specific) ===
  if (lower.endsWith(":")) {
    if (lower.includes("solve")) return "calculate";
    if (lower.includes("simplify")) return "calculate";
    if (lower.includes("evaluate")) return "calculate";
    if (lower.includes("find the value")) return "calculate";

    if (lower.includes("define")) return "define";
    if (lower.includes("explain")) return "explain";
    if (lower.includes("compare")) return "compareContrast";
    if (lower.includes("label")) return "labeling";
    if (lower.includes("short response")) return "shortAnswer";
    if (lower.includes("extended response")) return "extendedAnswer";
    if (lower.includes("multiple choice")) return "multipleChoice";
    if (lower.includes("vocabulary")) return "vocabulary";
    if (lower.includes("data interpretation")) return "interpretation";
    if (lower.includes("read the passage")) return "reading";
    if (lower.includes("answer the questions")) return "questionAnswering";
  }

  return null;
}

  // -----------------------------
  // Phase 2
  // -----------------------------
private detectSurfaceForm(blocks: NormalizedBlock[]): string {
  const text = blocks.map(b => ("text" in b ? b.text : "")).join(" ").toLowerCase();

  if (/a\).+b\).+c\)/.test(text)) return "multipleChoice";
  if (/fill in the blank|____/.test(text)) return "fillBlank";
  if (/label/.test(text)) return "diagramLabeling";
  if (/table/.test(text)) return "tableInterpretation";
  if (/graph/.test(text)) return "graphInterpretation";

  return "shortAnswer";
}

private detectTaskType(text: string): string {
  const t = text.toLowerCase();

  if (t.includes("define")) return "define";
  if (t.includes("explain")) return "explain";
  if (t.includes("compare") || t.includes("contrast")) return "compareContrast";
  if (t.includes("interpret")) return "interpretation";
  if (t.includes("calculate") || /\d+[\+\-\*\/]\d+/.test(t)) return "calculate";
  if (t.includes("label")) return "labeling";

  return "generic";
}

private detectRepresentations(blocks: NormalizedBlock[]): string[] {
  const reps = new Set<string>();

  for (const b of blocks) {
    if (b.type === "table") reps.add("table");
    if (b.type === "diagram") reps.add("diagram");
    if (b.type === "graph") reps.add("graph");
    if (b.type === "image") reps.add("image");
  }

  reps.add("text");
  return Array.from(reps);
}

private detectBloomSignals(text: string): string[] {
  const t = text.toLowerCase();
  const signals: string[] = [];

  if (t.includes("define") || t.includes("identify")) signals.push("remember");
  if (t.includes("explain") || t.includes("describe")) signals.push("understand");
  if (t.includes("compare") || t.includes("contrast")) signals.push("analyze");
  if (t.includes("justify") || t.includes("argue")) signals.push("evaluate");

  return signals;
}

private detectDifficultySignals(text: string): string[] {
  const t = text.toLowerCase();
  const signals: string[] = [];

  if (t.length < 80) signals.push("simple");
  if (t.includes("explain how") || t.includes("why")) signals.push("multi-step");
  if (/\d+[\+\-\*\/]\d+/.test(t)) signals.push("procedural");

  return signals;
}

private extractConcepts(text: string): string[] {
  return text
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter(w => w.length > 4)
    .slice(0, 5);
}

private detectFormatting(blocks: NormalizedBlock[]): string {
  if (blocks.some(b => b.type === "listItem")) return "list";
  if (blocks.some(b => b.type === "table")) return "table";
  return "paragraph";
}

private detectSurfaceArea(text: string): "short" | "medium" | "long" {
  const len = text.length;
  if (len < 60) return "short";
  if (len < 200) return "medium";
  return "long";
}

private parseItems(segmentedItems: SegmentedItem[]): AnalyzedItem[] {
  const results: AnalyzedItem[] = [];

  const walk = (
    node: SegmentedItem,
    inheritedTaskType: string | null
  ) => {
    const detected = this.detectTaskType(node.rawPrompt);
    const effectiveTaskType =
      (detected !== "generic" ? detected : null) ||
      node.sectionTaskType ||
      inheritedTaskType ||
      null;

    // If this node is a container, recurse but DO NOT emit an item
    if (node.isContainer) {
      for (const child of node.subItems) {
        walk(child, effectiveTaskType);
      }
      return;
    }

        const raw = node.rawPrompt;
    const blocks = node.blocks;

    const surfaceForm = this.detectSurfaceForm(blocks);
    const representations = this.detectRepresentations(blocks);
    const bloomSignals = this.detectBloomSignals(raw);
    const difficultySignals = this.detectDifficultySignals(raw);
    const concepts = this.extractConcepts(raw);
    const formatting = this.detectFormatting(blocks);
    const surfaceArea = this.detectSurfaceArea(raw);

    // Leaf item → convert to AnalyzedItem
    const analyzed: AnalyzedItem = {
      id: node.id,
      rawPrompt: raw,
      taskType: effectiveTaskType ?? "generic",
      subItems: [], // Phase 2 flattens everything,
      surfaceForm, 
      representations, 
      bloomSignals, 
      difficultySignals, 
      concepts, 
      formatting, 
      surfaceArea, 
      
      // Phase 3–4 will fill in additional properties
    };

    results.push(analyzed);

    // Recurse into children (depth‑first)
    for (const child of node.subItems) {
      walk(child, effectiveTaskType);
    }
  };

  // Walk each top‑level segmented item
  for (const item of segmentedItems) {
    walk(item, item.sectionTaskType ?? null);
  }

  return results;
}


  // -----------------------------
  // Phase 3
  // -----------------------------
private extractGenericPatterns(parsedItems: ParsedItem[]): GenericTemplate[] {
  return parsedItems.map(item => {
    const templateId = `template_${item.id}`;

    const slots = this.buildSlotsForItem(item);
    const relationships = this.buildRelationshipsForItem(item);
    const rules = this.buildRulesForItem(item);

    return {
      id: templateId,
      sourceItemId: item.id,
      templateType: "structural",
      taskType: item.taskType ?? null,
      surfaceForm: item.surfaceForm,
      representations: item.representations.length > 0
    ? item.representations
    : ["text"],
      answerFormat: item.surfaceForm,

      pattern: {
        slots,
        relationships,
        rules
      }
    };
  });
}

private buildSlotsForItem(item: ParsedItem): PatternSlot[] {
  const conceptSlots: PatternSlot[] = item.concepts.map((_c, i) => ({
    id: `concept_${i + 1}`,
    role: "input",
    dataType: "string"
  }));

  switch (item.taskType) {
    case "define":
      return [
        ...conceptSlots,
        { id: "definition", role: "output", dataType: "string" }
      ];

    case "explain":
      return [
        ...conceptSlots,
        { id: "process", role: "output", dataType: "string" }
      ];

    case "compareContrast":
      return [
        { id: "entityA", role: "input", dataType: "string" },
        { id: "entityB", role: "input", dataType: "string" },
        { id: "comparison", role: "output", dataType: "string" }
      ];

    case "interpretation":
      return [
        { id: "representation", role: "input", dataType: "representation" },
        { id: "interpretation", role: "output", dataType: "string" }
      ];

    case "calculate":
      return [
        { id: "expression", role: "input", dataType: "math" },
        { id: "result", role: "output", dataType: "number" }
      ];

    case "labeling":
      return [
        { id: "diagram", role: "input", dataType: "diagram" },
        { id: "labels", role: "output", dataType: "string[]" }
      ];

    default:
      return [
        ...conceptSlots,
        { id: "response", role: "output", dataType: "string" }
      ];
  }
}
private buildRelationshipsForItem(item: ParsedItem): Relationship[] {
  switch (item.taskType) {
    case "define":
      return [
        { type: "defines", from: "concept_1", to: "definition" }
      ];

    case "explain":
      return [
        { type: "explains", from: "concept_1", to: "process" }
      ];

    case "compareContrast":
      return [
        { type: "comparedTo", from: "entityA", to: "comparison" },
        { type: "comparedTo", from: "entityB", to: "comparison" }
      ];

    case "interpretation":
      return [
        { type: "interprets", from: "representation", to: "interpretation" }
      ];

    case "calculate":
      return [
        { type: "evaluatesTo", from: "expression", to: "result" }
      ];

    case "labeling":
      return [
        { type: "containsLabels", from: "diagram", to: "labels" }
      ];

    default:
      return [];
  }
}


private buildRulesForItem(item: ParsedItem): Rule[] {
  const rules: Rule[] = [];

  for (const bloom of item.bloomSignals) {
    rules.push({
      type: "requiredBloom",
      target: bloom
    });
  }

  for (const diff of item.difficultySignals) {
    rules.push({
      type: "requiredDifficulty",
      target: diff
    });
  }

  rules.push({
    type: "requiredSurfaceForm",
    target: item.surfaceForm
  });

  rules.push({
    type: "maxSurfaceArea",
    target: item.surfaceArea
  });

  return rules;
}

  // -----------------------------
  // Phase 4
  // -----------------------------
private enrichDomainSpecific(
  parsedItems: ParsedItem[],
  genericTemplates: GenericTemplate[]
): {
  proceduralTemplates: ProceduralTemplate[];
  conceptualPlugins: ConceptualPlugin[];
} {
  const proceduralTemplates: ProceduralTemplate[] = [];
  const conceptualPlugins: ConceptualPlugin[] = [];

  for (let i = 0; i < parsedItems.length; i++) {
    const item = parsedItems[i];
    const base = genericTemplates[i];

    // --- DOMAIN DETECTION ---
    const hasMathExpression =
      /\d+\s*[\+\-\*\/]\s*\d+/.test(item.rawPrompt) ||   // 8 + 7
      /[a-zA-Z]\s*[\+\-\*\/]\s*\d+/.test(item.rawPrompt) || // x + 5
      /\d+\s*[a-zA-Z]/.test(item.rawPrompt) ||            // 3x
      /=/.test(item.rawPrompt);    

    const isProcedural =
      item.taskType === "calculate" ||
      hasMathExpression;

    const isConceptual =
      !isProcedural &&
      ["define", "explain", "interpretation", "compareContrast"]
        .includes(item.taskType ?? "");

    // --- PROCEDURAL TEMPLATE ---
    if (isProcedural) {
      const operands = this.extractOperands(item.rawPrompt);

      const procedural: ProceduralTemplate = {
        ...base,
        templateType: "procedural",

        structure: "binary-operation",
        operands,
        unknownPositions: ["result"],
        ranges: this.estimateRanges(operands),
        answerLogic: "evaluate(expression)",

        difficultyModel: {
          easy: {},
          medium: {},
          hard: {}
        }
      };

      proceduralTemplates.push(procedural);
      continue;
    }

    // --- CONCEPTUAL PLUGIN ---
    if (isConceptual) {
      const conceptual: ConceptualPlugin = {
        ...base,
        templateType: "conceptual",

        cognitiveDemand: this.inferCognitiveDemand(item),
        surfaceArea: item.surfaceArea
      };

      conceptualPlugins.push(conceptual);
      continue;
    }

    // Structural templates are left untouched
  }

  return { proceduralTemplates, conceptualPlugins };
}

private extractOperands(text: string): string[] {
  const matches = text.match(/\d+/g);
  return matches ?? [];
}

private estimateRanges(operands: string[]): Record<string, [number, number]> {
  const ranges: Record<string, [number, number]> = {};

  operands.forEach((op, i) => {
    const n = Number(op);
    ranges[`operand_${i + 1}`] = [Math.max(0, n - 10), n + 10];
  });

  return ranges;
}

private inferCognitiveDemand(item: AnalyzedItem): string {
  if (item.bloomSignals.includes("analyze")) return "high";
  if (item.bloomSignals.includes("understand")) return "medium";
  return "low";
}

private isProcedural(item: AnalyzedItem): boolean {
  const text = item.rawPrompt.toLowerCase();

  const mathVerbs = [
    "calculate",
    "compute",
    "evaluate",
    "simplify",
    "solve",
    "find the value",
    "determine"
  ];

  const hasMathVerb = mathVerbs.some(v => text.includes(v));

  const hasMathExpression =
    /\d+\s*[\+\-\*\/]\s*\d+/.test(text) ||   // 8 + 7
    /[a-zA-Z]\s*[\+\-\*\/]\s*\d+/.test(text) || // x + 5
    /\d+\s*[a-zA-Z]/.test(text) ||            // 3x
    /=/.test(text);                           // equations

  return hasMathVerb || hasMathExpression;
}



  // -----------------------------
  // Phase 5
  // -----------------------------

private inferSectionTaskType(taskTypeDist: Record<string, number>, itemCount: number): string {
  if (itemCount === 0) return "generic";

  // Find dominant taskType (>= 40%)
  const total = Object.values(taskTypeDist).reduce((a, b) => a + b, 0);
  if (total === 0) return "generic";

  for (const [taskType, count] of Object.entries(taskTypeDist)) {
    const percent = (count / total) * 100;
    if (percent >= 40) {
      if (taskType === "calculate") return "procedural";
      if (taskType === "explain") return "conceptual";
      if (taskType === "identify") return "recognition";
      if (taskType === "interpret") return "dataInterpretation";
      return taskType;
    }
  }

  // No single dominant type → mixed
  if (taskTypeDist["interpret"] && (taskTypeDist["interpret"] / total) * 100 >= 30) {
    return "dataInterpretation";
  }

  return "mixed";
}

private getSecondaryTaskTypes(taskTypeDist: Record<string, number>, dominantTaskType: string, topN: number = 2): string[] {
  const total = Object.values(taskTypeDist).reduce((a, b) => a + b, 0);
  if (total === 0) return [];

  return Object.entries(taskTypeDist)
    .filter(([taskType]) => taskType !== dominantTaskType)
    .sort(([, countA], [, countB]) => countB - countA)
    .slice(0, topN)
    .map(([taskType]) => taskType);
}

private getSurfaceFormDistribution(surfaceFormDist: Record<string, number>): { dominant: string | null; secondary: string[] } {
  const dominant = this.getDominant(surfaceFormDist);
  const secondary = Object.entries(surfaceFormDist)
    .filter(([form]) => form !== dominant)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 2)
    .map(([form]) => form);
  
  return { dominant, secondary };
}

private inferStructurePattern(items: ParsedItem[]): string {
  const containerCount = items.filter(it => it.subItems && it.subItems.length > 0).length;
  const leafCount = items.filter(it => !it.subItems || it.subItems.length === 0).length;
  
  if (containerCount === 0) {
    return `${leafCount} independent items`;
  }
  
  if (containerCount === 1 && leafCount > 0) {
    return `1 stem with ${leafCount} sub-items`;
  }
  
  return `${containerCount} container(s), ${leafCount} leaf items`;
}

private extractSectionStructure(
  segmentedSections: SegmentedSection[],
  parsedItems: ParsedItem[]
): SectionStructure[] {
  return segmentedSections.map(section => {
    const items = parsedItems.filter(it => section.itemIds.includes(it.id));

    const bloomDist = this.computeDistribution(items, it => it.bloomSignals);
    const difficultyDist = this.computeDistribution(items, it => it.difficultySignals);
    const surfaceFormDist = this.computeDistribution(items, it => [it.surfaceForm]);
    const taskTypeDist = this.computeDistribution(items, it => [it.taskType ?? "generic"]);
    const concepts = [...new Set(items.flatMap(it => it.concepts))];

    // === Section-level task-type inference ===
    const inferredTaskType = this.inferSectionTaskType(taskTypeDist, items.length);
    const secondaryTaskTypes = this.getSecondaryTaskTypes(taskTypeDist, inferredTaskType);
    const { dominant: dominantSurfaceForm, secondary: secondarySurfaceForms } = this.getSurfaceFormDistribution(surfaceFormDist);
    const structurePattern = this.inferStructurePattern(items);

    return {
      id: section.id,
      title: section.title,
      itemIds: section.itemIds,
      taskType: section.taskType ?? inferredTaskType,
      distributions: {
        bloom: bloomDist,
        difficulty: difficultyDist,
        surfaceForm: surfaceFormDist,
        taskType: taskTypeDist
      },
      conceptCoverage: concepts,
      sectionTemplate: {
        id: `section_template_${section.id}`,
        taskType: inferredTaskType,
        secondaryTaskTypes,
        dominantSurfaceForm: dominantSurfaceForm ?? '',
        secondarySurfaceForms,
        itemCount: items.length,
        conceptCount: concepts.length,
        structurePattern,
        difficultyDistribution: difficultyDist,
        bloomDistribution: bloomDist,
        surfaceFormDistribution: surfaceFormDist,
        taskTypeDistribution: taskTypeDist
      }
    };
  });
}

private computeDistribution<T>(
  items: ParsedItem[],
  extractor: (item: ParsedItem) => string[]
): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const item of items) {
    for (const value of extractor(item)) {
      counts[value] = (counts[value] ?? 0) + 1;
    }
  }

  return counts;
}

private getDominant(dist: Record<string, number>): string | null {
  let max = 0;
  let dominant: string | null = null;

  for (const [key, count] of Object.entries(dist)) {
    if (count > max) {
      max = count;
      dominant = key;
    }
  }

  return dominant;
}



  // -----------------------------
  // Phase 6
  // -----------------------------
  private extractTeacherStyle(
    parsedItems: AnalyzedItem[],
    sectionStructures?: SectionStructure[]
  ): TeacherStyleProfile | undefined {
    return undefined;
  }

  // -----------------------------
  // Phase 7
  // -----------------------------
  private computeDistributions(parsedItems: AnalyzedItem[]): {
    difficulty: Record<string, number>;
    bloom: Record<string, number>;
    questionTypes: Record<string, number>;
  } {
    return {
      difficulty: {},
      bloom: {},
      questionTypes: {}
    };
  }

  private computeConceptCoverage(parsedItems: AnalyzedItem[]): {
    assessed: string[];
    missing: string[];
  } {
    return {
      assessed: [],
      missing: []
    };
  }
}
