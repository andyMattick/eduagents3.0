# AI Services: Mock vs Real Toggle System

## Overview

The application now supports **dual AI modes** for flexible testing and production use:

- **Mock AI** 🔄 - Instant synthetic responses for UI/UX testing
- **Real AI** ✨ - Google Generative AI (Gemini) for authentic analysis and generation

Users can toggle between modes at runtime via the **AI Settings button** (top-right corner).

---

## Quick Start

### 1. Environment Setup

Your API key is stored in `.env.local` (NOT in git):

```env
VITE_AI_MODE=real
VITE_GOOGLE_API_KEY=your_actual_key_here
```

⚠️ **IMPORTANT**: Replace `your_actual_key_here` with your real Google API key in `.env.local` (never commit this file)

### 2. Using in Components

#### Mock AI (Testing)

```typescript
import { getAnalyzerService } from '../config/aiConfig';

const analyzer = getAnalyzerService(); // Returns mock or real based on settings
const result = await analyzer.analyze(assignmentText);
// Returns: { bloomDistribution, complexity, pacing, accessibility, etc. }
```

#### Real AI (Production)

Same code! The service automatically uses Gemini API if configured and enabled.

### 3. Runtime Toggle

Users click **⚙️ AI Settings** (top-right) to toggle between:
- Mock AI → Instant responses for demos
- Real AI → Actual Gemini analysis

No page reload needed (automatic reload happens).

---

## Architecture

### Config System (`src/config/aiConfig.ts`)

```
┌─────────────────────────────────────────┐
│   getAIConfig()                         │
│   - Reads env variables                 │
│   - Returns { mode, googleApiKey, ... } │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│   getCurrentAIMode()                    │
│   - Checks localStorage for override    │
│   - Returns: 'mock' | 'real'            │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│   getAIService(type)                    │
│   - Returns appropriate service         │
│     → Mock or Real based on mode        │
└─────────────────────────────────────────┘
           ↓
┌──────────────────┬──────────────────────┐
│   Mock Service   │   Real Service       │
│   (synthetic)    │   (Gemini API)       │
└──────────────────┴──────────────────────┘
```

### Mock AI Service

**File**: `src/config/aiConfig.ts` - `getMockAIService()`

Features:
- ✅ Instant responses (800ms-1200ms simulated delay)
- ✅ Realistic response structure
- ✅ Doesn't require API key
- ✅ Perfect for UI testing and demos
- ✅ Hardcoded, deterministic responses

**Response Example**:
```json
{
  "bloomDistribution": {
    "Remember": 0.2,
    "Understand": 0.3,
    "Apply": 0.25,
    "Analyze": 0.15,
    "Evaluate": 0.07,
    "Create": 0.03
  },
  "averageComplexity": 0.6,
  "pacingIssues": ["Assignment may be too long"],
  "accessibility": ["Good contrast", "Some complex vocabulary"],
  "overallScore": 0.78,
  "recommendations": ["Add more Apply-level questions"]
}
```

### Real AI Service

**File**: `src/config/aiConfig.ts` - `getRealAIService()`

Uses: **Google Generative AI API (Gemini)**

**Analyzer**:
- Analyzes assignment text for Bloom distribution
- Evaluates complexity, pacing, accessibility
- Uses natural language prompts for accuracy

**Writer**:
- Generates pedagogically sound problems
- Respects Bloom level goals
- Creates varied, novel problem types

**Features**:
- ✅ Genuine AI analysis
- ✅ Requires API key + internet
- ✅ Higher latency (~2-5 seconds typical)
- ✅ Automatic fallback to mock on error
- ✅ Robust error handling

---

## Usage Examples

### Example 1: Analyze an Assignment

```typescript
import { getAnalyzerService } from '../config/aiConfig';

async function handleAnalyzeClick(assignmentText: string) {
  try {
    const analyzer = getAnalyzerService();
    const analysis = await analyzer.analyze(assignmentText);
    
    updateUI({
      bloomChart: analysis.bloomDistribution,
      score: analysis.overallScore,
      recommendations: analysis.recommendations,
    });
  } catch (error) {
    showError('Analysis failed: ' + error.message);
  }
}
```

### Example 2: Generate Problems

```typescript
import { getWriterService } from '../config/aiConfig';

async function handleGenerateClick(goal: string, topic: string) {
  try {
    const writer = getWriterService();
    const generated = await writer.generate(topic, {
      'Apply': 0.4,
      'Analyze': 0.3,
      'Create': 0.3,
    }, 5);
    
    addProblemsToAssignment(generated.problems);
  } catch (error) {
    showError('Generation failed: ' + error.message);
  }
}
```

### Example 3: Check Current Mode

```typescript
import { getCurrentAIMode, useRealAI } from '../config/aiConfig';

function showStatus() {
  const mode = getCurrentAIMode(); // 'mock' | 'real'
  const isReal = useRealAI();      // boolean
  
  console.log(`AI Mode: ${mode}`);
  console.log(`Using Real AI: ${isReal}`);
}
```

---

## Settings UI

**Location**: Top-right corner of the app

**Features**:
- 🔄 **Mock AI Option**
  - Instant responses
  - No API needed
  - Good for demos

- ✨ **Real AI Option**
  - Actual Gemini analysis
  - Requires API key
  - Grayed out if no key configured

- 📊 **Status Badge**
  - Shows current mode
  - Real-time status

- 🔍 **Debug Info** (expandable)
  - API key status
  - Current mode
  - Environment variables

---

## Troubleshooting

### Problem: Real AI Not Working

**Check**:
1. Is `VITE_GOOGLE_API_KEY` set in `.env.local`?
2. Is the API key valid? (Check https://makersuite.google.com/app/apikey)
3. Is internet connection available?
4. Check browser console for error messages

**Fallback**: Automatically falls back to mock AI on error

### Problem: Can't Toggle Modes

**Check**:
1. Is the ⚙️ AI Settings button visible (top-right)?
2. Try refreshing the page after toggle (automatic reload)
3. Check localStorage: `localStorage.getItem('aiMode')`

### Problem: Slow Responses

Real AI takes 2-5 seconds per request. This is normal.
- Use Mock AI for rapid UI testing
- Use Real AI for final results

---

## Files Created/Modified

### New Files:
- ✅ `src/config/aiConfig.ts` - Core config and services (450 lines)
- ✅ `src/components/AISettings.tsx` - Settings UI (160 lines)
- ✅ `src/components/AISettings.css` - Styling (300 lines)
- ✅ `.env.example` - Documentation
- ✅ `.env.local` - API key (in .gitignore)
- ✅ `src/agents/ai/aiAnalyzerService.ts` - Helper functions
- ✅ `src/agents/ai/aiWriterService.ts` - Helper functions

### Modified Files:
- ✅ `src/App.tsx` - Added AISettings component
- ✅ `.gitignore` - Already had `.env.local`

---

## Next Steps

### Ready to Integrate:

1. **Analyzer Integration** - Call in analysis components
   ```typescript
   const analysis = await getAnalyzerService().analyze(text);
   ```

2. **Writer Integration** - Call in generation components
   ```typescript
   const problems = await getWriterService().generate(topic, goals, count);
   ```

3. **Phase 3 Integration** - Feed system prompts based on goal+source behavior spec

### Testing Recommendations:

1. **Test Mock AI First**
   - Fast iteration
   - No API limits
   - Deterministic responses

2. **Then Real AI**
   - Verify API key works
   - Check response quality
   - Monitor latency

3. **Test Fallback**
   - Disable API key temporarily
   - Verify mock fallback works
   - Check error messages

---

## API Reference

### `getAIConfig()`
Returns: `{ mode: AIMode, googleApiKey?: string, useRealAI: boolean }`

### `getCurrentAIMode()`
Returns: `'mock' | 'real'`

### `setAIMode(mode: AIMode)`
Changes mode and reloads page

### `useRealAI()`
Returns: `boolean` - Is real AI currently active?

### `getAIService(type: 'analyzer' | 'writer')`
Returns: Service object with appropriate methods

### `getAnalyzerService()`
Returns: Analyzer with `.analyze(text)` method

### `getWriterService()`
Returns: Writer with `.generate(topic, bloomGoals, count)` method

---

## Environment Variables

### Production (.env.local)
```env
VITE_AI_MODE=real
VITE_GOOGLE_API_KEY=your_actual_key_here
```

### Development (via .env.example)
```env
VITE_AI_MODE=mock
VITE_GOOGLE_API_KEY=your_api_key_here
```

---

## Security Notes

✅ **API key is safe**:
- Stored in `.env.local` (not in git)
- Only available in build/dev process
- Not exposed in client code (Vite inlines at build time)

⚠️ **Warning**:
- Don't commit `.env.local`
- Don't share API keys
- Regenerate key if accidentally exposed

---

## Support

For questions or issues:
1. Check browser console (F12 → Console)
2. Expand "🔍 Debug Information" in AI Settings
3. Verify API key and internet connection
4. Try switching between mock/real modes
