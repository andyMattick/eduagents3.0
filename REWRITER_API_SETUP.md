# 🚀 REWRITER API SETUP GUIDE

**Status:** Production Ready  
**Last Updated:** 2026-02-12  
**Environments:** Dev + Production (Vercel)

---

## Quick Start: Enable Rewriter API

### ✅ Option 1: Development Mode (Local)

**1. Get API Key**
```
Go to: https://makersuite.google.com/app/apikey
Register or login with Google
Create API key
Copy to clipboard
```

**2. Configure Environment**
```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
# ← Add your Google Gemini API key
GOOGLE_API_KEY=AIzaSy...

# ← Add Supabase config
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...

SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJxxx...

# ← Enable the Rewriter
VITE_REWRITER_ENABLED=true
```

**3. Install Dependencies**
```bash
npm install -D @vercel/node
```

**4. Run Dev Server**
```bash
npm run dev
```

This starts both:
- Frontend (port 5173)
- Backend handlers (port 5173/api)

**5. Test Login as Admin**
- Go to http://localhost:5173
- Sign up or login
- In Supabase: Go to Auth → User → Edit user
- In "User Metadata" add:
  ```json
  { "role": "admin" }
  ```
- Reload the app
- Rewriter button should be enabled

---

### ✅ Option 2: Production (Vercel) — ALREADY CONFIGURED

**✅ GOOGLE_API_KEY is already set in Vercel project settings**

Just deploy:
```bash
git push origin dev  # Vercel auto-deploys
```

**That's it!** The Rewriter API is live on production.

---

## What the Rewriter Does

### Security
✅ **Frontend has NO API key** — Can't see it  
✅ **API key only on backend** — Hidden from users  
✅ **Auth check required** — Admin role only  
✅ **JWT verification** — Via Supabase session  

### Flow
```
Teacher selects feedback
    ↓
Clicks "Rewrite"
    ↓
Frontend sends RewriteRequest to /api/rewrite
    ↓
Backend verifies admin auth
    ↓
Backend calls Claude API (using ANTHROPIC_API_KEY)
    ↓
Claude returns rewritten problems
    ↓
Backend returns RewriteResponse to frontend
    ↓
Teacher sees comparison
```

---

## Development Testing

### Test 1: Verify API Key is Working

**In your code (for testing only):**
```typescript
// Try the API
const response = await fetch('/api/rewrite', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${yourToken}`,
  },
  body: JSON.stringify({
    documentId: 'test',
    version: 1,
    problems: [{
      ProblemId: 'p1',
      BloomLevel: 'Apply',
      LinguisticComplexity: 0.5,
      EstimatedTimeMinutes: 3,
      Content: 'Sample problem',
    }],
    selectedFeedback: [{
      feedbackId: 'fb1',
      affectedProblems: ['p1'],
      recommendation: 'Clarify wording'
    }],
    teacherNotes: [],
    clusterReport: {},
    simulationSummary: {},
    generationContext: {
      gradeBand: '6-8',
      classLevel: 'mixed',
      subject: 'math',
      timeTargetMinutes: 45,
    }
  })
});

const result = await response.json();
console.log(result);
```

### Test 2: Verify Admin Auth

If you get `403 Forbidden`:
- Check you're logged in
- Check Supabase user metadata has `{ "role": "admin" }`
- Check JWT token is valid

If you get `401 Unauthorized`:
- You're not logged in
- Need to authenticated first

### Test 3: Verify API Key Format

Error: `GOOGLE_API_KEY not configured`?
- Check `.env.local` has the key
- Key must start with `AIzaSy`
- Try a fresh key from makersuite.google.com/app/apikey

---

## File Structure

```
eduagents3.0/
├── api/                         ← Backend (Vercel Functions)
│   └── rewrite.ts               ← Rewriter endpoint
│
├── src/
│   └── services/
│       └── rewriterService.ts   ← Frontend service
│                                  (calls /api/rewrite)
│
├── .env.example
├── .env.local                   (your local secrets - gitignored)
├── vercel.json
└── vite.config.ts
```

---

## Environment Variables Explained

### Frontend (VITE_ prefix)

| Var | Value | Where From |
|-----|-------|-----------|
| `VITE_SUPABASE_URL` | `https://xxxxx.supabase.co` | Supabase project settings |
| `VITE_SUPABASE_ANON_KEY` | `eyJ...` | Supabase API keys |
| `VITE_REWRITER_ENABLED` | `true` | Manual (to enable) |

### Backend (No prefix, Vercel env vars)

| Var | Value | Where From |
|-----|-------|-----------|
| `ANTHROPIC_API_KEY` | `sk-ant-...` | console.anthropic.com |
| `SUPABASE_URL` | `https://xxxxx.supabase.co` | Supabase project settings |
| `SUPABASE_ANON_KEY` | `eyJ...` | Supabase API keys |

---

## Troubleshooting

### "Admin access required"
**Problem:** Getting 403 when trying to rewrite  
**Fix:**
1. Logout and login again
2. Check Supabase user metadata: should have `{ "role": "admin" }`
3. Try incognito window (clear cache)

### "Rewriter not working in production"
**Problem:** Works in dev but not on Vercel  
**Fix:**
1. Verify ANTHROPIC_API_KEY is set in Vercel project settings
2. Check that it's set for Production environment (not Preview)
3. Redeploy after adding env var: `git push origin main`

### "Claude API error: 401"
**Problem:** API key rejected  
**Fix:**
1. Verify key starts with `sk-ant-`
2. Generate fresh key from console.anthropic.com
3. Check for typos in .env.local

### "Authentication required" (in dev)
**Problem:** Token can't be read from localStorage  
**Fix:**
1. Make sure you're logged in first
2. Check browser DevTools → Application → Local Storage
3. Should see `supabase.auth.token`

---

## Admin User Setup (One-Time)

### In Supabase Console

1. Go to: https://app.supabase.com/projects
2. Expand your project
3. Go to: **Auth** → **Users**
4. Find/select your user
5. Click the menu (3 dots) → **Edit User**
6. Scroll to **User Metadata**
7. Add JSON:
   ```json
   {
     "role": "admin"
   }
   ```
8. Click **Save**

Now this user can access /api/rewrite.

---

## Cost Estimate

**Google Gemini API Pricing** (as of Feb 2026):
- Input: $0.075/1M tokens
- Output: $0.30/1M tokens
- Per rewrite: ~4,000 tokens = **~$0.002-0.005**

**Budget Planning:**
- 10 rewrites/day = ~$0.05
- 100 rewrites/month = ~$0.15
- 1000 rewrites/month = ~$1.50

---

## Next Steps

✅ Copy `.env.example` to `.env.local`  
✅ Fill in API keys  
✅ Set admin role in Supabase  
✅ `npm run dev`  
✅ Test rewriter button  
✅ In prod: Add ANTHROPIC_API_KEY to Vercel  
✅ Deploy  

---

## References

- **Google Gemini API:** https://makersuite.google.com/app/apikey
- **Gemini Docs:** https://ai.google.dev/
- **Vercel Functions:** https://vercel.com/docs/functions/serverless-functions
- **Supabase Auth:** https://supabase.com/docs/guides/auth

---

**Status:** ✅ Ready to deploy  
**Support:** Configure ANTHROPIC_API_KEY to enable real Rewriter
