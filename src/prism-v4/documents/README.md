# Document Workspace

Wave 6 moves the teacher-facing v4 experience onto the Stage 3/4 documents platform.

## Teacher Flow

The default path is now:

1. Upload one or more source documents.
2. Create or refresh a session-backed workspace.
3. Analyze each document into canonical document, fragment, problem, and collection-analysis state.
4. Choose an intent such as `build-unit`, `build-lesson`, `compare-documents`, or `curriculum-alignment`.
5. View the generated product and any prior products for the same session.
6. Open the semantic viewer only when detailed inspection of the legacy ingest output is needed.

This keeps the semantic viewer available without making it the primary teacher destination.

## UX Entry Points

- `src/components_new/v4/DocumentUpload.tsx` is the active teacher workspace shell.
- `src/components_new/v4/SemanticViewer.tsx` remains a supporting inspection panel.

The workspace UI is responsible for:

- multi-document upload
- session-aware role management
- intent selection
- product generation and history
- debug replay into the semantic viewer

## API Spine

The workspace is backed by the following routes:

- `POST /api/v4/documents/upload`
  - Accepts a binary document upload.
  - Registers the document and returns a `documentId`, `sessionId`, and registration summary.
- `POST /api/v4/documents/analyze`
  - Runs deterministic Stage 4 analysis for a registered document.
  - Produces canonical document, fragment, problem, and insight records.
- `GET /api/v4/documents/session?sessionId=...`
  - Returns the session, registered documents, and analyzed documents for workspace refresh.
- `POST /api/v4/documents/session`
  - Upserts session membership plus document and session roles.
- `GET /api/v4/documents/session/[sessionId]/analysis?sessionId=...`
  - Returns collection analysis across all analyzed documents in the session.
- `GET /api/v4/documents/intent?sessionId=...`
  - Lists prior products for the session.
- `POST /api/v4/documents/intent`
  - Builds and persists an intent product for the selected documents.

The only remaining use of `POST /api/v4-ingest` in this flow is debug replay for the semantic viewer.

## Product Layers

Products now span three waves on the same session/document spine:

- Wave 3: `extract-problems`, `extract-concepts`, `summarize`, `build-review`, `build-test`
- Wave 4: `compare-documents`, `merge-documents`, `build-sequence`
- Wave 5: `build-lesson`, `build-unit`, `build-instructional-map`, `curriculum-alignment`

All generated products are stored as typed intent products and can be reopened from product history.

## Guardrails

- The legacy semantic viewer is not the main workflow anymore.
- Session and document roles remain part of the app-owned domain model, not the semantic layer.
- Intent products are built from registered/analyzed session state, not from ad hoc UI-only transforms.
- The v4 ingest route stays intact for compatibility and inspection, but it is no longer the teacher default.

## Regression Slice

The main verification path for this workspace is:

```bash
npm test -- --run src/components_new/v4/tests/DocumentUpload.test.tsx src/__tests__/documentsRoutes.test.ts src/__tests__/documentsBinaryRoutes.test.ts src/prism-v4/documents/intents/buildIntentProduct.test.ts src/prism-v4/ingestion/tests/v4IngestRoute.test.ts
```