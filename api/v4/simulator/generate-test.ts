import { randomUUID } from "crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { callLLM } from "../../../lib/llm";
import type { GeneratedTestData, SimulatorTestPreferences } from "../../../src/types/simulator";
import { fetchSessionText, parseSimulatorResponse, saveItems, type V4Item } from "./shared";
import { ingestDocument } from "../../../src/prism-v4/ingestion/ingestDocument";
import { registerDocumentsStore } from "../../../src/prism-v4/documents/registryStore";

export const runtime = "nodejs";
export const maxDuration = 60;

const DATA_SCHEMA = `
Return your answer in two parts:

1. NARRATIVE (brief explanation of design choices)

2. DATA (JSON ONLY, no commentary)
{
  "test": [
    {
      "type": "MC" | "SA" | "FRQ",
      "stem": string,
      "options": [string] | null,
      "answer": string | null
    }
  ]
}`;

const SYSTEM_PROMPT = `You generate a clean, teacher-ready assessment using the combined content of one or two documents.

Requirements:
- Use clear, simple, teacher-friendly language.
- Ensure alignment with the concepts emphasized in both documents.
- Avoid overly complex stems or unnecessary wording.
- Produce a balanced assessment.
- Match the requested structure (MC, SA, FRQ).
${DATA_SCHEMA}`;

function buildTestPreferenceLine(prefs?: SimulatorTestPreferences): string {
  if (!prefs) return "10 multiple choice, 3 short answer, and 1 free response question.";
  const parts: string[] = [];
  if ((prefs.mcCount ?? 0) > 0) parts.push(`${prefs.mcCount} multiple choice`);
  if ((prefs.saCount ?? 0) > 0) parts.push(`${prefs.saCount} short answer`);
  if ((prefs.frqCount ?? 0) > 0) parts.push(`${prefs.frqCount} free response`);
  return parts.length > 0
    ? parts.join(", ") + "."
    : "10 multiple choice, 3 short answer, and 1 free response question.";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") {
    return res
      .status(200)
      .setHeader("Access-Control-Allow-Origin", "*")
      .setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
      .setHeader("Access-Control-Allow-Headers", "Content-Type")
      .end();
  }
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      /* keep as-is */
    }
  }

  const { sessionId, supplementText, testPreferences } = (body ?? {}) as {
    sessionId?: string;
    supplementText?: string;
    testPreferences?: SimulatorTestPreferences;
  };

  if (!sessionId) return res.status(400).json({ error: "sessionId is required" });

  try {
    const { text, docCount } = await fetchSessionText(sessionId);
    if (!text || docCount === 0) return res.status(404).json({ error: "No document text found." });

    const prefLine = buildTestPreferenceLine(testPreferences);
    const userMsg = `Generate ${prefLine}\n\nDocument A:\n${text}${
      supplementText ? `\n\nDocument B:\n${supplementText}` : ""
    }`;
    const raw = await callLLM({ prompt: `${SYSTEM_PROMPT}\n\nUSER:\n${userMsg}`, metadata: { runType: "generate-test", sessionId }, options: { temperature: 0.4, maxOutputTokens: 4096 } });
    const parsed = parseSimulatorResponse(raw);
    const data: GeneratedTestData | null =
      parsed.data && typeof parsed.data === "object" && "test" in (parsed.data as object)
        ? (parsed.data as GeneratedTestData)
        : null;

    // STEP 7: Register generated document and run ingestion pipeline
    // This ensures created documents get items, sections, analysis, and docType classification
    const generatedDocumentId = randomUUID();
    
    if (data && data.test.length > 0) {
      // Reconstruct generated test as plain text for ingestion
      const generatedTestText = data.test
        .map((item, idx) => {
          const itemText = `${idx + 1}. ${item.stem}`;
          if (item.options && item.options.length > 0) {
            const optionsText = item.options
              .map((opt, optIdx) => `   ${String.fromCharCode(65 + optIdx)}) ${opt}`)
              .join("\n");
            return `${itemText}\n${optionsText}`;
          }
          return itemText;
        })
        .join("\n\n");

      // Register document to prism_v4_documents
      try {
        await registerDocumentsStore([
          {
            sourceFileName: "generated-test.txt",
            sourceMimeType: "text/plain",
          },
        ]);
      } catch (err) {
        // Non-fatal — document might already be registered
      }

      // Run unified ingestion pipeline: classifies doc type, extracts items/sections, saves analysis
      // This replaces the old fire-and-forget saveItems call
      ingestDocument({
        source: "created",
        documentId: generatedDocumentId,
        rawText: generatedTestText,
      }).catch((err) =>
        console.warn("[generate-test] ingestDocument failed (non-fatal):", err instanceof Error ? err.message : err),
      );
    }

    return res.status(200).json({ narrative: parsed.narrative, data, documentId: generatedDocumentId, meta: { docCount } });
  } catch (err) {
    console.error("[simulator/generate-test]", err);
    return res
      .status(500)
      .json({ error: err instanceof Error ? err.message : "Generation failed." });
  }
}
