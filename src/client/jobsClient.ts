/**
 * src/client/jobsClient.ts — Client-side job system helper
 *
 * Usage:
 *   const result = await submitAndWaitForJob("azure-extract", { fileBase64, mimeType });
 *   // result is the job output (e.g., AzureExtractResult)
 */
import { supabase } from "@/supabase/client";

async function getAuthHeader(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw new Error("Not authenticated");
  return `Bearer ${token}`;
}

export async function createJob(type: string, input: unknown): Promise<string> {
  const authorization = await getAuthHeader();

  const res = await fetch("/api/jobs/create", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: authorization },
    body: JSON.stringify({ type, input }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error ?? `Failed to create job (${res.status})`);
  }

  const { jobId } = await res.json();
  return jobId;
}

export interface JobResult<T = unknown> {
  id: string;
  status: "pending" | "running" | "succeeded" | "failed";
  output?: T;
  error?: string;
}

export async function getJobStatus<T = unknown>(jobId: string): Promise<JobResult<T>> {
  const authorization = await getAuthHeader();

  const res = await fetch(`/api/jobs/status?id=${encodeURIComponent(jobId)}`, {
    headers: { Authorization: authorization },
  });

  if (!res.ok) {
    throw new Error(`Failed to check job status (${res.status})`);
  }

  return res.json();
}

export async function processJob(jobId: string): Promise<void> {
  const authorization = await getAuthHeader();

  const res = await fetch("/api/jobs/process", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: authorization },
    body: JSON.stringify({ id: jobId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error ?? `Failed to process job (${res.status})`);
  }
}

/**
 * Convenience: create job → trigger processing → poll until complete.
 *
 * @param type    Job type (e.g., "azure-extract", "llm-generate")
 * @param input   Job input payload
 * @param opts    Polling options
 * @returns       The job output on success
 */
export async function submitAndWaitForJob<T = unknown>(
  type: string,
  input: unknown,
  opts: { pollIntervalMs?: number; maxPolls?: number; onStatus?: (status: string) => void } = {}
): Promise<T> {
  const { pollIntervalMs = 2000, maxPolls = 60, onStatus } = opts;

  // 1. Create
  const jobId = await createJob(type, input);
  onStatus?.("pending");

  // 2. Trigger processing (fire-and-forget — response comes via polling)
  processJob(jobId).catch(() => {
    // Processing errors are captured in the job record
  });

  // 3. Poll
  for (let i = 0; i < maxPolls; i++) {
    await new Promise((r) => setTimeout(r, pollIntervalMs));

    const result = await getJobStatus<T>(jobId);
    onStatus?.(result.status);

    if (result.status === "succeeded") {
      return result.output as T;
    }

    if (result.status === "failed") {
      throw new Error(result.error ?? "Job failed");
    }
  }

  throw new Error("Job timed out while waiting for completion");
}
