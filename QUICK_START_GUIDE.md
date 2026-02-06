# 🚀 Quick Start Guide: User Flow & Routing System

**Last Updated:** February 6, 2026  
**Status:** Ready for Use

---

## ⚡ 5-Minute Setup

### 1. Install Dependencies
```bash
npm install
```
No additional packages needed! `file-saver` is already in package.json.

### 2. Start Development Server
```bash
npm run dev
```
Visit: `http://localhost:5173`

### 3. Try the New Router
1. Look for the **Pipeline** tab
2. Select **"New Navigation Flow"** from the mode selector dropdown
3. Click **"Create a New Assignment"** or **"Analyze or Refine an Existing Assignment"**
4. Follow the prompts!

---

## 🎯 User Journey (End-to-End)

```
START
  ↓
📍 Step 1: Pick Your Goal
   ├─ ✨ Create a New Assignment
   └─ 🔍 Analyze or Refine Existing

  ↓
📍 Step 2: Do You Have Source Materials?
   ├─ 📁 Yes, I have source documents
   └─ 💡 No, I'll describe my objectives

  ↓
📍 Step 3: Upload Files or Describe
   ├─ Upload source document (PDF, Word, Text)
   └─ Or: Describe topic + select grade + type + Bloom levels

  ↓
📍 Step 4: [Generate/Analyze Assignment]
   └─ (Connected to PipelineShell)

  ↓
📍 Step 5: Review & Export
   ├─ 📄 Export as PDF
   └─ 📝 Export as Word

  ↓
✅ DONE!
```

---

## 🔧 How It Works (Technical)

### State Management
```tsx
import { useUserFlow } from './hooks/useUserFlow';

function MyComponent() {
  const { goal, hasSourceDocs, sourceFile } = useUserFlow();
  const currentRoute = useUserFlow().getCurrentRoute();
  
  // Your code here
}
```

### Adding a New Route
1. Update `useUserFlow` hookif needed
2. Add new component in `src/components/Pipeline/`
3. Modify `PipelineRouter.tsx` to handle new route
4. Add corresponding CSS file with dark mode

---

## 📂 File Locations

### Core System
```
src/
├── hooks/useUserFlow.tsx          ← State management
├── components/Pipeline/
│   ├── GoalSelector.tsx           ← Step 1
│   ├── SourceSelector.tsx         ← Step 2
│   ├── FileUploadComponent.tsx   ← Step 3a
│   ├── IntentCaptureComponent.tsx ← Step 3b
│   ├── PipelineRouter.tsx         ← Orchestrator
│   ├── DocumentReviewExport.tsx  ← Step 5
│   └── ExportButtons.tsx          ← PDF/Word export
└── App.tsx                        ← Integration point
```

### Documentation
```
/
├── ROUTING_ARCHITECTURE_GUIDE.md   ← Deep dive
├── INTEGRATION_GUIDE.md            ← PipelineShell connection
└── ROUTING_IMPLEMENTATION_SUMMARY.md ← Reference
```

---

## 🎨 Customizing Appearance

### Change Brand Colors
Edit CSS variables in any component's CSS file:
```css
/* In any component.css */
--color-accent-primary: #007bff;    /* Main blue */
--color-success: #28a745;           /* Green */
--color-warning: #ffc107;           /* Yellow */
--color-danger: #dc3545;            /* Red */
```

### Adjust Typography
Modify font sizes in component CSS files:
```css
.goal-selector-header h1 {
  font-size: 3rem;        /* Change this */
  font-weight: 700;
}
```

### Dark Mode
Already implemented! System automatically detects preference.
Test with browser dev tools:
```
F12 → Click ⋮ → More tools → Rendering → Emulate CSS media feature prefers-color-scheme
```

---

## ✅ Checklist Before Using

- [ ] Dependencies installed (`npm install`)
- [ ] Dev server running (`npm run dev`)
- [ ] "New Navigation Flow" mode selected in UI
- [ ] Opening browser console (F12) to debug if needed

---

## 🐛 Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| **"useUserFlow must be used in UserFlowProvider"** | Ensure `UserFlowProvider` wraps your app in `App.tsx` |
| **File upload not working** | Check browser console, verify file type and size |
| **Export button not visible** | Make sure `DocumentReviewExport` is rendered |
| **Styling not loading** | Check CSS file import in component |
| **Dark mode not working** | Check if browser has dark mode preference set |

---

## 📖 Next Steps

### For Users
1. **Explore the UI** - Try clicking through the flow
2. **Test file uploads** - Upload a sample PDF or Word doc
3. **Test exports** - Generate PDF and Word files
4. **Check dark mode** - Switch system theme and reload

### For Developers
1. **Read `ROUTING_ARCHITECTURE_GUIDE.md`** - Understand the system
2. **Review component code** - See how things work
3. **Read `INTEGRATION_GUIDE.md`** - Plan PipelineShell connection
4. **Run tests** - `npm test`

### For Integration
1. **Modify `PipelineShell.tsx`** - Accept router props
2. **Auto-populate pipeline** - Parse files on mount
3. **Replace Step 8** - Use `DocumentReviewExport`
4. **Test end-to-end** - Run all 4 user paths
5. **Deploy!** - `npm run build`

---

## 🎓 Key Concepts

### Progressive Disclosure
Each step asks **one question** at a time. This reduces cognitive load and guides users smoothly through the process.

### Context-Aware UI
Descriptions and options change based on previous selections. "Create" and "Analyze" paths show different options at Step 2.

### File Validation
Files are validated before upload:
- ✓ Correct type (PDF, Word, Text)
- ✓ Reasonable size (<25MB)
- ✓ Clear error messages if invalid

### Flexible Export
Users can toggle:
- Show/hide metadata (grade, type, topic)
- Show/hide tips and hints
- Show/hide analytics appendix

---

## 🚀 Example Workflows

### Workflow 1: Create from Textbook
```
1. Click "Create a New Assignment"
2. Click "I have source documents"
3. Drag textbook PDF onto upload zone
4. → Continues to PipelineShell for generation
5. → Shows DocumentReviewExport
6. → Click "Export as PDF"
```

### Workflow 2: Create from Learning Objectives
```
1. Click "Create a New Assignment"
2. Click "I don't have source documents"
3. Fill form: topic, grade, type, Bloom levels
4. → Continues to PipelineShell for generation
5. → Shows DocumentReviewExport
6. → Click "Export as Word"
```

### Workflow 3: Analyze Existing Assignment
```
1. Click "Analyze or Refine an Existing Assignment"
2. Click "I have source documents"
3. Upload source material AND assignment
4. → Continues to PipelineShell for analysis
5. → Shows insights with student feedback
6. → Click "Export as PDF"
```

---

## 📊 Component Tree

```
App
├─ UserFlowProvider
│  └─ AppContent
│     └─ PipelineRouter
│        ├─ GoalSelector
│        ├─ SourceSelector
│        ├─ FileUploadComponent
│        ├─ IntentCaptureComponent
│        ├─ [PipelineShell] (future)
│        │  └─ DocumentReviewExport
│        │     └─ ExportButtons
│        │
│        └─ Error/Loading states
│
└─ TeacherNotepad (existing)
```

---

## 🔌 Integration Hooks

Ready for PipelineShell? Follow `INTEGRATION_GUIDE.md`:

1. **Modify PipelineShell** - Accept flow props
2. **Auto-trigger parsing** - In useEffect
3. **Route to pipeline** - In PipelineRouter
4. **Replace Step 8** - Use DocumentReviewExport
5. **Connect exports** - Wire up PDF/Word buttons

---

## 🎁 Bonus Features

### Drag-and-Drop
Files accept drag-and-drop from desktop!

### File Preview
Shows filename after upload confirmation

### Form Validation
Prevents submission with missing required fields

### Bloom Tooltips
Hover over Bloom levels to see descriptions

### Responsive Design
Works great on phone, tablet, desktop

### Dark Mode
Automatically detects system preference

---

## 💡 Pro Tips

1. **Mobile Testing**: Use iPhone preview in Chrome dev tools to test responsive design
2. **Dark Mode Testing**: F12 → ⋮ → More tools → Rendering → Override CSS preference
3. **Keyboard Navigation**: Tab through form fields instead of clicking
4. **File Explorer Drag**: Drag PDFs from File Explorer directly onto the upload zone
5. **Export Customization**: Toggle metadata/tips before exporting for different audiences

---

## 📞 Help & Support

### Questions About...
- **Architecture** → Read `ROUTING_ARCHITECTURE_GUIDE.md`
- **Integration** → Read `INTEGRATION_GUIDE.md`
- **Components** → Check JSDoc comments in code
- **System overview** → Read `ROUTING_IMPLEMENTATION_SUMMARY.md`

### Running Into Issues?
1. Check browser console (F12) for errors
2. Test in incognito mode (clears cache)
3. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
4. Verify Node/npm versions match project requirements

---

## 📈 Performance Notes

The system is optimized for:
- ✅ Quick file validation
- ✅ Responsive UI (no lag)
- ✅ Smooth dark mode switching (CSS variables)
- ✅ Pagination in document preview (not loading 1000 problems at once)

---

## 🎯 Success Criteria

You'll know it's working when:
1. ✅ Routing buttons work and navigate correctly
2. ✅ File upload shows preview after selection
3. ✅ Form validation prevents blank submissions
4. ✅ PDF export downloads a file
5. ✅ Word export downloads a file
6. ✅ Dark mode toggle changes colors
7. ✅ Mobile view looks good on phone

---

## 🚦 Ready to Start?

1. **Install:** `npm install`
2. **Dev:** `npm run dev`
3. **Build:** `npm run build`
4. **Test:** `npm test`
5. **Deploy:** `npm run preview`

---

**Happy building! 🎉**
