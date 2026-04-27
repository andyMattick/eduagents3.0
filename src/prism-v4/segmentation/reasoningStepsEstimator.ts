export function estimateReasoningSteps(text: string): number {
  return (text.match(/because|therefore|so that|thus/gi) || []).length;
}