/**
 * /api/jobs/process — Execute a pending job
 *
 * POST { id }
 * Marks the job as "running", executes the appropriate handler,
 * then updates the job to "succeeded" (with output) or "failed" (with error).
 *
 * In the initial version this is called directly by the client after
 * creating a job. Later it can be moved to a background worker, cron
 * trigger, or Supabase Edge Function.
 *
 * Requires Authorization header (Supabase JWT).
 */
import { authenticateUser } from "../../lib/auth";
import { supabaseAdmin } from "../../lib/supabase";

export const runtime = "nodejs";
export const config = { maxDuration: 60 };

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // Auth
    const auth = await authenticateUser(req.headers.authorization);
    if ("error" in auth) {
      return res.status(auth.status).json({ error: auth.error });
    }

    let body = req.body;
    if (typeof body === "string") body = JSON.parse(body);

    const jobId = body?.id;
    if (!jobId) {
      return res.status(400).json({ error: "Missing required field: id" });
    }

    const { url, key } = supabaseAdmin();
    const headers: Record<string, string> = {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    };

    // Fetch the job
    const fetchUrl = new URL(`${url}/rest/v1/jobs`);
    fetchUrl.searchParams.set("id", `eq.${jobId}`);
    fetchUrl.searchParams.set("user_id", `eq.${auth.userId}`);
    fetchUrl.searchParams.set("select", "*");

    const fetchRes = await fetch(fetchUrl.toString(), { headers });
    const jobs = await fetchRes.json();
    const job = Array.isArray(jobs) ? jobs[0] : null;

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    if (job.status !== "pending") {
      return res.status(409).json({ error: `Job is already ${job.status}` });
    }

    // Mark as running
    await patchJob(url, key, jobId, { status: "running", updated_at: new Date().toISOString() });

    try {
      const output = await executeJob(job);
      await patchJob(url, key, jobId, {
        status: "succeeded",
        output,
        updated_at: new Date().toISOString(),
      });
      return res.status(200).json({ status: "succeeded", output });
    } catch (execErr: any) {
      await patchJob(url, key, jobId, {
        status: "failed",
        error: execErr.message,
        updated_at: new Date().toISOString(),
      });
      return res.status(200).json({ status: "failed", error: execErr.message });
    }
  } catch (err: any) {
    console.error("jobs/process error:", err);
    return res.status(500).json({ error: err.message });
  }
}

// ── Job executor ─────────────────────────────────────────────────────────────

async function executeJob(job: { type: string; input: any }): Promise<any> {
  switch (job.type) {
    case "azure-extract":
      return executeAzureExtract(job.input);
    case "llm-generate":
      return executeLlmGenerate(job.input);
    default:
      throw new Error(`Unknown job type: ${job.type}`);
  }
}

async function executeAzureExtract(input: {
  fileBase64: string;
  mimeType: string;
  fileName?: string;
}) {
  const { getAzureConfig, azureAnalyzeUrl, mapAzureResult } = await import("../../lib/azure");
  const { endpoint, key } = getAzureConfig();

  const fileBuffer = Buffer.from(input.fileBase64, "base64");

  const submitRes = await fetch(azureAnalyzeUrl(endpoint), {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": key,
      "Content-Type": input.mimeType || "application/pdf",
    },
    body: fileBuffer,
  });

  if (submitRes.status !== 202) {
    throw new Error(`Azure rejected document (${submitRes.status})`);
  }

  const operationLocation = submitRes.headers.get("operation-location");
  if (!operationLocation) throw new Error("No operation-location from Azure");

  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    const poll = await fetch(operationLocation, {
      headers: { "Ocp-Apim-Subscription-Key": key },
    });
    const data = await poll.json();
    if (data.status === "succeeded") {
      return mapAzureResult(data.analyzeResult, input.fileName || "upload");
    }
    if (data.status === "failed") throw new Error("Azure analysis failed");
  }

  throw new Error("Azure analysis timed out");
}

async function executeLlmGenerate(input: {
  model: string;
  prompt: string;
  temperature?: number;
  maxOutputTokens?: number;
}) {
  const { callGemini } = await import("../../lib/gemini");
  const text = await callGemini(input);
  return { text };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function patchJob(
  supabaseUrl: string,
  apiKey: string,
  jobId: string,
  fields: Record<string, unknown>
) {
  const patchUrl = new URL(`${supabaseUrl}/rest/v1/jobs`);
  patchUrl.searchParams.set("id", `eq.${jobId}`);

  await fetch(patchUrl.toString(), {
    method: "PATCH",
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(fields),
  });
}
