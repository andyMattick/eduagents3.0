import { getAzureConfig } from "../lib/azure";

export const runtime = "nodejs";

/**
 * /api/azure-token — Returns Azure Document Intelligence credentials
 *
 * ⚠️  DEV-ONLY: Exposes the API key directly. In production, replace with
 *     a SAS token or signed-request proxy so the raw key never reaches
 *     the browser.
 */
export default function handler(req: any, res: any) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { endpoint, key } = getAzureConfig();
    res.status(200).json({ endpoint, key });
  } catch {
    return res.status(500).json({ error: "Azure not configured" });
  }
}
