# Ingestion Layer (Phase 2)

This layer handles:
- document upload
- Azure layout extraction
- structural normalization
- text cleanup
- section segmentation
- optional short-lived debug retention of raw layout output

Debug environment variables:
- `INGESTION_DEBUG_AZURE=true` enables short-lived raw layout retention
- `INGESTION_DEBUG_AZURE_TTL_MS` overrides the raw layout retention window
- `INGESTION_MAX_UPLOAD_BYTES` overrides the upload size limit

This layer is structural only.
It produces canonical structure and deterministic sections for the next phase.
