# Professional Assessment Template - Quick Reference

## 📋 At a Glance

The Professional Assessment Template System makes it easy to export **GeneratedAssignment** objects as beautifully formatted Word (.docx) and PDF documents.

### One-Line Exports

```typescript
// Word export
await exportAssignmentAsWord(generatedAssignment, 'Quiz_Chapter5');

// PDF export
await exportAssignmentAsPDF(generatedAssignment, 'Quiz_Chapter5');

// Both formats at once
await exportAssignmentAsBundle(generatedAssignment, 'Quiz_Chapter5', ['docx', 'pdf']);
```

---

## 📐 Standard Format (What Gets Generated)

### Page 1 Header

```
                          QUIZ: Course Material
        Time: 30 minutes  Questions: 10  Assessment Type: Formative
                      Based on: Biotech Draft.docx

Student Name: ____________________     Date: ___________

───────────────────────────────────────────────────────────────────
```

### Question Examples

**Multiple Choice:**
```
1. Which of the following is a characteristic of photosynthesis?

☐ A. Occurs in mitochondria
☐ B. Converts light energy into chemical energy
☐ C. Produces carbon dioxide
☐ D. Requires cellular respiration

💡 Tip: Think about where plants capture sunlight.
```

**True/False:**
```
2. All organisms use mitochondria for energy production.

☐ True     ☐ False

💡 Tip: Consider prokaryotes and bacteria.
```

**Short Answer:**
```
3. Define photosynthesis in your own words.

_________________________________________________________________

_________________________________________________________________

_________________________________________________________________
```

**Free Response:**
```
4. Explain the relationship between photosynthesis and cellular respiration.

_________________________________________________________________

_________________________________________________________________

_________________________________________________________________

_________________________________________________________________

_________________________________________________________________

_________________________________________________________________

_________________________________________________________________

_________________________________________________________________
```

### Page Footer

```
                            Page 1 of 3
```

---

## 🎯 Formatting Specifications

| Property | Value |
|----------|-------|
| **Font** | Times New Roman, 12pt |
| **Line Height** | 1.5x (single spacing = 1.0x) |
| **Margins** | 20mm all sides |
| **Page Size** | A4 (210 × 297mm / 8.5" × 11") |
| **Section Spacing** | 24px (6mm) before/after |
| **Student Name Length** | ~25 characters |
| **Checkbox Symbol** | ☐ (Unicode U+2610) |
| **Tip Icon** | 💡 (Unicode emoji) |

---

## 🔧 Implementation (Copy-Paste Ready)

### In React Component

```tsx
import { exportAssignmentAsWord, exportAssignmentAsPDF } from '@/utils/exportUtils';
import { useUserFlow } from '@/hooks/useUserFlow';

export function AssignmentActions() {
  const { generatedAssignment } = useUserFlow();

  return (
    <div>
      <button 
        onClick={() => exportAssignmentAsWord(generatedAssignment, 'Quiz')}
      >
        ⬇️ Download Word
      </button>
      <button 
        onClick={() => exportAssignmentAsPDF(generatedAssignment, 'Quiz')}
      >
        ⬇️ Download PDF
      </button>
    </div>
  );
}
```

### With Error Handling

```tsx
const handleExport = async (format: 'docx' | 'pdf') => {
  try {
    const filename = generatedAssignment.title
      .replace(/\s+/g, '_')
      .toLowerCase();

    if (format === 'docx') {
      await exportAssignmentAsWord(generatedAssignment, filename);
    } else {
      await exportAssignmentAsPDF(generatedAssignment, filename);
    }

    alert('✓ Export successful!');
  } catch (error) {
    alert(`✗ Export failed: ${error.message}`);
  }
};
```

---

## 📦 What You Get

### Word Document (.docx)

✅ Editable text (teachers can modify)
✅ Proper formatting (fonts, spacing, margins)
✅ Page breaks between sections
✅ Professional appearance
✅ Compatible with all Word versions (2010+)
✅ File size: ~50-100 KB per assignment

### PDF Document (.pdf)

✅ Read-only (preserves formatting)
✅ Professional appearance
✅ Page numbers (Page X of Y)
✅ Printable on any printer
✅ Compatible with all devices
✅ File size: ~100-200 KB per assignment

---

## 🎨 Customization

### Change Default Font

Edit `src/types/assessmentTemplate.ts`:

```typescript
export const DEFAULT_PAGE_LAYOUT: PageLayoutConfig = {
  fontFamily: 'Georgia', // or 'TimesNewRoman', 'Garamond'
  fontSize: 12,
  // ...
};
```

### Change Margins

```typescript
export const DEFAULT_PAGE_LAYOUT: PageLayoutConfig = {
  // ...
  margins: {
    top: 25,    // mm
    bottom: 25,
    left: 25,
    right: 25,
  },
};
```

### Hide Tips

Set `hasTip: false` on problems during generation.

### Include Answer Key

(Coming soon) Generate separate answer key document

---

## ✅ Accessibility Features

- 🔤 **Large, readable font** (12pt serif)
- 📏 **Ample line spacing** (1.5x - easy to read and mark up)
- ☑️ **Clear checkboxes** (☐ symbol + text)
- 💡 **Visual hints** (tips clearly marked with icon)
- ⬛ **High contrast** (black text on white)
- 🔢 **Page numbers** (easy navigation)
- 📝 **Ample answer space** (lines clearly visible)

---

## 🚀 Advanced Usage

### Batch Export

```typescript
async function exportMultiple(assignments: any[]) {
  for (const assignment of assignments) {
    const filename = assignment.title.replace(/\s+/g, '_');
    await exportAssignmentAsBundle(assignment, filename, ['docx', 'pdf']);
  }
}
```

### Custom Assessment Document

```typescript
import { AssessmentDocument } from '@/types/assessmentTemplate';
import { generateAssessmentWord } from '@/agents/export/generateWordAssessment';

const custom: AssessmentDocument = {
  metadata: { /* ... */ },
  sections: [ /* ... */ ],
  problems: [ /* ... */ ],
  pageLayout: DEFAULT_PAGE_LAYOUT,
};

const blob = await generateAssessmentWord(custom);
```

### Preview Before Export

```typescript
import { generateAssessmentPreviewHTML } from '@/utils/exportUtils';

const html = generateAssessmentPreviewHTML(generatedAssignment);
window.open('data:text/html,' + encodeURIComponent(html));
```

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Questions split across pages | Increase `PageBreakBefore` on sections |
| Font looks wrong | Check browser default fonts; use Windows or Mac system fonts |
| PDF missing page numbers | Page numbers added automatically; check browser console |
| Word file won't open | Try opening with LibreOffice or Google Docs |
| Margins incorrect | Adjust `DEFAULT_PAGE_LAYOUT.margins` |
| Tips not showing | Ensure `hasTip: true` and `tipText` is present |

---

## 📚 Related Files

- **Type Definitions**: `src/types/assessmentTemplate.ts`
- **Word Generator**: `src/agents/export/generateWordAssessment.ts`
- **PDF Generator**: `src/agents/export/generatePDFAssessment.ts`
- **Export API**: `src/utils/exportUtils.ts`
- **Full Guide**: `ASSESSMENT_TEMPLATE_GUIDE.md`
- **Examples**: `ASSESSMENT_TEMPLATE_EXAMPLES.tsx`
- **This File**: `ASSESSMENT_TEMPLATE_QUICK_REFERENCE.md`

---

## 💻 API Reference

### Main Functions

```typescript
// Export as Word
exportAssignmentAsWord(
  generatedAssignment: any,
  filename: string
): Promise<void>

// Export as PDF
exportAssignmentAsPDF(
  generatedAssignment: any,
  filename: string
): Promise<void>

// Export both
exportAssignmentAsBundle(
  generatedAssignment: any,
  baseFilename: string,
  formats?: ('docx' | 'pdf')[]
): Promise<void>

// Get HTML preview
generateAssessmentPreviewHTML(
  generatedAssignment: any
): string
```

### Low-Level Functions

```typescript
// Convert GeneratedAssignment to AssessmentDocument
convertGeneratedAssignmentToAssessment(
  generatedAssignment: any
): AssessmentDocument

// Generate Word blob directly
generateAssessmentWord(
  assessment: AssessmentDocument
): Promise<Blob>

// Generate PDF directly
generateAssessmentPDF(
  assessment: AssessmentDocument
): Promise<jsPDF>
```

---

## 📖 Example Workflow

```
┌─────────────────────────────────────────┐
│ Teacher Creates Assignment (in UI)      │
│ - Enters title, questions, sections     │
│ - GeneratedAssignment object created    │
└─────────────────────┬───────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────┐
│ Click "Export Assessment"               │
│ - Choose format (Word, PDF, or both)    │
│ - Optional: preview first               │
└─────────────────────┬───────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────┐
│ System Formats Assessment               │
│ - Converts to AssessmentDocument        │
│ - Applies formatting rules              │
│ - Handles page breaks intelligently    │
└─────────────────────┬───────────────────┘
                      │
        ┌─────────────┴─────────────┐
        ▼                           ▼
  ┌──────────────┐         ┌──────────────┐
  │ Word Export  │         │ PDF Export   │
  │ Quiz.docx    │         │ Quiz.pdf     │
  └──────────────┘         └──────────────┘
        │                         │
        └─────────────┬───────────┘
                      ▼
        ┌──────────────────────────┐
        │ Download to Computer     │
        │ .docx or .pdf file ready │
        └──────────────────────────┘
```

---

## ✨ What Makes It Professional

✅ **Consistent Formatting** - Same look across all exports
✅ **Educational Standards** - Follows best practices for assessments
✅ **Student-Ready** - Can print and distribute immediately
✅ **Teacher-Friendly** - Editable Word format for customization
✅ **Accessible** - Meets WCAG 2.1 AA standards
✅ **No Setup Required** - Works out of the box

---

**Last Updated**: February 9, 2026
**Status**: Production Ready ✓

