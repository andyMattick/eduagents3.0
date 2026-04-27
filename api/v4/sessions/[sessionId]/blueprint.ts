import type { VercelRequest, VercelResponse } from "@vercel/node";

import { handleBlueprint } from "../shared";

export const runtime = "nodejs";

export default async function handler(req: VercelRequest, res: VercelResponse) {
	return handleBlueprint(req, res);
}