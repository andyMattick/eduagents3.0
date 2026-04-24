import type { SimulationItem } from "../schema/SimulationItem";

export type BlockType = "header" | "instruction" | "item";

export interface SegmentedBlock {
  itemNumber: number;
  text: string;
}

export interface SimulationSection {
  id: string;
  header: string;
  instructions: string[];
  itemNumbers: number[];
}

export interface SectioningResult {
  sections: SimulationSection[];
  itemBlocks: SegmentedBlock[];
  itemToSectionId: Map<number, string>;
}

const HEADER_PATTERNS = [
  /name[:]?/i,
  /class[:]?/i,
  /date[:]?/i,
  /teacher[:]?/i,
  /period[:]?/i,
  /honor pledge/i,
  /pledge/i,
  /test/i,
  /exam/i,
  /chapter/i,
  /unit/i,
  /section/i,
  /part [A-Z]/i,
  /multiple choice/i,
  /short answer/i,
  /free response/i,
  /true\/false/i,
  /directions[:]?/i,
] as const;

const INSTRUCTION_VERBS = /\b(show|explain|justify|round|use|complete|answer|write|label|calculate|solve|graph)\b/i;
const QUESTION_SIGNALS = /\?|\b(explain|describe|discuss|compare|calculate|solve|find|determine|evaluate|justify|show)\b/i;

function firstLine(text: string): string {
  return text.split(/\r?\n/)[0]?.trim() ?? "";
}

function isLowSemanticHeader(text: string): boolean {
  const wc = text.split(/\s+/).filter(Boolean).length;
  return wc < 10 && !QUESTION_SIGNALS.test(text) && !/\d/.test(text);
}

function detectBlockType(text: string, hasSeenItem: boolean): BlockType {
  const normalized = text.trim();
  const headerMatch = HEADER_PATTERNS.some((re) => re.test(normalized));
  const looksLikeItem = QUESTION_SIGNALS.test(normalized)
    || /^\d+[.)]/.test(normalized)
    || /\b[a-h]\)/i.test(normalized)
    || /\b[A-D][.)]\s+/.test(normalized);

  // Item signals always win once detected.
  if (looksLikeItem) return "item";

  // Before first real item, non-item lines are treated as headers.
  if (!hasSeenItem && !looksLikeItem) return "header";

  // After the first real item, avoid creating new sections from short item stems.
  // Only explicit header markers (part/section/directions) can start another section.
  if (hasSeenItem && headerMatch && /\b(part\s+[A-Z]|section|directions?)\b/i.test(normalized)) {
    return "header";
  }

  if (!looksLikeItem && INSTRUCTION_VERBS.test(normalized)) return "instruction";

  // Short blocks appearing after real items are usually stems, not headers.
  if (hasSeenItem && isLowSemanticHeader(normalized)) return "item";

  return "item";
}

export function buildSections(blocks: SegmentedBlock[]): SectioningResult {
  const sections: SimulationSection[] = [];
  const itemBlocks: SegmentedBlock[] = [];
  const itemToSectionId = new Map<number, string>();

  let currentSection: SimulationSection | null = null;
  let sectionCounter = 0;
  let hasSeenItem = false;

  const ensureSection = (header?: string): SimulationSection => {
    if (!currentSection) {
      sectionCounter += 1;
      currentSection = {
        id: `section-${sectionCounter}`,
        header: header?.trim() || `Section ${sectionCounter}`,
        instructions: [],
        itemNumbers: [],
      };
      sections.push(currentSection);
    }
    return currentSection;
  };

  for (const block of blocks) {
    const text = block.text?.trim() ?? "";
    if (!text) continue;

    const kind = detectBlockType(text, hasSeenItem);

    if (kind === "header") {
      sectionCounter += 1;
      currentSection = {
        id: `section-${sectionCounter}`,
        header: firstLine(text) || `Section ${sectionCounter}`,
        instructions: [],
        itemNumbers: [],
      };
      sections.push(currentSection);
      continue;
    }

    const section = ensureSection();

    if (kind === "instruction") {
      section.instructions.push(text);
      continue;
    }

    hasSeenItem = true;
    itemBlocks.push(block);
    section.itemNumbers.push(block.itemNumber);
    itemToSectionId.set(block.itemNumber, section.id);
  }

  return { sections, itemBlocks, itemToSectionId };
}

export function applySectionInstructionEffects(item: SimulationItem, instructions: string[]): SimulationItem {
  if (!instructions || instructions.length === 0) return item;

  let next: SimulationItem = { ...item };

  for (const instruction of instructions) {
    const text = instruction.toLowerCase();

    if (/show|explain|justify/.test(text)) {
      next.writingMode = "Explain";
      next.expectedResponseLength = (next.expectedResponseLength ?? 0) + 1;
      next.reasoningSteps = (next.reasoningSteps ?? 0) + 1;
      next.timeToProcessSeconds = Math.round(next.timeToProcessSeconds * 1.2);
    }

    if (/round|calculate|solve/.test(text)) {
      next.writingMode = "Calculate";
      next.reasoningSteps = (next.reasoningSteps ?? 0) + 1;
    }

    if (/choose|best answer|select/.test(text)) {
      next.writingMode = "Select";
      next.expectedResponseLength = 0;
      next.reasoningSteps = 0;
    }

    if (/no calculators?/.test(text)) {
      next.timeToProcessSeconds = Math.round(next.timeToProcessSeconds * 1.15);
    }
  }

  return next;
}