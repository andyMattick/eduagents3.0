import type { VercelRequest, VercelResponse } from "@vercel/node";

import { supabaseRest } from "../../../lib/supabase";

export const runtime = "nodejs";

type ReportBadBody = {
  userId?: string;
  sectionId?: string;
  original?: string;
  rewritten?: string;
  teacherInput?: string;
  expectedOutput?: string;
  whatWasWrong?: string;
  additionalContext?: string;
  reason?: string;
};

function getSingleHeaderValue(header: string | string[] | undefined): string {
  if (Array.isArray(header)) return header[0] ?? "";
  return header ?? "";
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function resolveActor(req: VercelRequest, body: ReportBadBody): { actorKey: string; userId: string | null } {
  const forwarded = getSingleHeaderValue(req.headers["x-forwarded-for"]);
  const ip = forwarded.split(",")[0]?.trim() || "unknown";
  const claimedFromHeader = getSingleHeaderValue(req.headers["x-user-id"]) || getSingleHeaderValue(req.headers["x-teacher-id"]);
  const claimedFromBody = typeof body.userId === "string" ? body.userId : "";
  const candidate = claimedFromHeader || claimedFromBody;
  const userId = isUuid(candidate) ? candidate : null;
  return {
    actorKey: userId ?? `ip:${ip}`,
    userId,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-user-id, x-teacher-id");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: "Invalid JSON body" });
    }
  }

  const payload = (body ?? {}) as ReportBadBody;
  if (!payload.rewritten) {
    return res.status(400).json({ error: "rewritten is required" });
  }

  const teacherInput = payload.teacherInput?.trim() ?? "";
  const expectedOutput = payload.expectedOutput?.trim() ?? "";
  const whatWasWrong = payload.whatWasWrong?.trim() ?? "";
  if (!teacherInput || !expectedOutput || !whatWasWrong) {
    return res.status(400).json({ error: "teacherInput, expectedOutput, and whatWasWrong are required" });
  }

  const normalizedReason = payload.reason?.trim() || [
    `Teacher Input: ${teacherInput}`,
    `Expected Output: ${expectedOutput}`,
    `What Was Wrong: ${whatWasWrong}`,
    payload.additionalContext?.trim() ? `Additional Context: ${payload.additionalContext.trim()}` : "",
  ].filter(Boolean).join("\n\n");

  const actor = resolveActor(req, payload);

  try {
    await supabaseRest("bad_rewrite_reports", {
      method: "POST",
      body: {
        actor_key: actor.actorKey,
        user_id: actor.userId,
        section_id: payload.sectionId ?? null,
        original: payload.original ?? null,
        rewritten: payload.rewritten,
        reason: normalizedReason,
        teacher_input: teacherInput,
        expected_output: expectedOutput,
        what_was_wrong: whatWasWrong,
        additional_context: payload.additionalContext?.trim() || null,
      },
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Failed to save report" });
  }
}
