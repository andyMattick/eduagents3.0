# Professional Assessment Template System

## Overview

The Professional Assessment Template System provides a standardized, production-ready framework for generating Word and PDF assessments that conform to professional educational standards. This system ensures consistent formatting, proper pagination, and accessibility across all exported assessments.

**Key Features:**
- ✅ Professional serif typography (Times New Roman, Georgia)
- ✅ 1.5x line spacing for readability
- ✅ Smart pagination (keeps questions together)
- ✅ Metadata header with assessment info
- ✅ Optional tips with 💡 icon
- ✅ Both Word (.docx) and PDF (.pdf) output
- ✅ Page numbering (Page X of Y)
- ✅ Accessibility compliance (WCAG 2.1)

---

## Architecture

### Core Components

#### 1. **Assessment Template Types** (`src/types/assessmentTemplate.ts`)
Defines the schema for professional assessments:

```typescript
interface AssessmentDocument {
  metadata: AssessmentHeaderMetadata;      // Title, time, questions, assessment type
  sections: AssessmentSection[];           // Grouped problem sections
  problems: AssessmentProblem[];           // Individual question blocks
  pageLayout: PageLayoutConfig;            // Fonts, spacing, margins
}
```

**Key Interfaces:**

- **AssessmentHeaderMetadata**: Assessment-level information
  - `title`: e.g., "QUIZ: Course Material"
  - `timeLimit`: minutes allowed
  - `questionCount`: total questions
  - `assessmentType`: 'formative' | 'summative'
  - `baseDocument`: source reference (e.g., "Biotech Draft.docx")
  - `includeStudentInfoFields`: add name/date lines

- **AssessmentSection**: Grouped problems within an assessment
  - `title`: e.g., "Section 1: Genetics Basics"
  - `instructions`: optional section-specific guidance
  - `KeepTogether`: prevent page breaks mid-section
  - `PageBreakBefore`: insert page break before this section

- **AssessmentProblem**: Individual question block
  - `questionNumber`: display number
  - `questionText`: the actual question
  - `format`: 'multiple-choice' | 'true-false' | 'short-answer' | 'free-response'
  - `multipleChoiceOptions`: for MC format
  - `hasTip`: whether to include hint
  - `tipText`: the hint text
  - `bloomLevel`: 1-6 (hidden from students)
  - `estimatedTimeMinutes`: hidden metadata
  - `KeepTogether`: prevents mid-problem page breaks

#### 2. **Word Document Generator** (`src/agents/export/generateWordAssessment.ts`)

Converts `AssessmentDocument` to DOCX using the `docx` library:

```typescript
// Main export function
export async function generateAssessmentWord(
  assessment: AssessmentDocument
): Promise<Blob>

// Download helper
export async function downloadAssessmentWord(
  assessment: AssessmentDocument,
  filename: string
): Promise<void>

// Converter for GeneratedAssignment
export function convertGeneratedAssignmentToAssessment(
  generatedAssignment: any
): AssessmentDocument
```

**Features:**
- Professional header with metadata
- Proper paragraph formatting (keep with next, keep together)
- 1.5x line spacing throughout
- Multiple-choice with checkboxes (☐ A, B, C, D)
- True/false options
- Blank line spacing for short/free response
- Tip styling with 💡 icon
- 24px spacing between questions

#### 3. **PDF Document Generator** (`src/agents/export/generatePDFAssessment.ts`)

Converts `AssessmentDocument` to PDF using `jsPDF`:

```typescript
// Main export function
export async function generateAssessmentPDF(
  assessment: AssessmentDocument
): Promise<jsPDF>

// Download helper
export async function downloadAssessmentPDF(
  assessment: AssessmentDocument,
  filename: string
): Promise<void>

// Get Blob
export async function generateAssessmentPDFBlob(
  assessment: AssessmentDocument
): Promise<Blob>
```

**Features:**
- Matches Word formatting
- Smart page breaks (keeps problems together)
- San-serif fonts (readability in PDF)
- Page numbering (Page X of Y)
- Header metadata line
- Student information fields
- Proper line spacing

#### 4. **Export Utilities Integration** (`src/utils/exportUtils.ts`)

High-level API for exporting GeneratedAssignments:

```typescript
// Export as Word
export const exportAssignmentAsWord = async (
  generatedAssignment: any,
  filename: string
): Promise<void>

// Export as PDF
export const exportAssignmentAsPDF = async (
  generatedAssignment: any,
  filename: string
): Promise<void>

// Get HTML preview
export const generateAssessmentPreviewHTML = (
  generatedAssignment: any
): string

// Export both Word and PDF
export const exportAssignmentAsBundle = async (
  generatedAssignment: any,
  baseFilename: string,
  formats?: ('docx' | 'pdf')[]
): Promise<void>
```

---

## Usage Guide

### Basic Export (Single Format)

```typescript
import { exportAssignmentAsWord, exportAssignmentAsPDF } from '@/utils/exportUtils';

// Export as Word
await exportAssignmentAsWord(generatedAssignment, 'Quiz_Chapter5');

// Export as PDF
await exportAssignmentAsPDF(generatedAssignment, 'Quiz_Chapter5');
```

### Export Both Formats

```typescript
import { exportAssignmentAsBundle } from '@/utils/exportUtils';

// Export as both Word and PDF
await exportAssignmentAsBundle(generatedAssignment, 'Quiz_Chapter5', ['docx', 'pdf']);

// Export only Word (default is both)
await exportAssignmentAsBundle(generatedAssignment, 'Quiz_Chapter5', ['docx']);
```

### Preview Assessment

```typescript
import { generateAssessmentPreviewHTML } from '@/utils/exportUtils';

const htmlPreview = generateAssessmentPreviewHTML(generatedAssignment);
// Display in modal or preview pane
window.open('data:text/html,' + encodeURIComponent(htmlPreview));
```

### Direct Assessment Document API

```typescript
import { 
  convertGeneratedAssignmentToAssessment 
} from '@/agents/export/generateWordAssessment';
import { 
  downloadAssessmentWord 
} from '@/agents/export/generateWordAssessment';

const assessment = convertGeneratedAssignmentToAssessment(generatedAssignment);
await downloadAssessmentWord(assessment, 'My_Quiz');
```

---

## Format Specifications

### Page Layout

| Property         | Value                    |
|------------------|--------------------------|
| Font Family      | Times New Roman, Georgia |
| Font Size        | 12pt (body), 14pt (title)|
| Line Spacing     | 1.5x                     |
| Margins          | 20mm all sides           |
| Question Spacing | 24px (6mm) between Qs   |
| Page Size        | A4 (210 × 297mm)        |

### Typography

| Element          | Style                |
|------------------|---------------------|
| Title            | Bold, 14pt, centered |
| Metadata Line    | Regular, 11pt        |
| Section Header   | Bold, 12pt           |
| Question Text    | Regular, 12pt        |
| Options          | ☐ Checkbox prefix    |
| Tips             | Italic, 12pt, 💡 icon|
| Footer           | Page X of Y, 11pt    |

### Answer Format

**Multiple Choice:**
```
☐ A. Option text
☐ B. Option text
☐ C. Option text
☐ D. Option text
```

**True/False:**
```
☐ True     ☐ False
```

**Short Answer:**
```
_________________________________
_________________________________
_________________________________
```

**Free Response:**
```
_________________________________
_________________________________
_________________________________
_________________________________
_________________________________
_________________________________
_________________________________
_________________________________
```

---

## Page Break Rules

### Keep Questions Together

To ensure an entire problem block (question + options + tip) appears on one page:

1. **Problem Container**: Each problem is treated as an atomic unit
2. **Auto Page Break**: If a problem doesn't fit on the current page, move entire block to next page
3. **No Mid-Problem Breaks**: Never split question text from answer options

### Section Breaks

- Insert page break **before** major sections (except the first)
- This ensures new sections start on fresh pages
- Configurable via `AssessmentSection.PageBreakBefore`

### Example Layout

```
Page 1:
├── Header (Title, Metadata, Student Info)
├── Instructions (if present)
├── Problem 1 ✓ (complete)
├── Problem 2 ✓ (complete)
└── Problem 3 (partial - doesn't fit)

Page 2:
├── Problem 3 ✓ (moved entirely)
├── Problem 4 ✓ (complete)
├── Section Break
├── Section 2 Header
├── Problem 5 ✓ (complete)
└── Problem 6 (partial - doesn't fit)

Page 3:
├── Problem 6 ✓ (moved entirely)
├── ... (more problems)
└── Footer: Page 3 of N
```

---

## Metadata Hiding

By default, internal metadata is hidden from students:

- ✅ Bloom level (1-6)
- ✅ Estimated time per question
- ✅ Problem word count
- ✅ Question complexity scores

Setting `assessment.hideMetadataFields = true` removes these from output.

---

## Integration with React Components

### Using with AssignmentPreview

```tsx
import { exportAssignmentAsWord, exportAssignmentAsPDF } from '@/utils/exportUtils';

function AssignmentPreview() {
  const { generatedAssignment } = useUserFlow();

  const handleExportWord = async () => {
    await exportAssignmentAsWord(generatedAssignment, 'My_Assessment');
  };

  const handleExportPDF = async () => {
    await exportAssignmentAsPDF(generatedAssignment, 'My_Assessment');
  };

  return (
    <div>
      <button onClick={handleExportWord}>⬇️ Download Word</button>
      <button onClick={handleExportPDF}>⬇️ Download PDF</button>
    </div>
  );
}
```

### Showing Preview

```tsx
import { generateAssessmentPreviewHTML } from '@/utils/exportUtils';

function PreviewModal() {
  const { generatedAssignment } = useUserFlow();
  const [previewOpen, setPreviewOpen] = useState(false);

  const handlePreview = () => {
    const html = generateAssessmentPreviewHTML(generatedAssignment);
    // Display in iframe or modal
    setPreviewContent(html);
    setPreviewOpen(true);
  };

  return (
    <>
      <button onClick={handlePreview}>👁️ Preview Assessment</button>
      {previewOpen && (
        <Modal>
          <iframe srcDoc={previewContent} />
        </Modal>
      )}
    </>
  );
}
```

---

## Migration from Existing Exports

### Old Approach
```typescript
// ❌ Old way (generic preview)
const html = generateHTMLPreview(assignmentText, title, tags);
await exportDocumentPreviewPDF('preview-modal', 'export.pdf');
```

### New Approach
```typescript
// ✅ New way (professional template)
await exportAssignmentAsPDF(generatedAssignment, 'Quiz_Chapter5');
```

**Benefits:**
- Professional formatting automatically applied
- No manual styling needed
- Consistent across all exports
- Page breaks handled intelligently
- Metadata properly hidden

---

## Accessibility

The Professional Assessment Template implements WCAG 2.1 AA compliance:

- ✅ **Color Contrast**: Black text on white (high contrast)
- ✅ **Font Size**: 12pt minimum for body text
- ✅ **Line Spacing**: 1.5x for readability
- ✅ **Sans & Serif Options**: Georgia/Times New Roman
- ✅ **Reading Order**: Logical flow (number → text → options → tip)
- ✅ **Checkboxes**: Unicode symbols (☐) with text labels
- ✅ **Page Numbers**: PDF includes page numbers for navigation

### Accessibility Tips for Educators

1. **Print Font**: Use 12pt Times New Roman for better readability
2. **Student Names**: Include space for student names at top
3. **Time Limits**: Clearly state in metadata
4. **Tips**: Use simple language in tip text
5. **Colors**: Avoid color-only cues (use text + icon)

---

## Troubleshooting

### Problem: Questions break across pages

**Solution**: Check that `KeepTogether: true` is set on problems during conversion.

```typescript
// In convertGeneratedAssignmentToAssessment()
problems.push({
  ...problem,
  KeepTogether: true,  // ← Ensure this is set
  WidowOrphanControl: true,
});
```

### Problem: Page numbers missing in PDF

**Solution**: Page numbers are added at the end of PDF generation. Check browser console for errors.

### Problem: Word document has wrong margins

**Solution**: Update `DEFAULT_PAGE_LAYOUT.margins` in `assessmentTemplate.ts`:

```typescript
export const DEFAULT_PAGE_LAYOUT: PageLayoutConfig = {
  // ...
  margins: {
    top: 20,    // mm
    bottom: 20,
    left: 20,
    right: 20,
  },
};
```

### Problem: Tips not displaying in PDF

**Solution**: Ensure `problem.hasTip = true` and `problem.tipText` is populated:

```typescript
{
  hasTip: true,
  tipText: "Consider the properties of...",  // Must have text
}
```

---

## Future Enhancements

Planned improvements:

- [ ] Custom branding (school logo, header image)
- [ ] Customizable fonts and sizes
- [ ] Answer key generation (separate document)
- [ ] Rubric inclusion in assessment
- [ ] QR codes for digital submissions
- [ ] Text-to-speech friendly markup
- [ ] Barcode per assessment for scanning
- [ ] Multi-language support

---

## Related Files

| File | Purpose |
|------|---------|
| `src/types/assessmentTemplate.ts` | Template type definitions |
| `src/agents/export/generateWordAssessment.ts` | Word generator |
| `src/agents/export/generatePDFAssessment.ts` | PDF generator |
| `src/utils/exportUtils.ts` | High-level export API |
| `src/hooks/useUserFlow.tsx` | Assignment state (`GeneratedAssignment`) |

---

## References

- **Assessment Best Practices**: [NCME Standards](https://www.ncme.org/)
- **Accessibility**: [WCAG 2.1](https://www.w3.org/WAI/WCAG21/quickref/)
- **Typography**: [Times New Roman Font Metrics](https://www.w3.org/Fonts/)
- **Page Layout**: [A4 Paper Dimensions](https://en.wikipedia.org/wiki/Paper_size)

