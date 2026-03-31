import type { VercelRequest, VercelResponse } from "@vercel/node";

import { handleBuilderPlan } from "../shared";

export const runtime = "nodejs";

export default async function handler(req: VercelRequest, res: VercelResponse) {
	return handleBuilderPlan(req, res);
}