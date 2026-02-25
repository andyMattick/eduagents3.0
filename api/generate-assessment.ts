import { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * GENERATE-ASSESSMENT API PROXY (Vercel Serverless Function)
 *
 * Proxies requests to the Supabase Edge Function to avoid CORS issues.
 * The browser calls this same-origin endpoint, and the server forwards
 * the request to Supabase with proper auth headers.
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({
      error: 'Supabase configuration missing. Set SUPABASE_URL and SUPABASE_ANON_KEY.',
    });
  }

  try {
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/generate-assessment`;

    // Forward the authorization header if present, otherwise use anon key
    const authHeader =
      req.headers.authorization || `Bearer ${supabaseAnonKey}`;

    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
        apikey: supabaseAnonKey,
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();

    // Set CORS headers on the response
    Object.entries(CORS_HEADERS).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    return res.status(response.status).json(data);
  } catch (err: any) {
    console.error('[api/generate-assessment] Proxy error:', err);
    return res.status(502).json({
      error: 'Failed to reach Supabase Edge Function',
      message: err.message,
    });
  }
}
