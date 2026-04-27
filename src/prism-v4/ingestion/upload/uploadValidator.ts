import path from "path";
import type { Request, Response, NextFunction } from "express";

const DEFAULT_MAX_UPLOAD_SIZE_BYTES = 20 * 1024 * 1024;

const ALLOWED_EXTENSIONS = new Set([".pdf", ".doc", ".docx"]);
const ALLOWED_MIME_TYPES = new Set([
	"application/pdf",
	"application/msword",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	"application/octet-stream",
]);

export const MAX_UPLOAD_SIZE_BYTES = Number.parseInt(
	process.env.INGESTION_MAX_UPLOAD_BYTES ?? `${DEFAULT_MAX_UPLOAD_SIZE_BYTES}`,
	10,
);

function hasAllowedFileType(file: Express.Multer.File) {
	const extension = path.extname(file.originalname).toLowerCase();
	return ALLOWED_EXTENSIONS.has(extension) && ALLOWED_MIME_TYPES.has(file.mimetype || "application/octet-stream");
}

export function validateUpload(req: Request, res: Response, next: NextFunction) {
	const file = req.file;

	if (!file) {
		res.status(400).json({ error: "A single PDF, DOC, or DOCX file is required." });
		return;
	}

	if (!hasAllowedFileType(file)) {
		res.status(400).json({ error: "Unsupported file type. Allowed types: PDF, DOC, DOCX." });
		return;
	}

	if (!Number.isFinite(MAX_UPLOAD_SIZE_BYTES) || MAX_UPLOAD_SIZE_BYTES <= 0) {
		res.status(500).json({ error: "Upload size configuration is invalid." });
		return;
	}

	if (file.size > MAX_UPLOAD_SIZE_BYTES) {
		res.status(400).json({ error: `File exceeds the ${MAX_UPLOAD_SIZE_BYTES} byte upload limit.` });
		return;
	}

	next();
}
