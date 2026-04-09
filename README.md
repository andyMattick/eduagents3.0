Absolutely, Andy — here is a **developer‑onboarding README** written in the same tone and structure as your original, but focused on helping new engineers understand the system quickly and contribute confidently.

It’s crisp, operational, and gives a new dev exactly what they need to get productive without drowning them in architecture.

---

# **eduagents3.0 — Developer Onboarding Guide**

Welcome to eduagents3.0 — an intelligent, teacher‑centric assessment and instruction engine. This guide gives new contributors a fast, accurate understanding of how the system works, how to run it, and where to find the important pieces.

---

# **What This System Does**

eduagents3.0 transforms real classroom documents into structured, adaptive, simulation‑ready learning experiences. It:

- ingests worksheets, tests, notes, and mixed packets  
- classifies them as **problems**, **notes**, or **mixed**  
- extracts structured **items** and **sections**  
- analyzes concepts, misconceptions, and difficulty  
- simulates diverse student profiles  
- rewrites content for clarity, pacing, and accessibility  

Everything is built around a unified ingestion pipeline and a docType‑aware rewrite engine.

---

# **Core Concepts**

### **Document Types**
Every document becomes one of:

- **problem** — assessment items only  
- **notes** — instructional text only  
- **mixed** — both items and notes  

This determines how rewrite, simulation, and analysis behave.

### **Structured Storage**
After ingestion, all documents are represented through:

- `v4_items` — extracted assessment items  
- `v4_sections` — segmented instructional notes  
- `v4_analysis` — concepts, misconceptions, metadata  
- `prism_v4_documents.doc_type` — classification  

This makes downstream features deterministic and reusable.

---

# **Local Development**

### **Prerequisites**
- Node.js 18+  
- npm  
- Supabase CLI (optional but recommended)

### **Install Dependencies**
```bash
npm install
```

### **Start Dev Server**
```bash
npm run dev
```

Runs the Vite dev server on port **5173**.

### **Build**
```bash
npm run build
```

### **Tests**
```bash
npm test
```

---

# **High‑Level Architecture**

eduagents3.0 is organized around a **five‑phase pipeline**:

### **1. Ingestion**
- Parses PDFs, Word docs, or raw text  
- Classifies docType  
- Extracts items and/or sections  
- Stores structured representations  

Code:  
`src/prism-v4/ingestion/`

### **2. Analysis**
- Concept extraction  
- Misconception themes  
- Difficulty patterns  
- Metadata enrichment  

Code:  
`src/prism-v4/documents/analysis/`

### **3. Simulation**
- Multi‑profile student modeling  
- Cognitive load, confusion risk, pacing, fatigue  
- Cross‑profile comparison  

Code:  
`api/v4/simulator/`

### **4. Rewriting**
- DocType‑aware rewrite (problems, notes, mixed)  
- JSON‑safe prompt builders  
- Teacher‑preference alignment  

Code:  
`api/v4/rewrite/`

### **5. Export**
- Structured JSON for UI  
- Teacher‑ready rewritten content  
- Simulation reports  

---

# **Important Files & Directories**

### **Ingestion Engine**
```
src/prism-v4/ingestion/
  ingestDocument.ts        ← unified ingestion entry point
  classifyDocType.ts       ← heuristic docType classifier
  backfillDocument.ts      ← legacy document upgrader
```

### **Rewrite Engine**
```
api/v4/rewrite/
  index.ts                 ← rewrite router (docType-aware)
  prompts.ts               ← problem/notes/mixed prompt builders
```

### **Simulation Engine**
```
api/v4/simulator/
  shared.ts                ← items, sections, analysis, docType storage
  index.ts                 ← simulation route
```

### **Analysis Engine**
```
src/prism-v4/documents/analysis/
  analyzeRegisteredDocument.ts
```

---

# **How a Document Flows Through the System**

1. **Upload or create a document**  
2. `ingestDocument()` runs automatically  
3. System stores:  
   - docType  
   - items  
   - sections  
   - analysis  
4. Rewrite, simulation, and preparedness now operate on structured data  
5. UI renders teacher‑friendly outputs  

This ensures consistency across all features.

---

# **Common Development Tasks**

### **Add a new ingestion source**
Call:
```ts
await ingestDocument({ source: "api", documentId, rawText });
```

### **Add a new rewrite mode**
- Add a prompt builder in `prompts.ts`  
- Add a branch in `rewrite/index.ts`  

### **Debug ingestion**
Check:
- `prism_v4_documents.doc_type`
- `v4_items`
- `v4_sections`
- `v4_analysis`

### **Debug rewrite**
- Log the prompt  
- Check JSON parse  
- Verify docType  

---

# **Troubleshooting**

### Items not appearing?
- Check ingestion logs  
- Ensure docType is `"problem"` or `"mixed"`  
- Verify `v4_items` rows exist  

### Notes not rewriting?
- Ensure docType is `"notes"` or `"mixed"`  
- Check `v4_sections`  

### Simulation missing data?
- Ensure items exist  
- Check `analyzeRegisteredDocument` output  

---

