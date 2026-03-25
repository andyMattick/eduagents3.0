import type { VercelRequest, VercelResponse } from "@vercel/node";

import { buildIntentPayload, getIntentBuildErrorStatus, isBuiltIntentType } from "../../../src/prism-v4/documents/intents/buildIntentProduct";
import { getDocumentSession, getIntentProduct, listIntentProductsForSession, saveIntentProduct } from "../../../src/prism-v4/documents/registry";
import type { IntentRequest } from "../../../src/prism-v4/schema/integration";

export const runtime = "nodejs";

function parseBody(body: unknown) {
	if (typeof body !== "string") {
		return body as IntentRequest;
	}

	return JSON.parse(body) as IntentRequest;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
	if (req.method === "GET") {
		const productId = Array.isArray(req.query.productId) ? req.query.productId[0] : req.query.productId;
		const sessionId = Array.isArray(req.query.sessionId) ? req.query.sessionId[0] : req.query.sessionId;

		if (productId) {
			const product = getIntentProduct(productId);
			if (!product) {
				return res.status(404).json({ error: "Product not found" });
			}
			return res.status(200).json(product);
		}

		if (sessionId) {
			const session = getDocumentSession(sessionId);
			if (!session) {
				return res.status(404).json({ error: "Session not found" });
			}

			return res.status(200).json({
				sessionId,
				products: listIntentProductsForSession(sessionId),
			});
		}

		return res.status(400).json({ error: "productId or sessionId is required" });
	}

	if (req.method !== "POST") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	try {
		const payload = parseBody(req.body ?? {});
		if (!payload.sessionId || !payload.documentIds || payload.documentIds.length === 0 || !payload.intentType) {
			return res.status(400).json({ error: "sessionId, documentIds, and intentType are required" });
		}

		const session = getDocumentSession(payload.sessionId);
		if (!session) {
			return res.status(404).json({ error: "Session not found" });
		}

		if (!isBuiltIntentType(payload.intentType)) {
			return res.status(400).json({ error: `Unsupported Wave 3 intent: ${payload.intentType}` });
		}

		const intentRequest = payload as IntentRequest & { intentType: typeof payload.intentType };
		const builtPayload = await buildIntentPayload(intentRequest);
		const product = saveIntentProduct(intentRequest, builtPayload);

		return res.status(200).json(product);
	} catch (error) {
		return res.status(getIntentBuildErrorStatus(error)).json({ error: error instanceof Error ? error.message : "Intent route failed" });
	}
}
