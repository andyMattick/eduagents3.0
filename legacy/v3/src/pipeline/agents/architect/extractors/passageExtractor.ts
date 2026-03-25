export interface ExtractedText {
  passage: string;
  paragraph: string;
  excerpt: string;
}

const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "how",
  "in", "is", "it", "of", "on", "or", "that", "the", "their", "this", "to",
  "was", "were", "what", "when", "where", "which", "with", "into", "about",
  "after", "before", "during", "through", "over", "under", "between", "within",
  "lesson", "unit", "topic",
]);

const DOMAIN_HINTS: Record<string, string[]> = {
  ela: ["character", "dialogue", "theme", "narrator", "scene", "conflict", "symbol", "tone"],
  english: ["character", "dialogue", "theme", "narrator", "scene", "conflict", "symbol", "tone"],
  history: ["speech", "letter", "document", "source", "claim", "argument", "policy", "address"],
  socialstudies: ["speech", "letter", "document", "source", "claim", "argument", "policy", "address"],
  science: ["data", "evidence", "observation", "variable", "result", "experiment", "phenomenon", "model"],
  stem: ["data", "system", "design", "model", "result", "debug", "evidence", "process"],
  general: ["idea", "evidence", "example", "process", "result"],
};

type SentenceWindow = {
  text: string;
  score: number;
};

export function extractFromDocument(
  fullText: string,
  domain: string,
  narrowedTopic: string
): ExtractedText {
  const normalizedDomain = normalizeDomain(domain);
  const cleanedText = normalizeText(fullText);
  if (!cleanedText) {
    return { passage: "", paragraph: "", excerpt: "" };
  }

  const topicTokens = buildTopicTokens(narrowedTopic);
  const paragraphCandidates = splitParagraphCandidates(cleanedText);
  if (paragraphCandidates.length === 0) {
    return {
      passage: trimToWordRange(cleanedText, 150, 250),
      paragraph: trimToWordRange(cleanedText, 40, 120),
      excerpt: trimExcerpt(cleanedText),
    };
  }

  const scoredParagraphs = paragraphCandidates.map((paragraph, index) => ({
    index,
    paragraph,
    score: scoreText(paragraph, topicTokens, normalizedDomain, "paragraph"),
  }));

  const anchor = scoredParagraphs
    .slice()
    .sort((left, right) => right.score - left.score)[0] ?? {
      index: 0,
      paragraph: paragraphCandidates[0],
      score: 0,
    };

  const anchorParagraph = trimToWordRange(anchor.paragraph, 40, 120);
  const passage = buildPassageWindow(paragraphCandidates, anchor.index, topicTokens, normalizedDomain);
  const excerptSource = anchorParagraph || passage || cleanedText;
  const excerpt = extractExcerpt(excerptSource, topicTokens, normalizedDomain);

  return {
    passage,
    paragraph: anchorParagraph || trimToWordRange(passage || cleanedText, 40, 120),
    excerpt,
  };
}

function normalizeDomain(domain: string): string {
  return String(domain ?? "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

function normalizeText(text: string): string {
  return String(text ?? "")
    .replace(/\r/g, "")
    .replace(/[\t ]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function buildTopicTokens(topic: string): string[] {
  const tokens = String(topic ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));

  return Array.from(new Set(tokens));
}

function splitParagraphCandidates(text: string): string[] {
  const blocks = text
    .split(/\n\s*\n+/)
    .map((block) => block.trim())
    .filter(Boolean);

  const sourceBlocks = blocks.length > 0 ? blocks : [text];
  const candidates: string[] = [];

  for (const block of sourceBlocks) {
    const sentences = splitSentences(block);
    const blockWordCount = countWords(block);

    if (blockWordCount <= 130 || sentences.length <= 3) {
      candidates.push(block);
      continue;
    }

    let current: string[] = [];
    for (const sentence of sentences) {
      current.push(sentence);
      const currentText = current.join(" ").trim();
      if (countWords(currentText) >= 80) {
        candidates.push(currentText);
        current = [];
      }
    }

    if (current.length > 0) {
      candidates.push(current.join(" ").trim());
    }
  }

  return candidates.filter(Boolean);
}

function splitSentences(text: string): string[] {
  const matches = text.match(/[^.!?]+(?:[.!?]+|$)/g) ?? [];
  return matches
    .map((sentence) => sentence.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function scoreText(
  text: string,
  topicTokens: string[],
  normalizedDomain: string,
  mode: "paragraph" | "passage" | "excerpt"
): number {
  const lower = text.toLowerCase();
  const words = countWords(text);
  const tokenMatches = topicTokens.reduce(
    (sum, token) => sum + (lower.includes(token) ? 1 : 0),
    0
  );
  const topicPhraseBoost = topicTokens.length > 1 && lower.includes(topicTokens.join(" ")) ? 4 : 0;
  const domainHints = DOMAIN_HINTS[normalizedDomain] ?? DOMAIN_HINTS.general;
  const domainMatches = domainHints.reduce(
    (sum, hint) => sum + (lower.includes(hint) ? 1 : 0),
    0
  );

  let lengthScore = 0;
  if (mode === "paragraph") {
    lengthScore = words >= 40 && words <= 120 ? 4 : words >= 25 && words <= 140 ? 2 : 0;
  } else if (mode === "passage") {
    lengthScore = words >= 150 && words <= 250 ? 4 : words >= 120 && words <= 280 ? 2 : 0;
  } else {
    lengthScore = words >= 15 && words <= 80 ? 4 : words >= 8 && words <= 100 ? 2 : 0;
  }

  const quoteBoost = normalizedDomain === "ela" || normalizedDomain === "english"
    ? (/["“”']/.test(text) ? 1.5 : 0)
    : 0;
  const historyBoost = normalizedDomain === "history" || normalizedDomain === "socialstudies"
    ? (/\b(I|we|our|my|must|should|therefore)\b/i.test(text) ? 1.5 : 0)
    : 0;
  const scienceBoost = normalizedDomain === "science" || normalizedDomain === "stem"
    ? (/\b(percent|rate|temperature|increase|decrease|observed|measured|variable|trial)\b/i.test(text) ? 1.5 : 0)
    : 0;

  return tokenMatches * 4 + topicPhraseBoost + domainMatches * 1.5 + lengthScore + quoteBoost + historyBoost + scienceBoost;
}

function buildPassageWindow(
  paragraphs: string[],
  anchorIndex: number,
  topicTokens: string[],
  normalizedDomain: string
): string {
  let start = anchorIndex;
  let end = anchorIndex;
  let passage = paragraphs[anchorIndex] ?? "";

  while (countWords(passage) < 150 && (start > 0 || end < paragraphs.length - 1)) {
    const leftCandidate = start > 0 ? paragraphs[start - 1] : null;
    const rightCandidate = end < paragraphs.length - 1 ? paragraphs[end + 1] : null;

    const leftScore = leftCandidate
      ? scoreText(leftCandidate, topicTokens, normalizedDomain, "passage")
      : Number.NEGATIVE_INFINITY;
    const rightScore = rightCandidate
      ? scoreText(rightCandidate, topicTokens, normalizedDomain, "passage")
      : Number.NEGATIVE_INFINITY;

    if (rightScore >= leftScore && rightCandidate) {
      end += 1;
    } else if (leftCandidate) {
      start -= 1;
    } else {
      break;
    }

    passage = paragraphs.slice(start, end + 1).join(" ");
  }

  return trimToWordRange(passage, 150, 250);
}

function extractExcerpt(text: string, topicTokens: string[], normalizedDomain: string): string {
  const sentences = splitSentences(text);
  if (sentences.length === 0) {
    return trimExcerpt(text);
  }

  let bestWindow: SentenceWindow | null = null;

  for (let size = 1; size <= 3; size += 1) {
    for (let index = 0; index <= sentences.length - size; index += 1) {
      const windowText = sentences.slice(index, index + size).join(" ").trim();
      const score = scoreText(windowText, topicTokens, normalizedDomain, "excerpt");
      if (!bestWindow || score > bestWindow.score) {
        bestWindow = { text: windowText, score };
      }
    }
  }

  return trimExcerpt(bestWindow?.text ?? text);
}

function trimExcerpt(text: string): string {
  const sentences = splitSentences(text);
  if (sentences.length === 0) {
    return trimToWordRange(text, 12, 80);
  }

  return sentences.slice(0, Math.min(3, sentences.length)).join(" ").trim();
}

function trimToWordRange(text: string, minWords: number, maxWords: number): string {
  const cleaned = normalizeText(text);
  if (!cleaned) return "";

  const words = cleaned.split(/\s+/);
  if (words.length <= maxWords) {
    return cleaned;
  }

  const sentences = splitSentences(cleaned);
  if (sentences.length === 0) {
    return words.slice(0, maxWords).join(" ").trim();
  }

  const windows: SentenceWindow[] = [];
  for (let start = 0; start < sentences.length; start += 1) {
    let currentWords = 0;
    for (let end = start; end < sentences.length; end += 1) {
      currentWords += countWords(sentences[end]);
      if (currentWords > maxWords) break;
      if (currentWords >= minWords || end === sentences.length - 1) {
        windows.push({
          text: sentences.slice(start, end + 1).join(" ").trim(),
          score: currentWords >= minWords ? currentWords : currentWords - minWords,
        });
      }
    }
  }

  const best = windows.sort((left, right) => right.score - left.score)[0];
  return best?.text ?? words.slice(0, maxWords).join(" ").trim();
}

function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}