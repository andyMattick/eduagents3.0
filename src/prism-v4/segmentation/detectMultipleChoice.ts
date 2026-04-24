export function detectMultipleChoice(text: string): boolean {
  const lines = text.split(/\r?\n/);
  const choiceLines = lines.filter((line) => /^[A-D][\.)]\s+/.test(line.trim()));
  return choiceLines.length >= 3;
}