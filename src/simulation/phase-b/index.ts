import { supabaseRest } from "../../../lib/supabase";

type ItemRow = {
  id: string;
  item_number?: number;
  stem?: string;
  answer_key?: unknown;
  metadata?: Record<string, unknown>;
};

export type NormalizedPhaseBItem = {
  itemId: string;
  itemNumber?: number;
  groupId: string;
  partIndex: number;
  logicalLabel: string;
  isParent: boolean;
  traits: {
    bloomLevel: number;
    linguisticLoad: number;
    cognitiveLoad: number;
    representationLoad: number;
    vocabDensity?: number;
    symbolDensity?: number;
    steps?: number;
  };
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function hasAnswerKey(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (Object.keys(record).length === 0) {
      return false;
    }

    return Object.values(record).some((entry) => {
      if (entry === null || entry === undefined) {
        return false;
      }
      if (typeof entry === "string") {
        return entry.trim().length > 0;
      }
      if (Array.isArray(entry)) {
        return entry.length > 0;
      }
      if (typeof entry === "object") {
        return Object.keys(entry as Record<string, unknown>).length > 0;
      }
      return true;
    });
  }

  return true;
}

function letterToPartIndex(letter: string): number {
  const code = letter.toLowerCase().charCodeAt(0);
  if (code >= 97 && code <= 122) {
    return (code - 97) + 1;
  }
  return 0;
}

function readPath(source: unknown, path: string): unknown {
  if (!source || typeof source !== "object") {
    return undefined;
  }

  const parts = path.split(".");
  let current: unknown = source;
  for (const part of parts) {
    if (!current || typeof current !== "object" || !(part in (current as Record<string, unknown>))) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function readNumber(source: unknown, paths: string[]): number | undefined {
  for (const path of paths) {
    const value = readPath(source, path);
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string") {
      const parsed = Number(value.trim());
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return undefined;
}

function deriveStructure(row: ItemRow): Pick<NormalizedPhaseBItem, "itemNumber" | "groupId" | "partIndex" | "logicalLabel" | "isParent"> {
  const itemNumber = typeof row.item_number === "number" && Number.isFinite(row.item_number)
    ? row.item_number
    : undefined;
  const stem = (row.stem ?? "").trim();
  const answerPresent = hasAnswerKey(row.answer_key);
  const alphaNumeric = stem.match(/^(\d+)\s*([a-z])[\).:\s]/i);
  if (alphaNumeric?.[1] && alphaNumeric[2]) {
    const groupId = alphaNumeric[1];
    const suffix = alphaNumeric[2].toLowerCase();
    return {
      itemNumber,
      groupId,
      partIndex: letterToPartIndex(suffix),
      logicalLabel: `${groupId}${suffix}`,
      isParent: !answerPresent,
    };
  }

  const numeric = stem.match(/^(\d+)[\).:\s]/);
  if (numeric?.[1]) {
    const groupId = numeric[1];
    return {
      itemNumber,
      groupId,
      partIndex: 0,
      logicalLabel: groupId,
      isParent: !answerPresent,
    };
  }

  const fallback = typeof itemNumber === "number" ? String(itemNumber) : row.id;
  return {
    itemNumber,
    groupId: fallback,
    partIndex: 0,
    logicalLabel: fallback,
    isParent: !answerPresent,
  };
}

function estimateLinguisticLoad(stem: string): number {
  const text = stem.trim();
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const sentenceCount = text.split(/[.!?]+/).filter((entry) => entry.trim().length > 0).length || 1;
  const avgSentenceLength = wordCount / sentenceCount;
  return clamp(avgSentenceLength / 20, 0, 1);
}

function toNormalizedItem(row: ItemRow): NormalizedPhaseBItem {
  const structure = deriveStructure(row);
  const metadata = row.metadata as Record<string, unknown> | undefined;
  const linguisticLoad = clamp(
    readNumber(metadata, ["linguisticLoad", "linguistic_load", "phaseB.linguisticLoad", "phaseB.linguistic_load", "metrics.linguistic_load"]) ?? estimateLinguisticLoad(row.stem ?? ""),
    0,
    1,
  );
  const cognitiveLoad = clamp(
    readNumber(metadata, ["cognitiveLoad", "cognitive_load", "phaseB.cognitiveLoad", "phaseB.cognitive_load", "metrics.cognitive_load"]) ?? linguisticLoad,
    0,
    1,
  );
  const representationLoad = clamp(
    readNumber(metadata, ["representationLoad", "representation_load", "phaseB.representationLoad", "phaseB.representation_load", "metrics.representation_load"]) ?? 0.5,
    0,
    1,
  );
  const bloomLevel = clamp(
    readNumber(metadata, ["bloomLevel", "bloom_level", "bloomsLevel", "phaseB.bloomLevel", "phaseB.bloom_level", "phaseB.bloomsLevel", "metrics.bloom_level", "metrics.blooms_level"]) ?? 3,
    1,
    6,
  );

  const vocabLevel1 = readNumber(metadata, ["vocabCounts.level1", "vocab_counts.level1", "metrics.vocab_counts.level1", "metrics.vocabCounts.level1"]) ?? 0;
  const vocabLevel2 = readNumber(metadata, ["vocabCounts.level2", "vocab_counts.level2", "metrics.vocab_counts.level2", "metrics.vocabCounts.level2"]) ?? 0;
  const vocabLevel3 = readNumber(metadata, ["vocabCounts.level3", "vocab_counts.level3", "metrics.vocab_counts.level3", "metrics.vocabCounts.level3"]) ?? 0;
  const vocabDensity = vocabLevel1 + vocabLevel2 + vocabLevel3;
  const symbolDensity = readNumber(metadata, ["symbolDensity", "symbol_density", "metrics.symbol_density"]);
  const steps = readNumber(metadata, ["steps", "phaseB.steps", "metrics.steps"]);

  return {
    itemId: row.id,
    itemNumber: structure.itemNumber,
    groupId: structure.groupId,
    partIndex: structure.partIndex,
    logicalLabel: structure.logicalLabel,
    isParent: structure.isParent,
    traits: {
      bloomLevel,
      linguisticLoad,
      cognitiveLoad,
      representationLoad,
      vocabDensity: vocabDensity > 0 ? vocabDensity : undefined,
      symbolDensity,
      steps,
    },
  };
}

function sortNormalizedItems(items: NormalizedPhaseBItem[]): NormalizedPhaseBItem[] {
  return [...items].sort((a, b) => {
    if (a.groupId !== b.groupId) {
      return a.groupId.localeCompare(b.groupId, undefined, { numeric: true });
    }
    if (a.partIndex !== b.partIndex) {
      return a.partIndex - b.partIndex;
    }
    const aNumber = a.itemNumber ?? Number.POSITIVE_INFINITY;
    const bNumber = b.itemNumber ?? Number.POSITIVE_INFINITY;
    return aNumber - bNumber;
  });
}

export async function normalizeItemsPhaseB(documentId: string): Promise<{ items: NormalizedPhaseBItem[] }> {
  const rows = await supabaseRest("v4_items", {
    method: "GET",
    select: "id,item_number,stem,answer_key,metadata",
    filters: {
      document_id: `eq.${documentId}`,
      order: "item_number.asc",
    },
  }) as ItemRow[];

  const normalized = (rows ?? []).map((row) => toNormalizedItem(row));
  const withoutParents = normalized.filter((item) => !item.isParent);

  // Some ingested docs may not carry answer keys on item rows. In that case,
  // parent inference can mark every row as parent; preserve source order instead
  // of returning an empty item list.
  const effectiveItems = withoutParents.length > 0 ? withoutParents : normalized;

  return {
    items: sortNormalizedItems(effectiveItems),
  };
}
