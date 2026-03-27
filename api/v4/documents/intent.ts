import type { VercelRequest, VercelResponse } from "@vercel/node";

import { buildIntentPayload, getIntentBuildErrorStatus, isBuiltIntentType } from "../../../src/prism-v4/documents/intents/buildIntentProduct";
import {
	getDocumentSessionStore,
	getIntentProductStore,
	listIntentProductsForSessionStore,
	loadPrismSessionContextCached,
	saveIntentProductStore,
} from "../../../src/prism-v4/documents/registryStore";
import type { IntentRequest } from "../../../src/prism-v4/schema/integration";

export const runtime = "nodejs";

function parseBody(body: unknown) {
	if (typeof body !== "string") {
		return body as IntentRequest;
	}

	return JSON.parse(body) as IntentRequest;
}

function schemaVersionForIntent(intentType: IntentRequest["intentType"]) {
	if (["build-lesson", "build-unit", "build-instructional-map", "curriculum-alignment"].includes(intentType)) {
		return "wave5-v1";
	}

	return ["compare-documents", "merge-documents", "build-sequence"].includes(intentType) ? "wave4-v1" : "wave3-v1";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
	if (req.method === "GET") {
		const productId = Array.isArray(req.query.productId) ? req.query.productId[0] : req.query.productId;
		const sessionId = Array.isArray(req.query.sessionId) ? req.query.sessionId[0] : req.query.sessionId;

		if (productId) {
			const product = await getIntentProductStore(productId);
			if (!product) {
				return res.status(404).json({ error: "Product not found" });
			}
			return res.status(200).json(product);
		}

		if (sessionId) {
			const session = await getDocumentSessionStore(sessionId);
			if (!session) {
				return res.status(404).json({ error: "Session not found" });
			}

			return res.status(200).json({
				sessionId,
				products: await listIntentProductsForSessionStore(sessionId),
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

		const session = await getDocumentSessionStore(payload.sessionId);
		if (!session) {
			return res.status(404).json({ error: "Session not found" });
		}

		if (!isBuiltIntentType(payload.intentType)) {
			return res.status(400).json({ error: `Unsupported built intent: ${payload.intentType}` });
		}

		const intentRequest = payload as IntentRequest & { intentType: typeof payload.intentType };
		const context = await loadPrismSessionContextCached(intentRequest.sessionId);
		if (!context) {
			return res.status(404).json({ error: "Session not found" });
		}
		const builtPayload = await buildIntentPayload(intentRequest, context);
		const product = await saveIntentProductStore(intentRequest, builtPayload, schemaVersionForIntent(intentRequest.intentType));

		return res.status(200).json(product);
	} catch (error) {
		return res.status(getIntentBuildErrorStatus(error)).json({ error: error instanceof Error ? error.message : "Intent route failed" });
	}
}
