# Semantic Schemas

## Owns

Semantic owns canonical document-understanding outputs derived from content alone.

## May Consume

Semantic may consume domain identifiers and raw extraction outputs needed to normalize content understanding.

## Must Never Contain

- learner-performance inference
- class or student analytics
- view-only rollups
- simulation-era concepts

## Must Never Do

- infer student success or struggle locally
- compute fallback analytics that mimic PRISM
- store render-only projections as semantic truth

## Source Of Truth

Semantic is the source of truth for content-derived annotations, tags, and complexity metadata.

## Canonical Files

- `ProblemTagVector.ts`
- `DocumentSemanticInsights.ts`
- `AzureExtractResult.ts`
- `TaggingPipelineInput.ts`
- `TaggingPipelineOutput.ts`
