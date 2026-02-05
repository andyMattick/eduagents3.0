# Debugging: "I only see assignment upload"

I've added enhanced logging to help diagnose the issue. Here's what to do:

## 1. Open the App
- Go to: **http://localhost:3000**
- You should see the "📝 Teacher's Assignment Studio" welcome screen

## 2. Click "Get Started"
- You'll see either:
  - Upload File tab (📄)
  - Generate with AI tab (🤖)

## 3. Upload a Test File
- Try uploading any `.txt`, `.pdf`, or `.docx` file with some content
- Click "✓ Continue"

## 4. Check Browser Console (This is CRITICAL)
- Press **F12** to open Developer Tools
- Click **Console** tab
- Look for these logs in order:

### Expected Log Sequence:
```
✅ Continue clicked, submitting content { valueLength: 123, ... }
📤 handleDirectUpload called with content length: 123
📤 handleDirectUpload: Calling analyzeTextAndTags...
📖 analyzeTextAndTags: Starting analysis { textLength: 123, subject: 'General' }
🎯 Asteroids extracted: { count: X, asteroids: [...] }
✅ analyzeTextAndTags: Setting state to PROBLEM_ANALYSIS
✅ State updated successfully
📤 handleDirectUpload: analyzeTextAndTags completed
🔍 PipelineShell render: { step: '3 (PROBLEM_ANALYSIS)', ... }
```

## 5. If You See an Error
- Look for any **red text** in the console
- Copy the error message
- It will also appear in the app as a red banner at the top

## 6. Common Issues to Look For:

### Issue #1: "No asteroids extracted"
- Appears as a yellow warning banner
- **Solution**: Check if your file has recognizable problem statements
  - Problems should start with: `1.`, `2.`, `a)`, `b)`, `-`, or `•`
  - Try uploading a file with more structured content

### Issue #2: Empty Asteroids Array
- Console shows: `{ count: 0, asteroids: [] }`
- **Reason**: File format not recognized or no problems found
- **Solution**: Try a plaintext file with numbered questions

### Issue #3: Step not advancing
- Console shows correct step but UI doesn't update
- **Possible causes**:
  - Browser cache issue → Try Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
  - React state not updating → Check if there are JS errors

## 7. What Should Happen After Upload
After clicking Continue and the logs complete, you should see:
- ✅ Asteroids extracted message
- A new screen titled "📋 Step 3 of 7: Problem Analysis & Metadata"
- A table showing your problems with Bloom levels, complexity scores, etc.

## 8. If It's Still Showing Just "Upload"
This means the state isn't transitioning. Check:
1. No error messages in red banner at top of app
2. Browser console shows the above logs up to the final render
3. If logs stop mid-way → there's an error being thrown

## Paste Console Logs Here
Once you've followed these steps, share:
- The complete console output (copy-paste from the Console tab)
- Whether you see any red error messages
- What file format you used (.txt, .pdf, or .docx)
- The file content (or first few lines if it's long)

This will help me pinpoint the exact issue!
