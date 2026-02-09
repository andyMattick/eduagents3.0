# Teacher System Implementation Guide

## Overview

This guide walks you through implementing the complete teacher account system with assignment storage, API usage limits, and a question bank. The system supports tiered subscriptions (Free, Pro, Enterprise, Custom) and is designed for future expansion with AI token tiers.

---

## 📋 System Architecture

### Data Models

All data models are defined in `src/types/teacherSystem.ts`:

- **TeacherAccount**: Subscription tier, API usage, assignment count
- **AssignmentSummary** / **AssignmentDetail**: Stored assignments with versions
- **QuestionBankEntry**: Reusable questions with metadata
- **ApiUsage**: Real-time API call tracking
- **SubscriptionTier**: Free, Pro, Enterprise, Custom configurations

### API Services

**`src/services/teacherSystemService.ts`** provides:
- `createTeacherAccount()` - New teacher registration
- `saveAssignment()` - Store/update assignments
- `getResourceLimitStatus()` - Check quotas
- `addToQuestionBank()` - Save questions
- `searchQuestionBank()` - Filter questions
- `logApiCall()` - Track usage

**`src/services/authService.ts`** provides:
- `signUp()` / `login()` - Authentication
- `logout()` - Session cleanup
- `validateSession()` - JWT/session validation
- `signInWithGoogle()` / `signInWithMicrosoft()` - OAuth

### Database Schema

SQL migrations in `supabase/migrations/001_teacher_system_schema.sql` create:
- `teacher_profiles` - User identity
- `teacher_accounts` - Subscription & usage
- `assignments` - Assignment storage
- `question_bank` - Reusable questions
- `api_call_logs` - Usage tracking
- Views for dashboard queries
- RLS policies for security

---

## 🚀 Implementation Steps

### Step 1: Configure Environment Variables

Create `.env.local`:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SUPABASE_SERVICE_KEY=your-service-key  # For server functions

# Optional: Stripe Configuration (for subscriptions)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

# Optional: Auth providers
VITE_GOOGLE_CLIENT_ID=...
VITE_MICROSOFT_CLIENT_ID=...
```

### Step 2: Set Up Supabase

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** → **New Query**
3. Copy contents of `supabase/migrations/001_teacher_system_schema.sql`
4. Run the migration
5. Enable Email Authentication in Auth settings
6. (Optional) Configure Google/Microsoft OAuth

### Step 3: Initialize Services

Add initialization code to your main app file (`src/App.tsx`):

```typescript
import { initializeSupabase } from './services/teacherSystemService';

// Initialize Supabase on app load
initializeSupabase();
```

### Step 4: Create Authentication Flow

```typescript
// Login page
import { login, signUp } from './services/authService';

async function handleLogin(email: string, password: string) {
  const session = await login({ email, password });
  localStorage.setItem('session_token', session.sessionToken);
  // Redirect to dashboard
}

async function handleSignUp(email: string, password: string, name: string) {
  const account = await signUp({ email, password, name });
  // Email verification required (optional)
}
```

### Step 5: Add Dashboard Component

```typescript
import TeacherDashboard from './components/TeacherSystem/TeacherDashboard';

function App() {
  const teacherId = getCurrentTeacherId(); // From auth context
  
  return (
    <TeacherDashboard 
      teacherId={teacherId}
      onNavigate={(page, data) => {
        // Handle navigation to create, edit, question bank, etc.
      }}
    />
  );
}
```

### Step 6: Integrate API Usage Tracking

```typescript
import { useApiUsageTracking } from './hooks/useApiUsageTracking';

function AssignmentEditor({ teacherId }) {
  const { logApiAction, limits, canCallApi } = useApiUsageTracking({
    teacherId,
    onLimitExceeded: () => alert('API quota exceeded'),
    onWarning: (pct) => console.warn(`${pct}% usage`),
  });

  async function generateAssignment() {
    if (!canCallApi) {
      alert('API quota exceeded. Please upgrade.');
      return;
    }

    try {
      // Call your AI service
      await logApiAction('generate', assignmentId, 1);
    } catch (err) {
      // Handle error
    }
  }

  return (
    <div>
      <ApiUsageBanner limits={limits} onUpgrade={() => navigate('/upgrade')} />
      <button onClick={generateAssignment} disabled={!canCallApi}>
        Generate Assignment
      </button>
    </div>
  );
}
```

### Step 7: Add Question Bank UI

```typescript
import QuestionBank from './components/TeacherSystem/QuestionBank';

function Assignment() {
  const [showQuestionBank, setShowQuestionBank] = useState(false);

  return (
    <>
      <button onClick={() => setShowQuestionBank(true)}>
        Browse Question Bank
      </button>
      
      {showQuestionBank && (
        <QuestionBank
          teacherId={teacherId}
          isModal={true}
          onSelectQuestion={(q) => addQuestionToAssignment(q)}
          onClose={() => setShowQuestionBank(false)}
        />
      )}
    </>
  );
}
```

---

## 🔌 Integration Points with Existing Code

### Update usePipeline Hook

Integrate API usage tracking into your existing pipeline:

```typescript
// src/hooks/usePipeline.ts

import { useApiUsageTracking } from './useApiUsageTracking';

export function usePipeline(teacherId?: string) {
  const { logApiAction, limits, canCallApi } = teacherId 
    ? useApiUsageTracking({ teacherId })
    : { logApiAction: null, limits: null, canCallApi: true };

  async function analyzeTextAndTags(text: string) {
    if (teacherId && !canCallApi) {
      throw new Error('API quota exceeded');
    }

    const result = await analyzeTags(text);
    
    if (teacherId && logApiAction) {
      await logApiAction('analyze');
    }

    return result;
  }

  // ... rest of pipeline
}
```

### Intercept AI Service Calls

Wrap AI service calls with usage tracking:

```typescript
// src/agents/api/aiService.ts

const originalGenerateAssignment = generateAssignment;

export async function generateAssignmentWithTracking(
  metadata: AssignmentMetadata,
  teacherId?: string
) {
  if (teacherId) {
    const { logApiCall } = await import('../services/teacherSystemService');
    await logApiCall(teacherId, 'generate', 1);
  }

  return originalGenerateAssignment(metadata);
}
```

### Add Assignment Storage After Generation

```typescript
// After generating assignment
import { saveAssignment } from './services/teacherSystemService';

async function handleGeneratedAssignment(generated: GeneratedAssignment, teacherId: string) {
  const detail: AssignmentDetail = {
    id: uuid(),
    teacherId,
    title: generated.metadata.title,
    // ... map other fields
  };

  await saveAssignment(teacherId, detail);
}
```

---

## 💰 Subscription Tier Configuration

Each tier is defined in `SUBSCRIPTION_TIERS`:

```typescript
export const SUBSCRIPTION_TIERS: Record<SubscriptionTier, SubscriptionTierConfig> = {
  free: {
    tier: 'free',
    displayName: 'Free',
    monthlyApiLimit: 50,
    maxAssignments: 5,
    maxQuestionsPerAssignment: 10,
    questionBankEnabled: false,
    advancedAnalyticsEnabled: false,
    prioritySupport: false,
    priceMonthly: 0,
  },
  pro: {
    tier: 'pro',
    displayName: 'Pro',
    monthlyApiLimit: 500,
    maxAssignments: 50,
    maxQuestionsPerAssignment: 100,
    questionBankEnabled: true,
    advancedAnalyticsEnabled: true,
    prioritySupport: false,
    priceMonthly: 29,
  },
  // ... enterprise and custom
};
```

### Updating Subscriptions

```typescript
import { updateSubscriptionTier } from './services/teacherSystemService';

async function upgradeToPro(teacherId: string, stripePaymentMethodId: string) {
  const account = await updateSubscriptionTier(teacherId, 'pro', stripePaymentMethodId);
  // Show success message
}
```

---

## 📊 Monitoring API Usage

### View Monthly Usage Report

```typescript
// Supabase SQL
SELECT * FROM monthly_api_usage_reports
WHERE teacher_id = '...' AND month = '2026-02'
ORDER BY month DESC;
```

### Check Real-time Usage

```typescript
const limits = await getResourceLimitStatus(teacherId);
console.log(`Usage: ${limits.apiCallLimit.current}/${limits.apiCallLimit.max}`);
```

---

## 🔐 Security & Access Control

### Row-Level Security (RLS)

All tables have RLS policies enabled. Teachers can only:
- Read/update their own profile
- Create/read/update/delete their assignments
- Access their question bank
- View their API logs

### Session Validation

```typescript
// Validate user before serving data
const session = await validateSession(sessionToken);
if (!session) {
  // Unauthorized
  return 401;
}

const teacherId = session.userId;
```

---

## 🎨 UI Component Usage

### Dashboard

```typescript
<TeacherDashboard 
  teacherId={userId}
  onNavigate={(page) => handleNavigation(page)}
/>
```

**Features:**
- Assignments list with status filtering
- Quick stats
- API usage visualization
- Assignment creation button
- Quick action links

### Question Bank

```typescript
<QuestionBank 
  teacherId={userId}
  isModal={true}
  onSelectQuestion={(q) => addQuestion(q)}
  onClose={handleClose}
/>
```

**Features:**
- Filter by Bloom level, subject, grade
- Search functionality
- Favorite/unfavorite questions
- Preview pane
- Usage statistics

### API Usage Banner

```typescript
<ApiUsageBanner
  limits={resourceLimits}
  onUpgrade={() => navigate('/upgrade')}
  onDismiss={() => hideBanner()}
/>
```

**States:**
- Normal (green): < 70% used
- Warning (orange): 70-90% used
- Critical (red): > 90% used
- Disabled (red): 100% used

---

## 📈 Future Enhancements

### AI Token Tiers

The system is designed to support token-based pricing:

```typescript
export interface AiTokenTierConfig extends SubscriptionTierConfig {
  monthlyTokenLimit: number;
  costPerToken: number;
  tokenResetDay: number; // Day of month
}
```

### Monitoring & Alerts

Create a Supabase function to:
- Monitor daily API usage
- Send warning emails at 70% and 90%
- Automatically disable features at 100%
- Generate monthly usage reports

### Usage Analytics Dashboard

```typescript
// Future: Detailed analytics page
- Daily usage trend
- Action breakdown (generate vs analyze vs rewrite)
- Assignment performance metrics
- Cost projections
```

---

## 🐛 Troubleshooting

### Issue: "Missing Supabase environment variables"

**Solution:** Ensure `.env.local` has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

### Issue: "Authorization policy violation"

**Solution:** Check RLS policies. Ensure user is authenticated and owns the resource.

### Issue: API calls not being logged

**Solution:** Call `logApiAction()` after each AI service invocation. Verify teacher ID is passed.

### Issue: Question bank disabled on Pro tier

**Solution:** Verify `questionBankEnabled: true` in tier config and user subscription is actually Pro.

---

## 📚 API Reference

### Teacher System Service

```typescript
// Teacher management
createTeacherAccount(email, name, schoolName)
getTeacherAccount(teacherId)
updateSubscriptionTier(teacherId, newTier, paymentMethodId)

// Assignments
saveAssignment(teacherId, assignment)
getAssignment(assignmentId, teacherId)
listAssignments(teacherId, status?)
deleteAssignment(assignmentId, teacherId)
cloneAssignment(sourceId, teacherId, newTitle)

// Question Bank
addToQuestionBank(teacherId, assignmentId, sectionId, problem, tags, notes)
searchQuestionBank(teacherId, filters?)
updateQuestionBankEntry(entryId, teacherId, updates)

// Usage Tracking
logApiCall(teacherId, action, cost, assignmentId?, status, errorMessage?)
getResourceLimitStatus(teacherId)
```

### Auth Service

```typescript
signUp(request)
login(request)
logout(sessionToken)
requestPasswordReset(email)
resetPassword(request)
getCurrentUser()
validateSession(sessionToken)
signInWithGoogle()
signInWithMicrosoft()
```

---

## 🎯 Next Steps

1. **Configure Supabase** - Set up project and run migrations
2. **Add environment variables** - Fill .env.local
3. **Test authentication** - Create account, login
4. **Integrate with existing pipeline** - Wrap AI calls with tracking
5. **Add UI to app** - Import dashboard and banner components
6. **Test quotas** - Verify limits are enforced
7. **Setup subscription** - Integrate with Stripe for Pro tier

---

## 📧 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Supabase documentation: https://supabase.com/docs
3. Check existing errors in browser DevTools
4. Verify database schema was applied: Check "Tables" in Supabase dashboard
