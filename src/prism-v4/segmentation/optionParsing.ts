const OPTION_LINE_RE = /^\s*\(?([A-Ea-e])\)?[\.)](?:\s+|$)(.+)$/;
const OPTION_TOKEN_RE = /(^|\s)\(?([A-Ea-e])\)?[\.)]\s*/g;

export type ParsedOptionLine = {
  label: string;
  text: string;
};

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function parseOptionLine(line: string): ParsedOptionLine | null {
  const match = line.match(OPTION_LINE_RE);
  if (!match?.[1] || !match[2]) {
    return null;
  }

  const label = match[1].toUpperCase();
  const text = normalizeText(match[2]);
  if (!text) {
    return null;
  }

  return { label, text };
}

export function optionDedupeKey(option: ParsedOptionLine): string {
  return `${option.label}::${normalizeText(option.text).toLowerCase()}`;
}

export function extractOptionsFromLine(line: string): ParsedOptionLine[] {
  const normalizedLine = normalizeText(line);
  if (!normalizedLine) {
    return [];
  }

  const matches: Array<{ label: string; index: number; contentStart: number }> = [];
  for (const match of normalizedLine.matchAll(OPTION_TOKEN_RE)) {
    const raw = match[0] ?? "";
    const label = match[2]?.toUpperCase();
    const index = match.index ?? -1;
    if (!label || index < 0) {
      continue;
    }
    const contentStart = index + raw.length;
    matches.push({ label, index, contentStart });
  }

  if (matches.length === 0) {
    return [];
  }

  const options: ParsedOptionLine[] = [];
  for (let i = 0; i < matches.length; i += 1) {
    const current = matches[i];
    if (!current) {
      continue;
    }
    const next = matches[i + 1];
    const end = next ? next.index : normalizedLine.length;
    const text = normalizeText(normalizedLine.slice(current.contentStart, end));
    if (!text) {
      continue;
    }
    options.push({ label: current.label, text });
  }

  return options;
}

export function extractOptionsFromText(text: string): ParsedOptionLine[] {
  return text
    .split(/\r?\n/)
    .flatMap((line) => extractOptionsFromLine(line));
}
