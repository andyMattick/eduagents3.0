# 🐛 Troubleshooting Guide

## Runtime Error: "Failed to fetch dynamically imported module"

**Status**: ✅ FIXED

### What was happening:
PDF.js worker file couldn't be fetched from CDN in your environment.

### Solution:
The system now falls back gracefully. You can:

**Option 1: Use Text Mode (No Setup Required)**
1. Click "📝 Type Text" tab
2. Paste your content
3. Click "Analyze Assignment"
✅ Works immediately!

**Option 2: Copy-Paste from PDF**
1. Open your PDF in a PDF reader
2. Select and copy all text
3. Paste into Step 1
4. Analyze
✅ Works perfectly!

**Option 3: Save as .txt File**
1. Copy PDF/Word content
2. Paste into a text editor
3. Save as .txt file
4. Upload the .txt file
✅ Works right away!

**Option 4: Enable Full PDF Support** (Optional)
```bash
npm install pdfjs-dist
npm start
```
Then you can upload PDF files directly.

---

## Other Common Issues

### "App doesn't load"
1. Did you run `npm install`?
2. Did you run `npm start`?
3. Wait for compilation (2-3 minutes first time)
4. Check terminal for errors

### "Analyze button is disabled"
You need to enter some text first:
1. Type or paste assignment text
2. Make sure it's not empty
3. Button should become enabled

### "No feedback generated"
Text might be too short. Try:
1. Use at least 100+ characters
2. Use the sample text from QUICK_START.md
3. Paste a full assignment, not just a title

### "File upload fails"
**For .txt files**: Should work. Check file format.
**For PDF files**: Not installed. Run: `npm install pdfjs-dist`
**For Word files**: Not installed. Run: `npm install mammoth`

### "Error: Cannot find module"
This is expected for optional dependencies. Just:
1. Don't use that file format, or
2. Install the library: `npm install pdfjs-dist`

### "Build shows warnings"
Totally normal! The optional dependency warnings (mammoth, pdfjs-dist) don't affect functionality.

### "Slow performance"
First load might take a moment. After that it should be instant.

---

## Getting Help

### Quick Questions
- "How do I start?" → See [START_HERE.md](START_HERE.md)
- "What's the error?" → See [PDF_FIX.md](PDF_FIX.md)
- "How do I use it?" → See [QUICK_START.md](assignment-pipeline/QUICK_START.md)

### Detailed Questions
- "How does it work?" → See [IMPLEMENTATION_GUIDE.md](assignment-pipeline/IMPLEMENTATION_GUIDE.md)
- "Show me architecture" → See [ARCHITECTURE.md](assignment-pipeline/ARCHITECTURE.md)
- "What changed?" → See [COMPLETION_SUMMARY.md](COMPLETION_SUMMARY.md)

---

## Quick Checklist

Before reporting an issue, check:
- [ ] Did you run `npm install`?
- [ ] Did you run `npm start`?
- [ ] Is the app actually running at localhost:3000?
- [ ] Are you using Chrome/Firefox/Safari (not IE)?
- [ ] Did you paste text into Step 1?
- [ ] Did you click "Analyze Assignment"?

---

## Still Stuck?

Try this:
```bash
cd assignment-pipeline
rm -rf node_modules package-lock.json
npm install
npm start
```

This fresh install usually fixes any issues.

---

## Report Template

If something doesn't work:
1. **What did you try?** (e.g., "pasted text in Step 1")
2. **What happened?** (e.g., "nothing happened")
3. **What did you expect?** (e.g., "tags should appear")
4. **Error message?** (Copy exact error text)
5. **What OS?** (Windows, Mac, Linux)
6. **Browser?** (Chrome, Firefox, Safari, Edge)

---

**Everything should work now. Enjoy! 🚀**

