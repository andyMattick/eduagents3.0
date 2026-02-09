# AI Token Tiers Guide

## 🎯 Overview

The teacher system is architected to support **AI token-based pricing**, where each AI operation consumes tokens from a monthly budget. This guide explains the framework and how to implement token tiers.

---

## 📊 Token Tier Model

Unlike simple API call limits, token-based pricing scales with:
- **Token Cost**: Different operations cost different amounts (generate = 10 tokens, regenerate = 5 tokens)
- **Usage-Based**: Pay for what you use, not a fixed per-month budget
- **Transparent Pricing**: Show teachers exactly which operations cost how many tokens

### Tier Examples

```typescript
// Future extension to SUBSCRIPTION_TIERS

export interface AiTokenTierConfig extends SubscriptionTierConfig {
  monthlyTokenLimit: number;
  costPerToken: number; // in cents
  tokenResetDay: number; // 1-28
  tokenRollover: boolean; // Unused tokens carry over?
}

export const AI_TOKEN_TIERS: Record<string, AiTokenTierConfig> = {
  free: {
    ...SUBSCRIPTION_TIERS.free,
    monthlyTokenLimit: 1000, // 50 API calls * ~20 tokens/call
    costPerToken: 0,
    tokenResetDay: 1,
    tokenRollover: false,
  },
  pro: {
    ...SUBSCRIPTION_TIERS.pro,
    monthlyTokenLimit: 10000,
    costPerToken: 0, // Included in $29/mo
    tokenResetDay: 1,
    tokenRollover: true, // Up to 2000 extra
  },
  enterprise: {
    ...SUBSCRIPTION_TIERS.enterprise,
    monthlyTokenLimit: 100000,
    costPerToken: 0.0001, // $0.10 per 1000 tokens
    tokenResetDay: 1,
    tokenRollover: true,
  },
  payAsYouGo: {
    tier: 'payAsYouGo',
    displayName: 'Pay-As-You-Go',
    monthlyTokenLimit: Infinity,
    costPerToken: 0.0001, // $0.10 per 1000 tokens
    monthlyApiLimit: Infinity,
    maxAssignments: Infinity,
    maxQuestionsPerAssignment: Infinity,
    questionBankEnabled: true,
    advancedAnalyticsEnabled: true,
    prioritySupport: false,
    priceMonthly: 0, // No base fee
    tokenResetDay: 1,
    tokenRollover: false,
  },
};
```

---

## 🔧 Token Cost Matrix

Define how many tokens each operation consumes:

```typescript
// src/config/tokenCosts.ts

export const OPERATION_TOKEN_COSTS = {
  'generate': {
    name: 'Generate Assignment',
    baseCost: 20,
    factors: {
      questionCount: 2, // +2 tokens per question
      includeRubric: 5,
      includeAnalytics: 3,
    },
  },
  'regenerate': {
    name: 'Regenerate Question',
    baseCost: 5,
    factors: {
      rewriteLevel: 2, // 'light', 'moderate', 'heavy'
    },
  },
  'analyze': {
    name: 'Analyze Assignment',
    baseCost: 10,
    factors: {
      includeSimulation: 8,
      numberOfPersonas: 2, // per persona
    },
  },
  'rewrite': {
    name: 'Rewrite Assignment',
    baseCost: 15,
    factors: {
      includeAccessibilityVariants: 10,
    },
  },
  'preview': {
    name: 'Generate Preview',
    baseCost: 2,
    factors: {},
  },
} as const;

function calculateTokenCost(
  action: keyof typeof OPERATION_TOKEN_COSTS,
  params: Record<string, number>
): number {
  const config = OPERATION_TOKEN_COSTS[action];
  let cost = config.baseCost;

  // Apply factors
  Object.entries(config.factors).forEach(([factor, multiplier]) => {
    if (params[factor]) {
      cost += params[factor] * multiplier;
    }
  });

  return cost;
}

export default { calculateTokenCost, OPERATION_TOKEN_COSTS };
```

---

## 💾 Database Schema Extension

Add token tracking to existing tables:

```sql
-- Extend teacher_accounts table
ALTER TABLE teacher_accounts ADD COLUMN IF NOT EXISTS
  ai_tokens_available BIGINT DEFAULT 0;

ALTER TABLE teacher_accounts ADD COLUMN IF NOT EXISTS
  ai_tokens_used_this_month BIGINT DEFAULT 0;

ALTER TABLE teacher_accounts ADD COLUMN IF NOT EXISTS
  ai_token_tier_config JSONB;

-- Extend api_call_logs table
ALTER TABLE api_call_logs ADD COLUMN IF NOT EXISTS
  tokens_consumed INTEGER;

ALTER TABLE api_call_logs ADD COLUMN IF NOT EXISTS
  token_cost_breakdown JSONB;

-- Add token transaction history
CREATE TABLE IF NOT EXISTS token_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES teacher_profiles(id),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('api_usage', 'purchase', 'refund', 'adjustment')),
  tokens_delta INTEGER NOT NULL, -- Positive = credits, negative = debits
  balance_before BIGINT,
  balance_after BIGINT,
  reference_id UUID, -- api_call_logs.id for usage
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_token_transactions_teacher ON token_transactions(teacher_id);
CREATE INDEX idx_token_transactions_created ON token_transactions(created_at DESC);

-- Materialized view for token usage analytics
CREATE MATERIALIZED VIEW IF NOT EXISTS token_usage_analytics AS
SELECT 
  teacher_id,
  DATE_TRUNC('day', created_at) AS day,
  SUM(CASE WHEN transaction_type = 'api_usage' THEN -tokens_delta ELSE 0 END) AS tokens_used,
  COUNT(*) FILTER (WHERE action = 'generate') AS generates,
  COUNT(*) FILTER (WHERE action = 'regenerate') AS regenerates,
  COUNT(*) FILTER (WHERE action = 'analyze') AS analyzes
FROM token_transactions
GROUP BY teacher_id, DATE_TRUNC('day', created_at)
ORDER BY day DESC;
```

---

## 🎯 Implementation Strategy

### Phase 1: Infrastructure (Current)
- ✅ Subscription tiers defined
- ✅ API call logging in place
- ✅ Usage tracking setup

### Phase 2: Token Conversion
1. Migrate existing API calls to token tracking
2. Define token costs per operation
3. Update `logApiCall()` to `logTokenUsage()`
4. Display token costs in UI

### Phase 3: Token Sales
1. Add Stripe integration for token purchase
2. Create "buy tokens" flow
3. Implement token top-up mechanism
4. Add usage forecasting

### Phase 4: Advanced Features
1. Token rollover (unused tokens carry to next month)
2. Token sharing across team members
3. Token usage alerts and recommendations
4. Historical usage trends and projections

---

## 🔄 Token Usage Flow

```typescript
// src/hooks/useTokenTracking.ts

import { calculateTokenCost } from '../config/tokenCosts';
import { logApiCall } from '../services/teacherSystemService';

export function useTokenTracking(teacherId: string) {
  const logTokenUsage = async (
    action: string,
    params: Record<string, number>,
    assignmentId?: string
  ) => {
    const tokensCost = calculateTokenCost(action as any, params);

    try {
      await logApiCall(teacherId, action, tokensCost, assignmentId, 'success');
      
      // Show toast with token usage
      console.log(`🎯 Used ${tokensCost} tokens for ${action}`);
    } catch (error) {
      console.error('Failed to log token usage:', error);
    }
  };

  return { logTokenUsage };
}

// Usage in component
export function AssignmentGenerator() {
  const { logTokenUsage } = useTokenTracking(teacherId);

  async function handleGenerate() {
    try {
      const assignment = await generateAssignment({
        questionCount: 10,
        includeRubric: true,
        includeAnalytics: true,
      });

      // Log token usage
      await logTokenUsage('generate', {
        questionCount: 10,
        includeRubric: 1,
        includeAnalytics: 1,
      }, assignment.id);
    } catch (error) {
      console.error('Generation failed:', error);
    }
  }

  return <button onClick={handleGenerate}>Generate</button>;
}
```

---

## 💰 Token Purchasing System

### Stripe Integration

```typescript
// src/services/stripeService.ts

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function createTokenPurchaseCheckout(
  teacherId: string,
  tokenPackage: 'starter' | 'pro' | 'team' | 'enterprise'
): Promise<string> {
  const packages = {
    starter: { tokens: 5000, price: 4900 }, // $49
    pro: { tokens: 25000, price: 19900 }, // $199
    team: { tokens: 100000, price: 69900 }, // $699
    enterprise: { tokens: 500000, price: 249900 }, // $2499
  };

  const pkg = packages[tokenPackage];

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${pkg.tokens.toLocaleString()} AI Tokens`,
            description: `Purchase ${pkg.tokens} tokens for AI operations`,
          },
          unit_amount: pkg.price,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${process.env.FRONTEND_URL}/dashboard?tokens_purchased=true`,
    cancel_url: `${process.env.FRONTEND_URL}/dashboard`,
    metadata: {
      teacherId,
      tokens: pkg.tokens,
    },
  });

  return session.url!;
}

// Webhook handler for successful payment
export async function handlePaymentSuccess(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;
  const { teacherId, tokens } = session.metadata!;

  // Add tokens to teacher account
  await addTokensToTeacher(teacherId, parseInt(tokens));
  
  // Log transaction
  await recordTokenTransaction(teacherId, 'purchase', parseInt(tokens), `Token purchase via Stripe`);
}
```

---

## 📊 Token Usage Dashboard

Future component to show teachers their token usage:

```typescript
// src/components/TeacherSystem/TokenDashboard.tsx

export function TokenDashboard({ teacherId }: { teacherId: string }) {
  const [usage, setUsage] = useState<TokenUsageData | null>(null);

  return (
    <div className="token-dashboard">
      {/* Current Balance */}
      <div className="token-balance">
        <h2>Current Balance</h2>
        <div className="balance-large">{usage?.tokensAvailable}</div>
        <p>{usage?.tokensUsedThisMonth} used this month</p>
      </div>

      {/* Usage Breakdown */}
      <div className="usage-breakdown">
        <h3>Token Usage This Month</h3>
        <div className="breakdown-chart">
          {/* Pie chart or bar chart showing:
              - Generate: X tokens (Y%)
              - Analyze: X tokens (Y%)
              - Regenerate: X tokens (Y%)
              - etc.
          */}
        </div>
      </div>

      {/* Buy Tokens */}
      <div className="buy-tokens">
        <h3>Buy More Tokens</h3>
        <div className="token-packages">
          <button onClick={() => purchaseTokens('starter')}>
            5,000 tokens - $49
          </button>
          <button onClick={() => purchaseTokens('pro')}>
            25,000 tokens - $199 (Save 17%)
          </button>
          {/* More packages */}
        </div>
      </div>

      {/* Usage Forecast */}
      <div className="usage-forecast">
        <h3>Projected Usage</h3>
        <p>
          At current pace, you'll use {usage?.projectedMonthlyUsage} tokens by end of month.
          {usage?.projectedMonthlyUsage > usage?.tokensAvailable && (
            <strong> You may run out of tokens.</strong>
          )}
        </p>
      </div>

      {/* Recent Transactions */}
      <div className="token-history">
        <h3>Recent Transactions</h3>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Action</th>
              <th>Tokens</th>
              <th>Balance</th>
            </tr>
          </thead>
          <tbody>
            {usage?.recentTransactions.map(tx => (
              <tr key={tx.id}>
                <td>{new Date(tx.createdAt).toLocaleDateString()}</td>
                <td>{tx.description}</td>
                <td className={tx.tokensDelta > 0 ? 'credit' : 'debit'}>
                  {tx.tokensDelta > 0 ? '+' : ''}{tx.tokensDelta}
                </td>
                <td>{tx.balanceAfter}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

---

## 🚨 Token Quota Enforcement

Update limit checking to use tokens:

```typescript
// Modified from getResourceLimitStatus()

export async function getTokenStatus(teacherId: string) {
  const account = await getTeacherAccount(teacherId);
  if (!account) throw new Error('Account not found');

  return {
    tier: account.subscription.tier,
    tokensAvailable: account.apiUsage.callsRemaining, // Rename to tokensAvailable
    tokensUsedThisMonth: account.apiUsage.totalCalls,
    percentageUsed: (account.apiUsage.totalCalls / tierLimits.monthlyTokenLimit) * 100,
    canUseTokens: account.apiUsage.callsRemaining > 0,
    resetDate: account.apiUsage.resetDate,
  };
}

// In component
async function handleGenerateAssignment() {
  const status = await getTokenStatus(teacherId);

  if (!status.canUseTokens) {
    showModal({
      title: 'Out of Tokens',
      message: 'You\'ve used all your tokens this month.',
      actions: [
        { label: 'Buy More', onClick: () => purchaseTokens() },
        { label: 'Upgrade Plan', onClick: () => upgradePlan() },
      ],
    });
    return;
  }

  // Proceed with generation
  await generateAndTrackTokens('generate', params);
}
```

---

## 📈 Token Analytics

Track trends and help teachers optimize:

```typescript
// Future: Token usage insights

export function getTokenInsights(teacherId: string) {
  // Calculate:
  - Average tokens per assignment
  - Most expensive operations
  - Day-of-week patterns
  - Recommendations for optimization
  
  // Return personalized insights like:
  // "Your 'analyze' operations average 15 tokens. 
  //  By limiting to 2 persona simulations, you'd save 8 tokens each. 
  //  This could save ~240 tokens/month."
}
```

---

## 🎯 Roadmap

```
2026 Q1: Token infrastructure (✓ done)
2026 Q2: Token sales system integration
2026 Q3: Advanced analytics & forecasting
2026 Q4: Team-level token pooling
```

---

## References

- [Stripe Billing Documentation](https://stripe.com/docs/billing)
- [Token-based pricing best practices](https://stripe.com/resources/more/token-based-pricing)
- Implementation code in this repository
