import type { VercelRequest, VercelResponse } from "@vercel/node";

import { handleAssessmentPreview } from "../shared";

export const runtime = "nodejs";

export default async function handler(req: VercelRequest, res: VercelResponse) {
	return handleAssessmentPreview(req, res);
}