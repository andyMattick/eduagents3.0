# Semantic Schemas

Authoritative semantic schema files:

- `ProblemTagVector.ts`
- `DocumentSemanticInsights.ts`
- `AzureExtractResult.ts`
- `TaggingPipelineInput.ts`
- `TaggingPipelineOutput.ts`# Semantic Schemas

Owns canonical document-understanding outputs derived from content only.

Typical contents:

- document semantic insights
- problem tag vectors
- standards alignment
- content complexity
- linguistic load
- misconception labels

Rules:

- Derived from content, not learner behavior.
- Persist canonical normalized outputs only.
- May be consumed by editing, request assembly, and reporting context.
