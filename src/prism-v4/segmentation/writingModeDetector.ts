export function detectWritingMode(text: string): string {
  if (/explain|describe|why/i.test(text)) return "Explain";
  if (/calculate|compute|find/i.test(text)) return "Calculate";
  return "Describe";
}