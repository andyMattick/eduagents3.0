import { defineConfig, loadEnv } from 'vite'
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
function localLLMProxy(geminiApiKey: string): Plugin {
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

        if (!geminiApiKey) {
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
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
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

/**
 * Local dev middleware for template endpoints so /api/* routes return JSON
 * while running `npm run dev` (without Vercel runtime).
 */
function localTemplateProxy(): Plugin {
  return {
    name: 'local-template-proxy',
    configureServer(server) {
      server.middlewares.use('/api/templates', async (req, res) => {
        if (req.method === 'OPTIONS') {
          res.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          });
          res.end();
          return;
        }

        if (req.method !== 'GET') {
          res.writeHead(405, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        try {
          const url = new URL(req.url ?? '', 'http://localhost');
          const teacherId = (url.searchParams.get('teacherId') ?? '').trim();

          if (!teacherId) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'teacherId is required' }));
            return;
          }

          const mod = await server.ssrLoadModule('/src/pipeline/schema/templates/problemTypes/index.ts');
          const merged = await mod.getAllProblemTypesForTeacher(teacherId);
          const system = Object.values(merged.system ?? {}).map((entry: any) => ({
            id: entry.id,
            label: entry.label,
            itemType: entry.itemType,
            defaultIntent: entry.defaultIntent,
            defaultDifficulty: entry.defaultDifficulty,
            configurableFields: entry.configurableFields ?? {},
          }));

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ system, teacher: merged.teacher ?? [] }));
        } catch (err: any) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err?.message ?? 'Failed to load templates' }));
        }
      });

      server.middlewares.use('/api/derive-template', async (req, res) => {
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

        try {
          const chunks: Buffer[] = [];
          await new Promise<void>((resolve, reject) => {
            req.on('data', (chunk: Buffer) => chunks.push(chunk));
            req.on('end', resolve);
            req.on('error', reject);
          });

          const body = JSON.parse(Buffer.concat(chunks).toString() || '{}');
          const mod = await server.ssrLoadModule('/src/pipeline/agents/templateDeriver/derive.ts');
          const result = await mod.deriveTemplate(body);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        } catch (err: any) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err?.message ?? 'deriveTemplate failed' }));
        }
      });

      server.middlewares.use('/api/save-template', async (req, res) => {
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

        try {
          const chunks: Buffer[] = [];
          await new Promise<void>((resolve, reject) => {
            req.on('data', (chunk: Buffer) => chunks.push(chunk));
            req.on('end', resolve);
            req.on('error', reject);
          });

          const body = JSON.parse(Buffer.concat(chunks).toString() || '{}');
          const teacherId = body?.teacherId;
          const template = body?.template;

          if (!teacherId || !template) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'teacherId and template are required' }));
            return;
          }

          const mod = await server.ssrLoadModule('/src/pipeline/persistence/saveTemplate.ts');
          await mod.saveTemplate(teacherId, template);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true }));
        } catch (err: any) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err?.message ?? 'saveTemplate failed' }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // loadEnv reads .env, .env.local, .env.[mode], .env.[mode].local
  // The third arg '' means load ALL vars (not just VITE_ prefixed ones)
  const env = loadEnv(mode, process.cwd(), '');
  const geminiApiKey = env.GEMINI_API_KEY || env.GOOGLE_API_KEY || '';

  return {
  plugins: [react(), localLLMProxy(geminiApiKey), localTemplateProxy()],
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      external: ['server', 'api']
    }
  },
  optimizeDeps: {
    exclude: ['server', 'api']
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    },
    extensions: ['.tsx', '.ts', '.jsx', '.js']
  }
  };
});
