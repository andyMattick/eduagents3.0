/**
 * src/lib/api/jsonResponse.ts
 *
 * Shared helpers that guarantee simulation API responses are always
 * application/json and carry a standardized error envelope.
 *
 * Error envelope shape:
 *   { error: { code: string; message: string; details?: unknown } }
 *
 * Stable codes:
 *   invalid_request  — bad input, malformed body (400)
 *   unauthenticated  — missing auth (401)
 *   forbidden        — caller lacks permission (403)
 *   not_found        — resource absent (404)
 *   conflict         — state conflict (409)
 *   internal_error   — unhandled server failure (500)
 *   upstream_parse_error — LLM / upstream payload could not be decoded (502)
 */

export type ApiErrorCode =
  | "invalid_request"
  | "unauthenticated"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "internal_error"
  | "upstream_parse_error";

export interface ApiErrorEnvelope {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: unknown;
  };
}

/** Build a standardized error payload (does not touch the response object). */
export function makeApiError(
  code: ApiErrorCode,
  message: string,
  details?: unknown,
): ApiErrorEnvelope {
  return { error: { code, message, ...(details !== undefined ? { details } : {}) } };
}

/**
 * Return a Vercel/Express-style JSON error response.
 * Always sets Content-Type: application/json; charset=utf-8.
 */
export function sendApiError(
  res: { status: (s: number) => { json: (body: unknown) => unknown }; setHeader: (name: string, value: string) => void },
  code: ApiErrorCode,
  message: string,
  httpStatus = 400,
  details?: unknown,
) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  return res.status(httpStatus).json(makeApiError(code, message, details));
}

/** Parse a request body string/object safely. Returns null on parse failure. */
export function safeParseBody(raw: unknown): Record<string, unknown> | null {
  if (raw === null || raw === undefined) return {};
  if (typeof raw === "object" && !Array.isArray(raw)) return raw as Record<string, unknown>;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      return null;
    } catch {
      return null;
    }
  }
  return null;
}

/** Validate that a string looks like a UUID. */
export function isValidUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}
