import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import type { Plugin } from 'vite'

/**
 * Local dev middleware — serves /api/llm so `npm run dev` works without
 * Vercel CLI. In production, the real Vercel serverless function takes over.
 *
 * Security note: GEMINI_API_KEY is read by the Vite Node.js process and
 * is NEVER sent to the browser — it stays server-side even locally.
 */
function localLLMProxy(): Plugin {
  return {
    name: 'local-llm-proxy',
    configureServer(server) {
      server.middlewares.use('/api/llm', async (req, res) => {
        if (req.method === 'OPTIONS') {
          res.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          });
          res.end();
          return;
        }

        if (req.method !== 'POST') {
          res.writeHead(405, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
        if (!apiKey) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'GEMINI_API_KEY not set in .env.local' }));
          return;
        }

        try {
          // Read request body
          const chunks: Buffer[] = [];
          await new Promise<void>((resolve, reject) => {
            req.on('data', (chunk: Buffer) => chunks.push(chunk));
            req.on('end', resolve);
            req.on('error', reject);
          });
          const body = JSON.parse(Buffer.concat(chunks).toString());
          const { model, prompt, temperature = 0.2, maxOutputTokens = 4096 } = body;

          if (!model || !prompt) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing required fields: model, prompt' }));
            return;
          }

          // Call Gemini REST API from the Node.js process (key never reaches browser)
          const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: { temperature, maxOutputTokens },
              }),
            }
          );

          if (!geminiRes.ok) {
            const err = await geminiRes.text();
            console.error('[local-llm-proxy] Gemini error:', geminiRes.status, err);
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: `Gemini returned ${geminiRes.status}` }));
            return;
          }

          const data = await geminiRes.json() as any;
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ text }));
        } catch (err: any) {
          console.error('[local-llm-proxy] Error:', err.message);
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'AI generation failed locally.', detail: err.message }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), localLLMProxy()],
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    },
    extensions: ['.tsx', '.ts', '.jsx', '.js']
  }
})
