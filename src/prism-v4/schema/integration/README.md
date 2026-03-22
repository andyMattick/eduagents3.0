# Integration Schemas

## Owns

Integration owns PRISM assembly models and transport contracts.

## May Consume

Integration may consume domain truth and semantic truth in order to assemble PRISM requests and map PRISM responses.

## Must Never Contain

- teacher-authored source-of-truth ownership
- locally inferred learner analytics presented as PRISM output
- persisted business truth that belongs to domain

## Must Never Do

- act as a replacement for PRISM
- compute local learner-performance inference
- redefine domain ownership boundaries

## Source Of Truth

Integration is the source of truth for PRISM request and response contracts.

## Canonical Files

- `StudentPersona.ts`
- `ClassProfile.ts`
- `ClassInput.ts`
- `PRISMRequest.ts`
- `PRISMResponse.ts`
- `DifficultyInference.ts`
- `MisconceptionDefinition.ts`

## Critical Notes

- Only the integration layer may invoke PRISM.
- `ClassInput` is an integration assembly model, not a domain model.
- `PRISMRequest` and `PRISMResponse` define the external inference boundary.
