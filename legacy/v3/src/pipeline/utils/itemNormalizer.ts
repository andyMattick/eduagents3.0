import type { WriterItemMetadata } from '../agents/writer/types';
import type { GeneratedItem } from '../agents/writer/types';

export type NormalizedItem = GeneratedItem & {
  prompt?: string;
  answer?: string | string[] | null;
  options?: string[] | null;
  passage?: string | null;
};

export interface NormalizerOptions {
  strict?: boolean;
}

function assertStrictItem(normalized: NormalizedItem, source: any): void {
  if (source?.problemText !== undefined || source?.correctAnswer !== undefined || source?.problemType !== undefined) {
    throw new Error('Strict mode: legacy fields problemText/correctAnswer/problemType are not allowed.');
  }

  if (!normalized.metadata) {
    throw new Error('Strict mode: metadata is required.');
  }

  const prompt = getPrompt(normalized);
  if (!prompt || !prompt.trim()) {
    throw new Error('Strict mode: prompt is required.');
  }

  const options = getOptions(normalized);
  if ((normalized as any).options !== undefined && (normalized as any).options !== null && !Array.isArray((normalized as any).options)) {
    throw new Error('Strict mode: options must be an array or null.');
  }

  if (options && options.length === 0) {
    throw new Error('Strict mode: options array must not be empty when present.');
  }

  if (normalized.questionType === 'multipleChoice' && options) {
    const answer = getAnswer(normalized);
    if (typeof answer === 'string' && answer && !options.includes(answer)) {
      throw new Error('Strict mode: multipleChoice answer must exactly match one options entry.');
    }
  }
}

export function normalizeItem(item: any, options: NormalizerOptions = {}): NormalizedItem {
  if (!item) return {} as NormalizedItem;

  const normalized = { ...item } as NormalizedItem;

  if (item.problemText && !item.prompt) {
    normalized.prompt = item.problemText;
  }

  if (item.correctAnswer && !item.answer) {
    normalized.answer = item.correctAnswer;
  }

  if (!normalized.questionType && item.problemType) {
    normalized.questionType = item.problemType;
  }

  if (normalized.options !== undefined && !Array.isArray(normalized.options)) {
    normalized.options = null;
  }

  if (!normalized.metadata) {
    (normalized as any).metadata = {} as any;
  }

  if (options.strict) {
    assertStrictItem(normalized, item);
  }

  return normalized;
}

export function normalizeItems(items: any[], options: NormalizerOptions = {}): NormalizedItem[] {
  return items.map((item) => normalizeItem(item, options));
}

export function getPrompt(item: NormalizedItem | any): string {
  if (!item) return '';
  return ((item.metadata as any)?.prompt ?? item.prompt ?? '') as string;
}

export function getAnswer(item: NormalizedItem | any): string | string[] | null {
  if (!item) return null;
  return ((item.metadata as any)?.answer ?? item.answer ?? null) as string | string[] | null;
}

export function getOptions(item: NormalizedItem | any): string[] | null {
  if (!item) return null;
  const opts = (item.metadata as any)?.options ?? item.options;
  return Array.isArray(opts) ? opts : null;
}

export function getPassage(item: NormalizedItem | any): string | null {
  if (!item) return null;
  return ((item.metadata as any)?.passage ?? item.passage ?? null) as string | null;
}

export function updateItemMetadata(
  item: NormalizedItem | any,
  updates: Partial<WriterItemMetadata>
): NormalizedItem {
  const normalized = normalizeItem(item);
  return {
    ...normalized,
    metadata: {
      ...(normalized.metadata ?? {}),
      ...updates,
    },
  } as NormalizedItem;
}
