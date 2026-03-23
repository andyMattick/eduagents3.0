import { VercelRequest, VercelResponse } from "@vercel/node";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export default function handler(req: VercelRequest, res: VercelResponse) {
  Object.entries(CORS_HEADERS).forEach(([key, value]) => res.setHeader(key, value));

  if (req.method === "OPTIONS") {
    return res.status(200).json({});
  }

  return res.status(503).json({
    disabled: true,
    error: "save-template temporarily disabled during API boundary isolation",
  });
}
