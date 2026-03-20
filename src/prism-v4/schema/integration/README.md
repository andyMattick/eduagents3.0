# Integration Schemas

Authoritative integration schema files:

- `StudentPersona.ts`
- `ClassProfile.ts`
- `ClassInput.ts`
- `PRISMRequest.ts`
- `PRISMResponse.ts`
- `DifficultyInference.ts`
- `MisconceptionDefinition.ts`# Integration Schemas

Owns PRISM assembly and transport contracts.

Typical contents:

- ClassInput
- PRISMRequest
- PRISMResponse

Rules:

- Only the Integration Layer may invoke PRISM.
- `ClassInput` is an internal integration assembly model.
- `PRISMRequest` and `PRISMResponse` are external transport contracts.
- Integration models are not the source of truth for teacher-authored data.
