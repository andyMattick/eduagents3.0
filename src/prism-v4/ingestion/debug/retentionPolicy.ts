const DEFAULT_RAW_DEBUG_TTL_MS = 1000 * 60 * 60 * 24;

function parsePositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const RAW_DEBUG_TTL_MS = parsePositiveInteger(
  process.env.INGESTION_DEBUG_AZURE_TTL_MS,
  DEFAULT_RAW_DEBUG_TTL_MS,
);

export function shouldRetainRawOutput() {
  return process.env.INGESTION_DEBUG_AZURE === "true";
}
