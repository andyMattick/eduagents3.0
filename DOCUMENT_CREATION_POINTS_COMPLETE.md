# EXACT CODE LOCATIONS: Document Creation Points

## Search Results Summary

I've found the TWO main document creation flows that need wiring into the ingestion pipeline:

### STEP 6: STUDENT-PORTAL (Student Submissions)
- **Endpoint**: `POST /api/v4/student-performance/ingestAssessment`
- **File**: `api/v4/student-performance/ingestAssessment.ts`
- **Handler**: Lines 98-130
- **Status**: ❌ NOT wired to ingestion pipeline

### STEP 7: CREATED-DOC (Teacher Studio Test Generation)
- **Endpoint**: `POST /api/v4/simulator/generate-test`
- **File**: `api/v4/simulator/generate-test.ts`
- **Handler**: Lines 45-109
- **Status**: ❌ NOT wired to ingestion pipeline

---

## DETAILED FINDINGS

### STEP 6: STUDENT-PORTAL DOCUMENTS (Student Submissions)

#### Location
**File**: [api/v4/student-performance/ingestAssessment.ts](https://github.com/your-org/eduagents3.0/blob/main/api/v4/student-performance/ingestAssessment.ts)

#### Handler Signature
```typescript
// Line 98
export default async function handler(req: VercelRequest, res: VercelResponse) {
```

#### Method: POST
```typescript
// Line 105
if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
}
```

#### CORS Configuration
```typescript
// Lines 16-18
const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
};
```

#### Request Payload Structure
**Lines 28-35**: Interface definition
```typescript
interface AssessmentIngestItem {
    itemId?: string;
    conceptId?: string;
    concept?: string;
    conceptDisplayName?: string;
    correct: boolean;
    bloom: BloomLevel;
    mode?: ItemMode;
    scenario?: ScenarioType;
    difficulty?: ExtractedProblemDifficulty;
    responseTimeSeconds?: number;
    confidence?: number;
    misconceptionKey?: string;
    incorrectResponse?: string;
    occurredAt?: string;
    metadata?: Record<string, unknown>;
}
```

#### Payload Validation & Conversion
**Lines 54-81**: `toEvents()` function converts to internal format
```typescript
function toEvents(payload: Record<string, unknown>) {
    const studentId = typeof payload.studentId === "string" && payload.studentId.trim().length > 0 ? payload.studentId.trim() : null;
    const assessmentId = typeof payload.assessmentId === "string" && payload.assessmentId.trim().length > 0 ? payload.assessmentId.trim() : null;
    const unitId = typeof payload.unitId === "string" && payload.unitId.trim().length > 0 ? payload.unitId.trim() : undefined;
    const items = Array.isArray(payload.items) ? payload.items as AssessmentIngestItem[] : [];
    // ... validation ...
    return items.map<StudentAssessmentEvent>((item, index) => {
        // Creates StudentAssessmentEvent from AssessmentIngestItem
    });
}
```

#### Database Operations
**Lines 113-115**: Where student data is saved
```typescript
// Line 113: Append student assessment events
await appendStudentAssessmentEvents(events);

// Line 114-115: Save/update student performance profile
const currentProfile = await getStudentPerformanceProfile(events[0]!.studentId, events[0]!.unitId);
const updatedProfile = updateStudentPerformanceProfile(currentProfile, events);
await saveStudentPerformanceProfile(updatedProfile);
```

#### Function Implementations

**appendStudentAssessmentEvents()**: [src/prism-v4/studentPerformance/store.ts](src/prism-v4/studentPerformance/store.ts), Lines 144-160
```typescript
export async function appendStudentAssessmentEvents(events: StudentAssessmentEvent[]) {
    if (events.length === 0) {
        return [];
    }
    for (const event of events) {
        const key = profileKey(event.studentId, event.unitId);
        studentEventMemory.set(key, [...(studentEventMemory.get(key) ?? []), event]);
    }
    if (canUseSupabase()) {
        await supabaseRest("student_assessment_events", {
            method: "POST",
            body: events.map((event) => normalizeEvent(event)),
            prefer: "resolution=merge-duplicates,return=minimal",
        });
    }
    return events;
}
```
✅ **Writes to**: `student_assessment_events` table

**saveStudentPerformanceProfile()**: [src/prism-v4/studentPerformance/store.ts](src/prism-v4/studentPerformance/store.ts), Lines 112-122
```typescript
export async function saveStudentPerformanceProfile(profile: StudentPerformanceProfile) {
    studentProfileMemory.set(profileKey(profile.studentId, profile.unitId), profile);
    if (canUseSupabase()) {
        await supabaseRest("student_performance_profiles", {
            method: "POST",
            body: normalizeProfile(profile),
            prefer: "resolution=merge-duplicates,return=minimal",
        });
    }
    return profile;
}
```
✅ **Writes to**: `student_performance_profiles` table

#### Data Flow Diagram
```
POST /api/v4/student-performance/ingestAssessment
    ↓ Line 78: toEvents()
    ↓ Line 113: appendStudentAssessmentEvents()
    ├→ studentEventMemory (in-memory)
    └→ supabaseRest("student_assessment_events")
    
    ↓ Line 114-115: saveStudentPerformanceProfile()
    ├→ studentProfileMemory (in-memory)
    └→ supabaseRest("student_performance_profiles")
```

#### What's Currently **MISSING**

❌ **NO** reference to `prism_v4_documents` table
❌ **NO** call to `analyzeRegisteredDocument()`
❌ **NO** call to `ingestDocument()`
❌ **NO** document session creation
❌ **NO** v4_items/v4_sections/v4_analysis persistence

#### What Needs to Change

1. **Register the submission as a document**
   - Create prism_v4_documents entry
   - Include source_type: "student-submission"
   - Link to student via metadata

2. **Analyze the submission**
   - Extract problems/concepts from submission
   - Call `analyzeRegisteredDocument()`

3. **Ingest into v4 tables**
   - Call `ingestDocument()` with source: "student-portal"
   - Populate v4_items, v4_sections, v4_analysis

4. **Link student profile to document**
   - Store documentId in student metadata
   - Enable cross-reference queries

---

### STEP 7: CREATED-DOC DOCUMENTS (Teacher Studio Test Generation)

#### Location
**File**: [api/v4/simulator/generate-test.ts](https://github.com/your-org/eduagents3.0/blob/main/api/v4/simulator/generate-test.ts)

#### Handler Signature
```typescript
// Line 45
export default async function handler(req: VercelRequest, res: VercelResponse) {
```

#### Method: POST
```typescript
// Lines 51-52
if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
```

#### CORS Configuration
```typescript
// Lines 47-52
if (req.method === "OPTIONS") {
    return res
        .status(200)
        .setHeader("Access-Control-Allow-Origin", "*")
        .setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
        .setHeader("Access-Control-Allow-Headers", "Content-Type")
        .end();
}
```

#### Request Payload Structure
```typescript
// Lines 60-66
const { sessionId, supplementText, testPreferences } = (body ?? {}) as {
    sessionId?: string;
    supplementText?: string;
    testPreferences?: SimulatorTestPreferences;
};

interface SimulatorTestPreferences {
    mcCount?: number;      // Multiple choice count
    saCount?: number;      // Short answer count
    frqCount?: number;     // Free response count
}
```

#### Processing Flow

**Step 1: Validate input**
```typescript
// Lines 68-70
if (!sessionId) return res.status(400).json({ error: "sessionId is required" });
```

**Step 2: Fetch session content**
```typescript
// Lines 72-75
const { text, docCount } = await fetchSessionText(sessionId);
if (!text || docCount === 0) return res.status(404).json({ error: "No document text found." });
```
- **Function**: `fetchSessionText()` at [api/v4/simulator/shared.ts](api/v4/simulator/shared.ts), Lines 1-40
- Fetches document text from prism_v4_documents for the session

**Step 3: Build prompt**
```typescript
// Line 77-78
const prefLine = buildTestPreferenceLine(testPreferences);
const userMsg = `Generate ${prefLine}\n\nDocument A:\n${text}${...}`;
```

**Step 4: Call LLM**
```typescript
// Lines 80-81
const raw = await callLLM({ 
    prompt: `${SYSTEM_PROMPT}\n\nUSER:\n${userMsg}`, 
    metadata: { runType: "generate-test", sessionId }, 
    options: { temperature: 0.4, maxOutputTokens: 4096 } 
});
```

**Step 5: Parse LLM response**
```typescript
// Lines 82-85
const parsed = parseSimulatorResponse(raw);
const data: GeneratedTestData | null =
    parsed.data && typeof parsed.data === "object" && "test" in (parsed.data as object)
        ? (parsed.data as GeneratedTestData) : null;
```
- **Function**: `parseSimulatorResponse()` at [api/v4/simulator/shared.ts](api/v4/simulator/shared.ts), Lines 254-344
- 3-strategy parser: marker-based, reverse brace-match, brute-force

**Step 6: Create temporary document ID**
```typescript
// Line 97
const generatedDocumentId = randomUUID();
```
- ⚠️ **Note**: Uses `randomUUID()` instead of `createId("doc")`

**Step 7: Save items ONLY (fire-and-forget)**
```typescript
// Lines 101-104
if (data && data.test.length > 0) {
    const v4Items: V4Item[] = data.test.map((item, idx) => ({
        itemNumber: idx + 1,
        type: item.type.toLowerCase(),
        stem: item.stem,
        choices: item.options ?? null,
        answerKey: item.answer ?? null,
        metadata: {},
        sourcePageNumbers: [],
    }));
    saveItems(generatedDocumentId, v4Items).catch(() => {}); // fire-and-forget
}
```

#### saveItems() Implementation
**Location**: [api/v4/simulator/shared.ts](api/v4/simulator/shared.ts), Lines 347-380
```typescript
export async function saveItems(documentId: string, items: V4Item[]) {
    const rows = items.map((item, idx) => ({
        document_id: documentId,
        item_number: item.itemNumber,
        type: item.type,
        stem: item.stem,
        choices: item.choices,
        answer_key: item.answerKey,
        metadata: item.metadata,
        source_page_numbers: item.sourcePageNumbers,
    }));

    if (canUseSupabase()) {
        await supabaseRest("v4_items", {
            method: "POST",
            body: rows,
            prefer: "resolution=merge-duplicates,return=minimal",
        });
    }
    return items;
}
```
✅ **Writes to**: `v4_items` table

#### Response Sent Back
```typescript
// Line 107
return res.status(200).json({ 
    narrative: parsed.narrative,  // LLM explanation
    data,                         // Test structure
    documentId: generatedDocumentId,  // Random UUID
    meta: { docCount } 
});
```

#### Client-Side Integration (TeacherStudio.tsx)

**File**: [src/components_new/v4/TeacherStudio.tsx](src/components_new/v4/TeacherStudio.tsx)

**Trigger**: When user selects "create" goal and uploads documents
```typescript
// Line 880-891
} else if (state.goal === "create") {
    const res = await runGenerateTestApi({ 
        sessionId, 
        testPreferences: state.testPrefs 
    });
    // Line 888: Update React state
    upd((s) => ({
        ...s,
        testData: res.data,
        documentId: res.documentId,  // ⚠️ Stored but not persisted
        phase: "results",
    }));
}
```

**Display**: Show generated test in UI
```typescript
// Lines 1606-1607
{state.activeTab === "narrative" && state.goal === "create" && state.testData && state.testData.test.length > 0 && (
    <GeneratedTestView data={state.testData} />
)}
```

#### Data Flow Diagram
```
POST /api/v4/simulator/generate-test
    ↓ Line 72: fetchSessionText(sessionId)
    ├→ Load from prism_v4_documents via session
    ↓ Line 80: callLLM(prompt)
    ├→ Azure LLM API
    ↓ Line 82: parseSimulatorResponse(raw)
    ├→ Extract JSON from LLM output
    ↓ Line 97: const generatedDocumentId = randomUUID()
    ↓ Line 104: saveItems(generatedDocumentId, v4Items)
    ├→ supabaseRest("v4_items", { method: "POST" })
    ↓ Line 107: Return { data, documentId, narrative }
    ↓ TeacherStudio.tsx Line 888: Store in state (NOT persisted)
```

#### What's Currently **MISSING**

❌ **NO** reference to `prism_v4_documents` table
❌ **NO** call to `analyzeRegisteredDocument()`
❌ **NO** call to `ingestDocument()`
❌ **NO** document session creation
❌ **NO** v4_sections persistence
❌ **NO** v4_analysis persistence
❌ **NO** doc_type classification
❌ **NO** document persisted beyond v4_items (generated UUID lost if page refreshes)

#### What Needs to Change

1. **Register generated document**
   - Create prism_v4_documents entry
   - Include source_type: "created"
   - Link to source sessionId

2. **Analyze generated test**
   - Create synthetic AnalyzedDocument from GeneratedTestData
   - Call `saveAnalyzedDocumentStore()`

3. **Ingest into v4 tables**
   - Call `ingestDocument()` with source: "created"
   - Already saves v4_items at line 104
   - **NEEDS**: v4_sections (test structure grouping)
   - **NEEDS**: v4_analysis (test metadata, difficulty distribution)

4. **Persist documentId**
   - Currently stored only in React state
   - Should persist to prism_v4_documents
   - Enable teacher to revisit generated assessments

5. **Support saving/exporting**
   - Option to export as PDF
   - Option to save to library
   - Link to teacher studio artifacts

---

## COMPARISON TABLE

| Aspect | STEP 6 (Student Submissions) | STEP 7 (Generated Tests) |
|--------|------------------------------|--------------------------|
| **Endpoint** | `/api/v4/student-performance/ingestAssessment` | `/api/v4/simulator/generate-test` |
| **File** | `api/v4/student-performance/ingestAssessment.ts` | `api/v4/simulator/generate-test.ts` |
| **Handler Lines** | 98-130 | 45-109 |
| **Method** | POST | POST |
| **Input Source** | Student answers/performance data | Session documents + LLM |
| **registerDocumentsStore** | ❌ NO | ❌ NO |
| **analyzeRegisteredDocument** | ❌ NO | ❌ NO |
| **ingestDocument** | ❌ NO | ❌ NO |
| **v4_items** | ❌ NO | ✅ YES (Line 104) |
| **v4_sections** | ❌ NO | ❌ NO |
| **v4_analysis** | ❌ NO | ❌ NO |
| **prism_v4_documents** | ❌ NO | ❌ NO |
| **student_performance_profiles** | ✅ YES (Line 115) | ❌ NO |
| **Data Persisted** | Student mastery, misconceptions | v4_items only |
| **Functions Called** | `saveStudentPerformanceProfile`, `appendStudentAssessmentEvents` | `saveItems`, `callLLM`, `parseSimulatorResponse` |

---

## IMPLEMENTATION ROADMAP

### For STEP 6 (Student Submissions)

1. **After Line 112 in ingestAssessment.ts**:
   ```typescript
   // Create document entry for this submission
   const submissionDocument = await registerDocumentsStore([{
       sourceFileName: `submission-${studentId}-${assessmentId}.json`,
       sourceMimeType: "application/json",
       source_type: "student-submission",
       rawBinary: Buffer.from(JSON.stringify(events)),
   }]);
   ```

2. **After document registration**:
   ```typescript
   // Analyze the document
   const analyzedDocument = await analyzeRegisteredDocument({
       documentId: submissionDocument.documentId,
       sourceFileName: submissionDocument.sourceFileName,
       sourceMimeType: "application/json",
       rawBinary: Buffer.from(JSON.stringify(events)),
   });
   ```

3. **Run unified ingestion**:
   ```typescript
   ingestDocument({
       source: "student-portal",
       documentId: submissionDocument.documentId,
       analyzedDocument,
   }).catch(console.warn);
   ```

### For STEP 7 (Generated Tests)

1. **After Line 97 in generate-test.ts**:
   ```typescript
   // Create synthetic document from generated test
   const testDocument = await registerDocumentsStore([{
       sourceFileName: "generated-test.json",
       sourceMimeType: "application/json",
       source_type: "created",
       sessionId,
       rawBinary: Buffer.from(JSON.stringify(data)),
   }]);
   ```

2. **After line 104 (after saveItems)**:
   ```typescript
   // Create synthetic analyzed document
   const analyzedDocument = {
       documentId: testDocument.documentId,
       document: {
           nodes: [],
           annotations: [],
       },
       docType: "assessment",
       concepts: data.test.flatMap(item => item.concepts || []),
       problems: data.test.map((item, i) => ({
           problemId: String(i + 1),
           problemCount: 1,
           bloomLevels: [],
       })),
       readingLevel: 0.5,
       metadata: { generatedAt: new Date().toISOString() },
   };
   
   await saveAnalyzedDocumentStore(analyzedDocument, sessionId);
   ```

3. **Run unified ingestion**:
   ```typescript
   ingestDocument({
       source: "created",
       documentId: testDocument.documentId,
       analyzedDocument,
   }).catch(console.warn);
   ```

---

## FILES REQUIRING CHANGES

1. **api/v4/student-performance/ingestAssessment.ts**
   - Add: document registration (after line 112)
   - Add: analysis call (after registration)
   - Add: ingestDocument call (after analysis)

2. **api/v4/simulator/generate-test.ts**
   - Add: document registration (after line 97)
   - Add: analyzed document construction (after line 104)
   - Add: ingestDocument call (with v4_sections, v4_analysis)

3. **src/components_new/v4/TeacherStudio.tsx** (optional)
   - Improve: Store documentId persistence
   - Add: Option to save/export generated assessment
   - Add: Link to reuse generated assessments

---

## KEY IMPORTS NEEDED

```typescript
// In ingestAssessment.ts
import {
    registerDocumentsStore,
    saveAnalyzedDocumentStore,
} from "../../../src/prism-v4/documents/registryStore";
import { analyzeRegisteredDocument } from "../../../src/prism-v4/documents/analysis";
import { ingestDocument } from "../../../src/prism-v4/ingestion/ingestDocument";

// In generate-test.ts
import {
    registerDocumentsStore,
    saveAnalyzedDocumentStore,
} from "../../../src/prism-v4/documents/registryStore";
import { ingestDocument } from "../../../src/prism-v4/ingestion/ingestDocument";
```

---

## VERIFICATION STEPS

After implementation:

1. **Check prism_v4_documents**:
   - Student submissions → One row per submission with source_type = "student-submission"
   - Generated tests → One row per generated test with source_type = "created"

2. **Check prism_v4_analyzed_documents**:
   - Both sources → Analysis stored for concept extraction

3. **Check v4_items**:
   - Both sources → Items populated correctly

4. **Check v4_sections**:
   - Student submissions → Sections representing question groupings (if available)
   - Generated tests → Sections by item type (MC, SA, FRQ)

5. **Check v4_analysis**:
   - Both sources → Document analysis metadata

6. **Verify Cross-Reference**:
   - student_performance_profiles.metadata includes documentId links
   - Queries can join student performance to documents for student-specific analysis
