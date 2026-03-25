// GuardrailEngine.ts

export interface GuardrailRule {
  id: string;
  category: string;
  polarity: "require" | "forbid";
  message: string;

  domain: string;

  createdAtRun: number;
  lastTriggeredRun: number;
  triggerCount: number;

  weight: number; // 0 → 1
}

const BASE_DECAY = 0.05;
const EXPIRY_THRESHOLD = 0.3;
const MAX_INJECTED_RULES = 8;

function computeDecayRate(
  trustScore: number,
  stabilityScore: number
): number {
  let decay = BASE_DECAY;

  if (trustScore >= 8) decay += 0.03;
  if (trustScore >= 9) decay += 0.05;

  if (stabilityScore <= 4) decay -= 0.02;
  if (stabilityScore <= 2) decay -= 0.03;

  return Math.max(0.01, decay);
}

export function decayGuardrails(
  rules: GuardrailRule[],
  currentRun: number,
  trustScore: number,
  stabilityScore: number
): GuardrailRule[] {
  const decayRate = computeDecayRate(trustScore, stabilityScore);

  return rules
    .map(rule => {
      const inactiveRuns = currentRun - rule.lastTriggeredRun;
      const decayFactor = Math.max(0, 1 - inactiveRuns * decayRate);

      return {
        ...rule,
        weight: rule.weight * decayFactor
      };
    })
    .filter(rule => rule.weight >= EXPIRY_THRESHOLD);
}

export function reinforceRule(
  rule: GuardrailRule,
  currentRun: number
): GuardrailRule {
  return {
    ...rule,
    triggerCount: rule.triggerCount + 1,
    lastTriggeredRun: currentRun,
    weight: Math.min(1, rule.weight + 0.15)
  };
}

export function mergeGuardrails(
  existing: GuardrailRule[],
  incoming: GuardrailRule[],
  currentRun: number
): GuardrailRule[] {
  const merged = [...existing];

  for (const newRule of incoming) {
    const idx = merged.findIndex(
      r =>
        r.category === newRule.category &&
        r.polarity === newRule.polarity &&
        r.domain === newRule.domain
    );

    if (idx !== -1) {
      merged[idx] = reinforceRule(merged[idx], currentRun);
    } else {
      merged.push({
        ...newRule,
        createdAtRun: currentRun,
        lastTriggeredRun: currentRun,
        triggerCount: 1,
        weight: 0.5
      });
    }
  }

  return merged;
}

export function getInjectableGuardrails(
  rules: GuardrailRule[]
): GuardrailRule[] {
  return rules
    .filter(r => r.weight >= 0.5)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, MAX_INJECTED_RULES);
}