import { Request, Response } from "express";
import { runIngestionPipeline } from "../runIngestionPipeline";

export async function handleDocumentUpload(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const fileBuffer = req.file.buffer;
    const fileName = req.file.originalname;
    const { canonical, sections } = await runIngestionPipeline(fileBuffer, fileName);

    return res.status(200).json({
      status: "ok",
      fileName,
      canonical,
      sections
    });
  } catch (err) {
    console.error("Upload ingestion error:", err);
    const message = err instanceof Error ? err.message : "Document ingestion failed";
    const statusCode = message.toLowerCase().includes("azure") ? 502 : 500;
    return res.status(statusCode).json({ error: message });
  }
}
